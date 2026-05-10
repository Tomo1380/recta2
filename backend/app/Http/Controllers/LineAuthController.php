<?php

namespace App\Http\Controllers;

use App\Models\AiChatLog;
use App\Models\User;
use App\Services\LineLoginService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class LineAuthController extends Controller
{
    public function __construct(
        private LineLoginService $lineLoginService,
    ) {}

    /**
     * LINE OAuth認証URLにリダイレクト
     */
    public function redirect(Request $request)
    {
        $state = Str::random(40);
        $ip = $request->ip();

        // Optional: caller can pass ?return_to=/some/path so we land them
        // back where they were after the OAuth round-trip. Restricted to
        // same-origin paths to prevent open-redirect abuse.
        $returnTo = $request->query('return_to');
        if (is_string($returnTo) && str_starts_with($returnTo, '/') && ! str_starts_with($returnTo, '//')) {
            Cache::put("line_oauth_return_to:{$state}", $returnTo, 300);
        }

        Cache::put("line_oauth_state:{$ip}", $state, 300);

        $url = $this->lineLoginService->getAuthorizationUrl($state);

        return redirect($url);
    }

    /**
     * LINEコールバック処理
     */
    public function callback(Request $request)
    {
        $request->validate([
            'code' => 'required|string',
            'state' => 'required|string',
        ]);

        $ip = $request->ip();
        $cachedState = Cache::pull("line_oauth_state:{$ip}");

        if (!$cachedState || $cachedState !== $request->state) {
            Log::warning('LINE OAuth state mismatch', [
                'ip' => $ip,
                'expected' => $cachedState,
                'received' => $request->state,
            ]);

            return redirect(config('app.url') . '/auth/callback?error=invalid_state');
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

            // 同一IPの未紐づけAIチャット履歴をこのユーザーに紐づけ（直近24時間分）
            AiChatLog::whereNull('user_id')
                ->where('ip_address', $ip)
                ->where('created_at', '>=', now()->subDay())
                ->update(['user_id' => $user->id]);

            // Sanctumトークン発行
            $token = $user->createToken('line-auth')->plainTextToken;

            $returnTo = Cache::pull("line_oauth_return_to:{$cachedState}");
            $returnQuery = (is_string($returnTo) && str_starts_with($returnTo, '/') && ! str_starts_with($returnTo, '//'))
                ? '&return_to=' . rawurlencode($returnTo)
                : '';

            return redirect(config('app.url') . "/auth/callback?token={$token}{$returnQuery}");
        } catch (\Exception $e) {
            Log::error('LINE OAuth callback failed', [
                'error' => $e->getMessage(),
                'ip' => $ip,
            ]);

            return redirect(config('app.url') . '/auth/callback?error=auth_failed');
        }
    }
}
