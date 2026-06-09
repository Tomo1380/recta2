<?php

namespace Tests\Unit\Services\AiChat;

use App\Models\AiChatSetting;
use App\Models\Store;
use App\Services\AiChat\PromptBuilder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * PromptBuilder の純粋ロジック (Cache 以外) を Unit テスト。
 * Service 経由なら HTTP 呼び出しなしでプロンプト構築を検証できる。
 */
class PromptBuilderTest extends TestCase
{
    use RefreshDatabase;

    private PromptBuilder $builder;

    protected function setUp(): void
    {
        parent::setUp();
        $this->builder = new PromptBuilder();
    }

    /**
     * AiChatSetting は page_type が unique なので、テスト中に複数作るとぶつかる。
     * 各テストで firstOrCreate で 1 件確保し、override 内容を update して返す。
     */
    private function setting(array $overrides = []): AiChatSetting
    {
        $setting = AiChatSetting::firstOrCreate(
            ['page_type' => $overrides['page_type'] ?? 'top'],
            [
                'enabled' => true,
                'system_prompt' => 'test prompt',
                'tone' => 'friendly',
            ],
        );
        if ($overrides) {
            $setting->fill($overrides);
        }
        return $setting;
    }

    public function test_get_tone_description_maps_known_tones(): void
    {
        $this->assertEquals('カジュアルで親しみやすい口調', $this->builder->getToneDescription('casual'));
        $this->assertEquals('丁寧でフォーマルな口調', $this->builder->getToneDescription('formal'));
        $this->assertEquals('フレンドリーで温かみのある口調', $this->builder->getToneDescription('friendly'));
        // 未定義は default
        $this->assertEquals('フレンドリーで温かみのある口調', $this->builder->getToneDescription('xxx'));
    }

    public function test_build_gemini_history_normalizes_roles(): void
    {
        $history = [
            ['role' => 'user', 'content' => 'こんにちは'],
            ['role' => 'assistant', 'content' => 'いらっしゃいませ'],
            ['role' => 'user', 'text' => 'おすすめは？'], // 'text' フィールドも受け付ける
            ['role' => 'user', 'content' => ''], // 空メッセージは skip
        ];

        $result = $this->builder->buildGeminiHistory($history);

        $this->assertCount(3, $result);
        $this->assertEquals('user', $result[0]['role']);
        $this->assertEquals('model', $result[1]['role']); // assistant -> model
        $this->assertEquals('user', $result[2]['role']);
        $this->assertEquals('こんにちは', $result[0]['parts'][0]['text']);
    }

    public function test_build_store_context_returns_empty_when_not_detail_page(): void
    {
        $this->assertEquals('', $this->builder->buildStoreContext('top', 1));
        $this->assertEquals('', $this->builder->buildStoreContext('list', 1));
        $this->assertEquals('', $this->builder->buildStoreContext('detail', null));
    }

    public function test_build_store_context_returns_empty_for_missing_store(): void
    {
        $this->assertEquals('', $this->builder->buildStoreContext('detail', 99999));
    }

    public function test_build_store_context_includes_store_fields_on_detail(): void
    {
        $store = Store::create([
            'name' => 'Lounge X',
            'area' => '六本木',
            'nearest_station' => '六本木駅',
            'category' => 'ラウンジ',
            'description' => 'お洒落なラウンジ',
            'schedule' => ['hours_text' => '20:00-LAST'],
            // 通常時給は廃止。給与は体入時給 (wage.trial) に一本化。
            'wage' => ['trial' => ['hourly_min' => 4000, 'hourly_max' => 8000]],
            'feature_tags' => ['未経験歓迎', 'ノルマなし'],
            'publish_status' => 'published',
        ]);

        $context = $this->builder->buildStoreContext('detail', $store->id);

        $this->assertStringContainsString('Lounge X', $context);
        $this->assertStringContainsString('六本木', $context);
        $this->assertStringContainsString('20:00-LAST', $context);
        $this->assertStringContainsString('未経験歓迎', $context);
        $this->assertStringContainsString('4000', $context);
    }

    public function test_agent_system_prompt_includes_tool_rules_on_top_page(): void
    {
        $prompt = $this->builder->buildAgentSystemPrompt($this->setting(), '', '', 'top');

        $this->assertStringContainsString('search_stores', $prompt);
        $this->assertStringContainsString('Recta AI', $prompt);
        // LINE 誘導は本文に書かせず UI ボタンに一本化したため、プロンプトは
        // 「LINE への誘導文を本文に書かない」旨を含む（LINE への言及自体は残る）。
        $this->assertStringContainsString('LINE', $prompt);
    }

    public function test_agent_system_prompt_uses_detail_rules_when_store_context_provided(): void
    {
        $context = "店名: テスト店舗";
        $prompt = $this->builder->buildAgentSystemPrompt($this->setting(), $context, '', 'detail');

        $this->assertStringContainsString('テスト店舗', $prompt);
        $this->assertStringContainsString('詳細ページのルール', $prompt);
        // 詳細ページではトップ向けの「search_stores 必須」ルールは流さない
        $this->assertStringNotContainsString('必ずsearch_storesを呼び出して', $prompt);
    }

    // Fine-tuned モード廃止に伴い buildOpenAiSystemPrompt / buildCoreSystemPrompt は
    // 削除済み。関連テストも撤去した（Agent prompt のみ検証する）。
}
