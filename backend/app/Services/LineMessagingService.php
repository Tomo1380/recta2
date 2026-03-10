<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class LineMessagingService
{
    private string $accessToken;
    private string $channelSecret;
    private string $baseUrl = 'https://api.line.me/v2/bot';

    public function __construct()
    {
        $this->accessToken = config('services.line_messaging.access_token');
        $this->channelSecret = config('services.line_messaging.channel_secret');
    }

    /**
     * Send a push message to a specific user.
     */
    public function pushMessage(string $lineUserId, array $messages): array
    {
        $response = Http::withHeaders([
            'Authorization' => "Bearer {$this->accessToken}",
            'Content-Type' => 'application/json',
        ])->post("{$this->baseUrl}/message/push", [
            'to' => $lineUserId,
            'messages' => $messages,
        ]);

        if ($response->failed()) {
            Log::error('LINE push message failed', [
                'status' => $response->status(),
                'body' => $response->json(),
                'line_user_id' => $lineUserId,
            ]);
        }

        return [
            'success' => $response->successful(),
            'status' => $response->status(),
            'body' => $response->json(),
        ];
    }

    /**
     * Reply to a message using a reply token.
     */
    public function replyMessage(string $replyToken, array $messages): array
    {
        $response = Http::withHeaders([
            'Authorization' => "Bearer {$this->accessToken}",
            'Content-Type' => 'application/json',
        ])->post("{$this->baseUrl}/message/reply", [
            'replyToken' => $replyToken,
            'messages' => $messages,
        ]);

        if ($response->failed()) {
            Log::error('LINE reply message failed', [
                'status' => $response->status(),
                'body' => $response->json(),
            ]);
        }

        return [
            'success' => $response->successful(),
            'status' => $response->status(),
            'body' => $response->json(),
        ];
    }

    /**
     * Broadcast a message to all friends.
     */
    public function broadcastMessage(array $messages): array
    {
        $response = Http::withHeaders([
            'Authorization' => "Bearer {$this->accessToken}",
            'Content-Type' => 'application/json',
        ])->post("{$this->baseUrl}/message/broadcast", [
            'messages' => $messages,
        ]);

        if ($response->failed()) {
            Log::error('LINE broadcast message failed', [
                'status' => $response->status(),
                'body' => $response->json(),
            ]);
        }

        return [
            'success' => $response->successful(),
            'status' => $response->status(),
            'body' => $response->json(),
        ];
    }

    /**
     * Verify webhook signature using HMAC-SHA256.
     */
    public function verifySignature(string $body, string $signature): bool
    {
        $hash = base64_encode(
            hash_hmac('sha256', $body, $this->channelSecret, true)
        );

        return hash_equals($hash, $signature);
    }
}
