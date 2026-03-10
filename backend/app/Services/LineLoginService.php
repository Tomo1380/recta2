<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class LineLoginService
{
    private string $channelId;
    private string $channelSecret;
    private string $callbackUrl;

    public function __construct()
    {
        $this->channelId = config('services.line_login.channel_id');
        $this->channelSecret = config('services.line_login.channel_secret');
        $this->callbackUrl = config('services.line_login.callback_url');
    }

    /**
     * LINE OAuth認証URLを生成
     */
    public function getAuthorizationUrl(string $state): string
    {
        $params = http_build_query([
            'response_type' => 'code',
            'client_id' => $this->channelId,
            'redirect_uri' => $this->callbackUrl,
            'state' => $state,
            'scope' => 'profile openid',
        ]);

        return "https://access.line.me/oauth2/v2.1/authorize?{$params}";
    }

    /**
     * 認証コードをアクセストークンに交換
     */
    public function exchangeCodeForTokens(string $code): array
    {
        $response = Http::asForm()->post('https://api.line.me/oauth2/v2.1/token', [
            'grant_type' => 'authorization_code',
            'code' => $code,
            'redirect_uri' => $this->callbackUrl,
            'client_id' => $this->channelId,
            'client_secret' => $this->channelSecret,
        ]);

        if ($response->failed()) {
            Log::error('LINE token exchange failed', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            throw new RuntimeException('LINEトークン交換に失敗しました');
        }

        return $response->json();
    }

    /**
     * LINEプロフィールを取得
     */
    public function getProfile(string $accessToken): array
    {
        $response = Http::withToken($accessToken)
            ->get('https://api.line.me/v2/profile');

        if ($response->failed()) {
            Log::error('LINE profile fetch failed', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            throw new RuntimeException('LINEプロフィール取得に失敗しました');
        }

        return $response->json();
    }
}
