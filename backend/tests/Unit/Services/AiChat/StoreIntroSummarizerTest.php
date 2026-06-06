<?php

namespace Tests\Unit\Services\AiChat;

use App\Models\Store;
use App\Services\AiChat\GeminiClient;
use App\Services\AiChat\StoreIntroSummarizer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * StoreIntroSummarizer の生成・キャッシュ挙動を検証する。
 *  - 自由入力を素材に Gemini を呼んで ai_intro / ai_intro_hash を保存する
 *  - 素材が変わらなければ再生成しない (= 1店舗1回課金)
 *  - 素材が変われば作り直す
 *  - キー未設定 / 素材なしでは Gemini を呼ばない
 */
class StoreIntroSummarizerTest extends TestCase
{
    use RefreshDatabase;

    private StoreIntroSummarizer $summarizer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->summarizer = new StoreIntroSummarizer(new GeminiClient());
        config(['services.gemini.api_key' => 'fake-key']);
    }

    private function fakeGemini(string $text): void
    {
        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [['content' => ['parts' => [['text' => $text]]]]],
                'usageMetadata' => ['promptTokenCount' => 10, 'candidatesTokenCount' => 20],
            ], 200),
        ]);
    }

    private function makeStore(array $overrides = []): Store
    {
        return Store::create(array_merge([
            'name' => 'Lounge X',
            'area' => '六本木',
            'category' => 'ラウンジ',
            'features_text' => 'アットホームで未経験でも安心して働けるお店です。',
            'publish_status' => 'published',
        ], $overrides));
    }

    public function test_generates_and_caches_intro_from_free_text(): void
    {
        $this->fakeGemini('落ち着いた雰囲気で未経験さんが多く活躍しているお店です。');
        $store = $this->makeStore();

        $intro = $this->summarizer->intro($store);

        $this->assertSame('落ち着いた雰囲気で未経験さんが多く活躍しているお店です。', $intro);
        $store->refresh();
        $this->assertSame($intro, $store->ai_intro);
        $this->assertNotNull($store->ai_intro_hash);
        Http::assertSentCount(1);
    }

    public function test_does_not_regenerate_when_source_unchanged(): void
    {
        $this->fakeGemini('紹介文A');
        $store = $this->makeStore();

        $this->summarizer->intro($store);
        $this->summarizer->intro($store->fresh());

        // 2 回目はキャッシュヒットで Gemini を呼ばない
        Http::assertSentCount(1);
    }

    public function test_regenerates_when_source_text_changes(): void
    {
        // Http::fake を 2 回呼ぶと最初の stub が優先され続けるので、1 つの fake に
        // sequence で 2 応答を積む (1 回目=A / 2 回目=B)。
        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::sequence()
                ->push(['candidates' => [['content' => ['parts' => [['text' => '紹介文A']]]]]], 200)
                ->push(['candidates' => [['content' => ['parts' => [['text' => '紹介文B']]]]]], 200),
        ]);

        $store = $this->makeStore();
        $this->assertSame('紹介文A', $this->summarizer->intro($store));

        $store->update(['features_text' => '全く違う特徴に書き換えた本文です。']);
        $intro = $this->summarizer->intro($store->fresh());

        $this->assertSame('紹介文B', $intro);
        Http::assertSentCount(2); // 素材が変わったので作り直した
    }

    public function test_no_call_when_source_is_empty(): void
    {
        Http::fake();
        $store = $this->makeStore([
            'features_text' => null,
            'summary_text' => null,
            'description' => null,
            'feature_tags' => [],
        ]);

        $intro = $this->summarizer->intro($store);

        $this->assertNull($intro);
        Http::assertNothingSent();
    }

    public function test_no_call_when_api_key_missing(): void
    {
        config(['services.gemini.api_key' => null]);
        Http::fake();
        $store = $this->makeStore();

        $intro = $this->summarizer->intro($store);

        $this->assertNull($intro);
        Http::assertNothingSent();
    }
}
