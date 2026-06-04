<?php

namespace Tests\Unit\Services\AiChat;

use App\Models\Area;
use App\Models\Category;
use App\Models\IndustryKnowledge;
use App\Models\Store;
use App\Services\AiChat\StoreToolRegistry;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StoreToolRegistryTest extends TestCase
{
    use RefreshDatabase;

    private StoreToolRegistry $tools;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tools = new StoreToolRegistry();
    }

    public function test_get_declarations_lists_all_tool_names(): void
    {
        $names = collect($this->tools->getDeclarations())->pluck('name')->all();

        $this->assertEquals([
            'search_stores',
            'get_store_detail',
            'get_areas',
            'get_categories',
            'get_industry_knowledge',
        ], $names);
    }

    public function test_execute_dispatches_to_correct_tool(): void
    {
        Area::create(['name' => '新宿', 'slug' => 'shinjuku', 'visible' => true, 'sort_order' => 0]);

        $result = $this->tools->execute('get_areas', []);

        $this->assertArrayHasKey('areas', $result);
        $this->assertCount(1, $result['areas']);
    }

    public function test_execute_returns_error_for_unknown_tool(): void
    {
        $result = $this->tools->execute('not_a_tool', []);

        $this->assertArrayHasKey('error', $result);
        $this->assertStringContainsString('Unknown tool', $result['error']);
    }

    public function test_get_store_detail_returns_error_for_unpublished_store(): void
    {
        $store = Store::create([
            'name' => 'Draft', 'area' => '新宿', 'category' => 'キャバクラ',
            'publish_status' => 'draft',
        ]);

        $result = $this->tools->getStoreDetail(['store_id' => $store->id]);

        $this->assertArrayHasKey('error', $result);
    }

    public function test_get_store_detail_returns_full_shape_for_published(): void
    {
        $store = Store::create([
            'name' => 'Lounge X',
            'area' => '六本木',
            'category' => 'ラウンジ',
            'nearest_station' => '六本木駅',
            // 通常時給は廃止。給与は体入時給 (wage.trial) に一本化。
            'wage' => ['trial' => ['hourly_min' => 4000, 'hourly_max' => 8000]],
            'schedule' => ['hours_text' => '20-LAST', 'open' => '20:00', 'close' => 'LAST'],
            'feature_tags' => ['未経験歓迎'],
            'description' => 'テスト',
            'publish_status' => 'published',
        ]);

        $result = $this->tools->getStoreDetail(['store_id' => $store->id]);

        $this->assertEquals('Lounge X', $result['name']);
        // hourly_min/max は体入時給のエイリアス。
        $this->assertEquals(4000, $result['hourly_min']);
        $this->assertEquals(8000, $result['hourly_max']);
        $this->assertEquals(4000, $result['trial_hourly_min']);
        $this->assertEquals(8000, $result['trial_hourly_max']);
        $this->assertEquals('20-LAST', $result['business_hours']);
        $this->assertContains('未経験歓迎', $result['feature_tags']);
    }

    public function test_get_industry_knowledge_returns_empty_for_no_topic(): void
    {
        $result = $this->tools->getIndustryKnowledge(['topic' => '']);

        $this->assertSame([], $result['articles']);
        $this->assertStringContainsString('トピック', $result['message']);
    }

    public function test_get_industry_knowledge_matches_exact_keyword(): void
    {
        IndustryKnowledge::create([
            'category' => '基本', 'slug' => 'norma',
            'title' => 'ノルマとは',
            'keywords' => ['ノルマ', 'ノルマなし'],
            'content' => 'ノルマの説明',
            'is_active' => true,
            'sort_order' => 0,
        ]);

        $result = $this->tools->getIndustryKnowledge(['topic' => 'ノルマ']);

        $this->assertCount(1, $result['articles']);
        $this->assertEquals('ノルマとは', $result['articles'][0]['title']);
    }

    public function test_search_stores_filters_by_area(): void
    {
        Store::create([
            'name' => 'A', 'area' => '新宿', 'category' => 'キャバクラ',
            'publish_status' => 'published',
        ]);
        Store::create([
            'name' => 'B', 'area' => '六本木', 'category' => 'キャバクラ',
            'publish_status' => 'published',
        ]);

        $result = $this->tools->searchStores(['area' => '新宿']);

        $this->assertEquals(1, $result['count']);
        $this->assertEquals('A', $result['stores'][0]['name']);
    }

    public function test_search_stores_excludes_unpublished(): void
    {
        Store::create([
            'name' => 'Published', 'area' => '新宿', 'category' => 'キャバクラ',
            'publish_status' => 'published',
        ]);
        Store::create([
            'name' => 'Draft', 'area' => '新宿', 'category' => 'キャバクラ',
            'publish_status' => 'draft',
        ]);

        $result = $this->tools->searchStores(['area' => '新宿']);

        $this->assertEquals(1, $result['count']);
        $this->assertEquals('Published', $result['stores'][0]['name']);
    }

    public function test_search_stores_respects_limit(): void
    {
        for ($i = 0; $i < 15; $i++) {
            Store::create([
                'name' => "Store {$i}", 'area' => '新宿', 'category' => 'キャバクラ',
                'publish_status' => 'published',
            ]);
        }

        $result = $this->tools->searchStores(['limit' => 3]);
        $this->assertEquals(3, $result['count']);

        // 上限 10
        $result = $this->tools->searchStores(['limit' => 50]);
        $this->assertEquals(10, $result['count']);
    }

    public function test_get_areas_returns_only_existing(): void
    {
        Area::create(['name' => '新宿', 'slug' => 'shinjuku', 'visible' => true, 'sort_order' => 0]);
        Area::create(['name' => '六本木', 'slug' => 'roppongi', 'visible' => true, 'sort_order' => 1]);

        $result = $this->tools->getAreas();
        $this->assertCount(2, $result['areas']);
    }

    public function test_get_categories_returns_existing(): void
    {
        Category::create(['name' => 'キャバクラ', 'slug' => 'cabaclub', 'visible' => true, 'sort_order' => 0]);

        $result = $this->tools->getCategories();
        $this->assertCount(1, $result['categories']);
    }
}
