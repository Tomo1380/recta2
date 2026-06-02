<?php

namespace App\Http\Controllers;

use App\Http\Requests\LineAuthCallbackRequest;
use App\Models\AiChatLog;
use App\Models\User;
use App\Services\LineLoginService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class LineAuthController extends Controller
{
    /** OAuth state を載せる HttpOnly cookie 名。 */
    private const STATE_COOKIE = 'line_oauth_state';

    public function __construct(
        private LineLoginService $lineLoginService,
    ) {}

    /**
     * LINE OAuth認証URLにリダイレクト
     */
    public function redirect(Request $request)
    {
        $state = Str::random(40);

        // Optional: caller can pass ?return_to=/some/path so we land them
        // back where they were after the OAuth round-trip. Restricted to
        // same-origin paths to prevent open-redirect abuse.
        $returnTo = $request->query('return_to');
        if (is_string($returnTo) && str_starts_with($returnTo, '/') && ! str_starts_with($returnTo, '//')) {
            Cache::put("line_oauth_return_to:{$state}", $returnTo, 300);
        }

        $url = $this->lineLoginService->getAuthorizationUrl($state);

        // state はブラウザに紐づけて CSRF を防ぐ。以前は IP をキーにした Cache に
        // 入れていたが、共有 NAT / CGNAT 配下で取り違え・上書きによるログイン失敗や
        // login CSRF の余地があった。HttpOnly + SameSite=Lax cookie に載せ、callback
        // で query の state と hash_equals 比較する (Lax なので LINE からの top-level
        // GET リダイレクトでも cookie は送られる)。
        $cookie = cookie(
            self::STATE_COOKIE,
            $state,
            5,            // minutes
            '/',
            null,
            app()->environment('production'), // secure
            true,         // httpOnly
            false,
            'lax'
        );

        return redirect($url)->withCookie($cookie);
    }

    /**
     * LINEコールバック処理
     */
    public function callback(LineAuthCallbackRequest $request)
    {
        $request->validated();

        $ip = $request->ip();
        $cookieState = $request->cookie(self::STATE_COOKIE);

        if (! is_string($cookieState) || $cookieState === '' || ! hash_equals($cookieState, (string) $request->state)) {
            Log::warning('LINE OAuth state mismatch', [
                'ip' => $ip,
                'has_cookie' => is_string($cookieState) && $cookieState !== '',
            ]);

            return redirect(config('app.url') . '/auth/callback?error=invalid_state')
                ->withCookie(Cookie::forget(self::STATE_COOKIE));
        }

        try {
            // トークン交換
            $tokens = $this->lineLoginService->exchangeCodeForTokens($request->code);

            // プロフィール取得
            $profile = $this->lineLoginService->getProfile($tokens['access_token']);

            // ユーザー作成/更新
            $user = User::updateOrCreate(
                ['line_user_id' => $profile['userId']],
                [
                    'line_display_name' => $profile['displayName'],
                    'line_picture_url' => $profile['pictureUrl'] ?? null,
                    'line_access_token' => $tokens['access_token'],
                    'line_refresh_token' => $tokens['refresh_token'] ?? null,
                    'line_token_expires_at' => now()->addSeconds($tokens['expires_in'] ?? 2592000),
                    'last_login_at' => now(),
                ]
            );

            // ログイン直前に同一IPで行われた未紐づけAIチャット履歴をこのユーザーに
            // 紐づける。共有IP(CGNAT/公衆Wi-Fi)では他人の履歴を取り込む恐れがあるため、
            // 窓を直近30分に絞り、ログイン前の自分のセッション分のみを対象にする。
            // (恒久対策としてクライアント側匿名IDでの紐づけが望ましい — 別途検討)
            AiChatLog::whereNull('user_id')
                ->where('ip_address', $ip)
                ->where('created_at', '>=', now()->subMinutes(30))
                ->update(['user_id' => $user->id]);

            // Sanctumトークン発行 (user 能力スコープ付き。admin 境界は user.type middleware で担保)
            $token = $user->createToken('line-auth', ['user'])->plainTextToken;

            $returnTo = Cache::pull("line_oauth_return_to:{$request->state}");
            $returnQuery = (is_string($returnTo) && str_starts_with($returnTo, '/') && ! str_starts_with($returnTo, '//'))
                ? '&return_to=' . rawurlencode($returnTo)
                : '';

            // トークンを URL クエリに直接載せるとブラウザ履歴・Referer・アクセスログに
            // 残り漏洩しうる。代わりに単回使用・60秒有効の交換コードを発行し、フロントは
            // /api/auth/line/exchange で実トークンを受け取る。
            $exchangeCode = Str::random(64);
            Cache::put("line_oauth_exchange:{$exchangeCode}", $token, 60);

            return redirect(config('app.url') . "/auth/callback?code={$exchangeCode}{$returnQuery}")
                ->withCookie(Cookie::forget(self::STATE_COOKIE));
        } catch (\Exception $e) {
            Log::error('LINE OAuth callback failed', [
                'error' => $e->getMessage(),
                'ip' => $ip,
            ]);

            return redirect(config('app.url') . '/auth/callback?error=auth_failed')
                ->withCookie(Cookie::forget(self::STATE_COOKIE));
        }
    }

    /**
     * 交換コードを実トークンに引き換える (単回使用)。
     */
    public function exchange(Request $request): JsonResponse
    {
        $code = $request->input('code');

        if (! is_string($code) || $code === '') {
            return response()->json(['message' => 'コードが指定されていません。'], 422);
        }

        $token = Cache::pull("line_oauth_exchange:{$code}");

        if (! is_string($token) || $token === '') {
            return response()->json(['message' => 'コードが無効または期限切れです。'], 422);
        }

        return response()->json(['token' => $token]);
    }
}
