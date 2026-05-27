<?php

namespace App\Services\AiChat;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Gemini API への HTTP 呼び出しを集約する薄いクライアント。
 *
 * Phase 2-1b で AiChatController::callGeminiWithRetry を切り出し。
 * API キー / モデル名は config から都度取得する (mock やテスト時に
 * config() override で差し替えやすい)。
 */
class GeminiClient
{
    /**
     * Gemini API を 1 回呼び、503 (High Demand) 時のみ 2 秒後に 1 回 retry。
     *
     * @param  array<string, mixed>  $payload
     *
     * @throws \Exception API 呼び出しに失敗した場合
     */
    public function generate(string $apiKey, array $payload): Response
    {
        $model = config('services.gemini.model');
        $endpoint = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}";

        $response = Http::timeout(30)->post($endpoint, $payload);

        if ($response->status() === 503) {
            Log::warning('Gemini API 503, retrying in 2s...');
            usleep(2_000_000);
            $response = Http::timeout(30)->post($endpoint, $payload);
        }

        if (!$response->successful()) {
            Log::error('Gemini API error', [
                'status' => $response->status(),
                'body' => substr($response->body(), 0, 1000),
            ]);
            throw new \Exception('Gemini API error: ' . $response->status());
        }

        return $response;
    }
}
