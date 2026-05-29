<?php

namespace Tests\Feature;

use App\Models\AiChatLimit;
use App\Models\AiChatLog;
use App\Models\AiChatSetting;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Phase 0 snapshot: AiChatController の chat / chatStream / config の
 * 振る舞いを固定する。Phase 2 で Service 層に分割した後も
 * 同じ shape と分岐が保たれることを保証する。
 *
 * 戦略:
 *   - Gemini API は Http::fake() で完全モック
 *   - chat の response shape (message, stores, follow_ups, meta) を固定
 *   - usage limit 429 経路 (global / ip) を DB だけで検証
 *   - 設定 disabled / API key 未設定 / mode 切り替えの分岐を抑える
 */
class AiChatTest extends TestCase
{
    use RefreshDatabase;

    private function enableChat(string $pageType = 'top', array $overrides = []): AiChatSetting
    {
        return AiChatSetting::create(array_merge([
            'page_type' => $pageType,
            'enabled' => true,
            'system_prompt' => 'test prompt',
            'tone' => 'friendly',
            'suggest_categories' => [
                [
                    'id' => 'ask',
                    'label' => '質問する',
                    'sub' => 'AIに直接聞いてみる',
                    'chips' => ['未経験でも大丈夫？'],
                ],
            ],
        ], $overrides));
    }

    private function fakeGeminiTextResponse(string $text, int $inputTokens = 100, int $outputTokens = 50): void
    {
        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [[
                    'content' => [
                        'parts' => [['text' => $text]],
                    ],
                ]],
                'usageMetadata' => [
                    'promptTokenCount' => $inputTokens,
                    'candidatesTokenCount' => $outputTokens,
                ],
            ], 200),
        ]);
    }

    // ===== chat (agent mode) =====

    public function test_chat_returns_standard_shape_in_agent_mode(): void
    {
        $this->enableChat();
        config(['services.gemini.api_key' => 'fake-key']);
        $this->fakeGeminiTextResponse('テストの回答です。');

        $response = $this->postJson('/api/chat', [
            'message' => 'おすすめの店舗を教えて',
            'page_type' => 'top',
            'mode' => 'agent',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'stores',
                'follow_ups',
                'meta' => [
                    'mode', 'input_tokens', 'output_tokens', 'total_tokens',
                    'response_ms', 'tool_calls',
                ],
            ])
            ->assertJsonPath('meta.mode', 'agent');
    }

    public function test_chat_logs_to_ai_chat_log(): void
    {
        $this->enableChat();
        config(['services.gemini.api_key' => 'fake-key']);
        $this->fakeGeminiTextResponse('回答テキスト');

        $this->postJson('/api/chat', [
            'message' => 'テスト質問',
            'page_type' => 'top',
            'mode' => 'agent',
        ])->assertStatus(200);

        $log = AiChatLog::first();
        $this->assertNotNull($log);
        $this->assertEquals('テスト質問', $log->user_message);
        $this->assertEquals('回答テキスト', $log->ai_response);
        $this->assertEquals('agent', $log->mode);
    }

    public function test_chat_associates_log_with_authenticated_user(): void
    {
        $user = User::create([
            'line_user_id' => 'U-chat-test',
            'line_display_name' => 'Tester',
            'status' => 'active',
        ]);

        $this->enableChat();
        config(['services.gemini.api_key' => 'fake-key']);
        $this->fakeGeminiTextResponse('応答');

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/chat', [
                'message' => '質問',
                'page_type' => 'top',
                'mode' => 'agent',
            ])->assertStatus(200);

        $log = AiChatLog::first();
        $this->assertEquals($user->id, $log->user_id);
    }

    public function test_chat_strips_store_markers_from_display_text(): void
    {
        $this->enableChat();
        Store::create([
            'name' => 'Test Store', 'area' => '新宿',
            'category' => 'キャバクラ', 'publish_status' => 'published',
        ]);
        config(['services.gemini.api_key' => 'fake-key']);
        $this->fakeGeminiTextResponse('おすすめは[STORE:1] です。');

        $response = $this->postJson('/api/chat', [
            'message' => 'おすすめは？',
            'page_type' => 'top',
            'mode' => 'agent',
        ]);

        $response->assertStatus(200);
        $message = $response->json('message');
        $this->assertStringNotContainsString('[STORE:', $message);
    }

    // ===== chat (finetuned mode) =====

    public function test_chat_finetuned_mode_returns_finetuned_meta(): void
    {
        $this->enableChat();
        config(['services.gemini.api_key' => 'fake-key']);
        $this->fakeGeminiTextResponse('FT mode 回答');

        $response = $this->postJson('/api/chat', [
            'message' => '質問',
            'page_type' => 'top',
            'mode' => 'finetuned',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('meta.mode', 'finetuned');

        $this->assertEquals('finetuned', AiChatLog::first()->mode);
    }

    // ===== mock fallback (no API key) =====

    public function test_chat_returns_mock_response_when_api_key_missing(): void
    {
        $this->enableChat();
        config(['services.gemini.api_key' => null]);

        $response = $this->postJson('/api/chat', [
            'message' => 'ヘルプ',
            'page_type' => 'top',
            'mode' => 'agent',
        ]);

        // mockResponse は 200 を返す (API キー無くてもクラッシュさせない)
        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'stores', 'follow_ups', 'meta']);
    }

    // ===== disabled chat =====

    public function test_chat_returns_403_when_setting_disabled(): void
    {
        $this->enableChat('top', ['enabled' => false]);
        config(['services.gemini.api_key' => 'fake-key']);

        $response = $this->postJson('/api/chat', [
            'message' => 'テスト',
            'page_type' => 'top',
            'mode' => 'agent',
        ]);

        // Phase 1-3 で {error} から Laravel 標準の {message} 形に統一済み
        $response->assertStatus(403)
            ->assertJson(['message' => 'チャットは現在無効です。']);
    }

    public function test_chat_returns_403_when_setting_absent(): void
    {
        config(['services.gemini.api_key' => 'fake-key']);

        $response = $this->postJson('/api/chat', [
            'message' => 'テスト',
            'page_type' => 'top',
            'mode' => 'agent',
        ]);

        $response->assertStatus(403);
    }

    // ===== validation =====

    public function test_chat_validates_required_fields(): void
    {
        $response = $this->postJson('/api/chat', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['message', 'page_type']);
    }

    public function test_chat_validates_message_length(): void
    {
        $response = $this->postJson('/api/chat', [
            'message' => str_repeat('a', 1001),
            'page_type' => 'top',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['message']);
    }

    // ===== usage limits (DB-driven 429) =====

    public function test_chat_returns_429_when_global_daily_limit_exceeded(): void
    {
        $this->enableChat();
        config(['services.gemini.api_key' => 'fake-key']);

        // limit を低くして DB を膨らませる
        AiChatLimit::create([
            'user_daily_limit' => 100,
            'user_monthly_limit' => 1000,
            'ip_daily_limit' => 100,
            'global_daily_limit' => 2,
            'limit_reached_message' => 'グローバル上限',
        ]);
        AiChatLog::create(['ip_address' => '1.1.1.1', 'page_type' => 'top', 'user_message' => 'a', 'ai_response' => 'b', 'mode' => 'agent']);
        AiChatLog::create(['ip_address' => '1.1.1.1', 'page_type' => 'top', 'user_message' => 'a', 'ai_response' => 'b', 'mode' => 'agent']);

        $response = $this->postJson('/api/chat', [
            'message' => 'テスト',
            'page_type' => 'top',
            'mode' => 'agent',
        ]);

        $response->assertStatus(429)
            ->assertJsonStructure(['message', 'limit_type'])
            ->assertJsonPath('limit_type', 'global_daily');
    }

    public function test_chat_returns_429_when_ip_daily_limit_exceeded(): void
    {
        $this->enableChat();
        config(['services.gemini.api_key' => 'fake-key']);

        AiChatLimit::create([
            'user_daily_limit' => 100,
            'user_monthly_limit' => 1000,
            'ip_daily_limit' => 1,
            'global_daily_limit' => 1000,
            'limit_reached_message' => 'IP上限',
        ]);
        // 同一 IP (テストランナーは 127.0.0.1) で 1 件投入
        AiChatLog::create(['ip_address' => '127.0.0.1', 'page_type' => 'top', 'user_message' => 'a', 'ai_response' => 'b', 'mode' => 'agent']);

        $response = $this->postJson('/api/chat', [
            'message' => 'テスト',
            'page_type' => 'top',
            'mode' => 'agent',
        ]);

        $response->assertStatus(429)
            ->assertJsonPath('limit_type', 'ip_daily');
    }

    // ===== chatStream =====

    public function test_chat_stream_returns_event_stream_content_type(): void
    {
        $this->enableChat();
        config(['services.gemini.api_key' => 'fake-key']);
        $this->fakeGeminiTextResponse('ストリーム応答');

        $response = $this->postJson('/api/chat/stream', [
            'message' => 'テスト',
            'page_type' => 'top',
            'mode' => 'agent',
        ]);

        $response->assertStatus(200);
        $this->assertStringContainsString('text/event-stream', $response->headers->get('content-type'));
    }
}
