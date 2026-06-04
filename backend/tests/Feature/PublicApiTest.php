<?php

namespace Tests\Feature;

use App\Models\AiChatSetting;
use App\Models\Area;
use App\Models\Category;
use App\Models\Consultation;
use App\Models\PickupShop;
use App\Models\Review;
use App\Models\SiteSetting;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicApiTest extends TestCase
{
    use RefreshDatabase;

    private function createPublishedStore(array $overrides = []): Store
    {
        static $counter = 0;
        $counter++;

        // テストの flat な hourly_min/hourly_max 指定を体入時給 (wage.trial) に畳む。
        // 通常時給 (wage.regular) は廃止し、サイトの時給は体入時給に一本化したため。
        $hourlyMin = $overrides['hourly_min'] ?? 3000;
        $hourlyMax = $overrides['hourly_max'] ?? 8000;
        unset($overrides['hourly_min'], $overrides['hourly_max']);

        $defaults = [
            'name' => "Store {$counter}",
            'area' => '新宿',
            'category' => 'キャバクラ',
            'publish_status' => 'published',
            'wage' => [
                'trial' => ['hourly_min' => (int) $hourlyMin, 'hourly_max' => (int) $hourlyMax],
            ],
        ];

        return Store::create(array_merge($defaults, $overrides));
    }

    // ========== Home ==========

    public function test_can_get_home_data(): void
    {
        // Create required data
        SiteSetting::create(['key' => 'hero_tagline', 'value' => 'Welcome']);
        Area::create(['name' => '新宿', 'slug' => 'shinjuku', 'visible' => true, 'sort_order' => 0]);
        Category::create(['name' => 'キャバクラ', 'slug' => 'cabaret', 'visible' => true, 'sort_order' => 0]);

        $store = $this->createPublishedStore();
        PickupShop::create([
            'store_id' => $store->id,
            'visible' => true,
            'sort_order' => 0,
        ]);

        Consultation::create([
            'question' => '未経験でも大丈夫？',
            'tag' => '初心者',
            'visible' => true,
            'sort_order' => 0,
        ]);

        $response = $this->getJson('/api/home');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'banner',
                'pickup_shops',
                'consultations',
                'areas',
                'categories',
            ]);
    }

    public function test_home_returns_banner_settings(): void
    {
        SiteSetting::create(['key' => 'hero_tagline', 'value' => 'Test Tagline']);

        $response = $this->getJson('/api/home');

        $response->assertStatus(200)
            ->assertJsonPath('banner.hero_tagline', 'Test Tagline');
    }

    public function test_home_only_returns_visible_areas(): void
    {
        Area::create(['name' => 'Visible', 'slug' => 'visible', 'visible' => true, 'sort_order' => 0]);
        Area::create(['name' => 'Hidden', 'slug' => 'hidden', 'visible' => false, 'sort_order' => 1]);
        // 公開店舗が無いエリアはトップから除外される (空振り防止) ので、
        // visible 判定を検証するため Visible に公開店舗を 1 件置く。
        Store::create(['name' => 'V Store', 'area' => 'Visible', 'category' => 'クラブ', 'publish_status' => 'published']);

        $response = $this->getJson('/api/home');

        $response->assertStatus(200);
        $areas = $response->json('areas');
        $this->assertCount(1, $areas);
        $this->assertEquals('Visible', $areas[0]['name']);
    }

    public function test_home_excludes_areas_with_no_published_stores(): void
    {
        // visible だが公開店舗ゼロ → トップに出すと「中洲 0」のような空振りに
        // なるため除外する。
        Area::create(['name' => 'Populated', 'slug' => 'populated', 'visible' => true, 'sort_order' => 0]);
        Area::create(['name' => 'Empty', 'slug' => 'empty', 'visible' => true, 'sort_order' => 1]);
        Store::create(['name' => 'P Store', 'area' => 'Populated', 'category' => 'クラブ', 'publish_status' => 'published']);
        // Empty には下書きのみ (公開ゼロ)
        Store::create(['name' => 'Draft', 'area' => 'Empty', 'category' => 'クラブ', 'publish_status' => 'draft']);

        $response = $this->getJson('/api/home');

        $response->assertStatus(200);
        $names = array_column($response->json('areas'), 'name');
        $this->assertContains('Populated', $names);
        $this->assertNotContains('Empty', $names);
    }

    public function test_home_only_returns_published_pickup_stores(): void
    {
        $published = $this->createPublishedStore(['publish_status' => 'published']);
        $draft = Store::create([
            'name' => 'Draft Store',
            'area' => '六本木',
            'category' => 'ラウンジ',
            'publish_status' => 'draft',
        ]);

        PickupShop::create(['store_id' => $published->id, 'visible' => true, 'sort_order' => 0]);
        PickupShop::create(['store_id' => $draft->id, 'visible' => true, 'sort_order' => 1]);

        $response = $this->getJson('/api/home');

        $response->assertStatus(200);
        $pickups = $response->json('pickup_shops');
        $this->assertCount(1, $pickups);
    }

    // ========== Store Listing ==========

    public function test_can_list_stores(): void
    {
        $this->createPublishedStore();
        $this->createPublishedStore();
        // Draft store should not appear
        Store::create([
            'name' => 'Draft',
            'area' => '六本木',
            'category' => 'ラウンジ',
            'publish_status' => 'draft',
        ]);

        $response = $this->getJson('/api/stores');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'area', 'category', 'publish_status'],
                ],
                'current_page',
                'total',
            ]);

        // Only published stores
        $this->assertEquals(2, $response->json('total'));
    }

    public function test_can_filter_stores_by_area(): void
    {
        $this->createPublishedStore(['area' => '新宿']);
        $this->createPublishedStore(['area' => '六本木']);

        $response = $this->getJson('/api/stores?area=' . urlencode('新宿'));

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals('新宿', $data[0]['area']);
    }

    public function test_can_filter_stores_by_category(): void
    {
        $this->createPublishedStore(['category' => 'キャバクラ']);
        $this->createPublishedStore(['category' => 'ラウンジ']);

        $response = $this->getJson('/api/stores?category=' . urlencode('ラウンジ'));

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(1, $data);
    }

    public function test_can_sort_stores_by_hourly_desc(): void
    {
        $this->createPublishedStore(['hourly_max' => 5000]);
        $this->createPublishedStore(['hourly_max' => 10000]);

        $response = $this->getJson('/api/stores?sort=hourly_desc');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertGreaterThanOrEqual($data[1]['hourly_max'], $data[0]['hourly_max']);
    }

    public function test_can_filter_stores_by_min_hourly(): void
    {
        $this->createPublishedStore(['hourly_min' => 2000]);
        $this->createPublishedStore(['hourly_min' => 5000]);

        $response = $this->getJson('/api/stores?min_hourly=4000');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertGreaterThanOrEqual(4000, $data[0]['hourly_min']);
    }

    // ========== Store Detail ==========

    public function test_can_show_store(): void
    {
        $store = $this->createPublishedStore(['description' => 'A great store']);

        $response = $this->getJson("/api/stores/{$store->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'store' => ['id', 'name', 'area', 'category'],
                'related',
            ])
            ->assertJsonPath('store.name', $store->name);
    }

    public function test_unpublished_store_returns_404(): void
    {
        $store = Store::create([
            'name' => 'Draft Store',
            'area' => '新宿',
            'category' => 'キャバクラ',
            'publish_status' => 'draft',
        ]);

        $response = $this->getJson("/api/stores/{$store->id}");

        $response->assertStatus(404);
    }

    public function test_store_detail_includes_reviews(): void
    {
        $store = $this->createPublishedStore();
        $user = User::create([
            'line_user_id' => 'U9999999999',
            'line_display_name' => 'Reviewer',
            'status' => 'active',
        ]);

        Review::create([
            'user_id' => $user->id,
            'store_id' => $store->id,
            'rating' => 5,
            'body' => 'Amazing!',
            'status' => 'published',
        ]);

        $response = $this->getJson("/api/stores/{$store->id}");

        $response->assertStatus(200);
        $reviews = $response->json('store.reviews');
        $this->assertNotEmpty($reviews);
        $this->assertEquals('Amazing!', $reviews[0]['body']);
    }

    public function test_store_detail_includes_related_stores(): void
    {
        $store = $this->createPublishedStore(['area' => '新宿', 'category' => 'キャバクラ']);
        $this->createPublishedStore(['area' => '新宿', 'category' => 'ラウンジ']); // same area
        $this->createPublishedStore(['area' => '六本木', 'category' => 'キャバクラ']); // same category

        $response = $this->getJson("/api/stores/{$store->id}");

        $response->assertStatus(200);
        $related = $response->json('related');
        $this->assertNotEmpty($related);
    }

    // ========== Areas & Categories ==========

    public function test_can_get_areas(): void
    {
        Area::create(['name' => '新宿', 'slug' => 'shinjuku', 'visible' => true, 'sort_order' => 0]);
        Area::create(['name' => '六本木', 'slug' => 'roppongi', 'visible' => true, 'sort_order' => 1]);
        Area::create(['name' => 'Hidden', 'slug' => 'hidden', 'visible' => false, 'sort_order' => 2]);

        $response = $this->getJson('/api/areas');

        $response->assertStatus(200);
        $this->assertCount(2, $response->json()); // Only visible areas
    }

    public function test_can_get_categories(): void
    {
        Category::create(['name' => 'キャバクラ', 'slug' => 'cabaret', 'visible' => true, 'sort_order' => 0]);
        Category::create(['name' => 'Hidden Cat', 'slug' => 'hidden', 'visible' => false, 'sort_order' => 1]);

        $response = $this->getJson('/api/categories');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json());
    }

    // ========== Chat Config ==========

    public function test_can_get_chat_config(): void
    {
        $categories = [
            [
                'id' => 'ask',
                'label' => '質問する',
                'sub' => 'AIに直接聞いてみる',
                'chips' => ['未経験でも大丈夫？', '日払いできる？'],
            ],
        ];

        AiChatSetting::create([
            'page_type' => 'top',
            'enabled' => true,
            'system_prompt' => 'test prompt',
            'tone' => 'friendly',
            'suggest_categories' => $categories,
            'suggest_display_mode' => 'categorized',
        ]);

        $response = $this->getJson('/api/chat/config?page_type=top');

        $response->assertStatus(200)
            ->assertJson([
                'enabled' => true,
                'suggest_categories' => $categories,
                'suggest_display_mode' => 'categorized',
            ])
            ->assertJsonStructure(['enabled', 'suggest_categories', 'suggest_display_mode']);
    }

    public function test_chat_config_exposes_chips_only_display_mode(): void
    {
        AiChatSetting::create([
            'page_type' => 'list',
            'enabled' => true,
            'system_prompt' => 'test',
            'tone' => 'friendly',
            'suggest_display_mode' => 'chips_only',
            'suggest_categories' => [
                [
                    'id' => 'rank',
                    'label' => 'ランキング',
                    'sub' => '人気順',
                    'chips' => ['ベスト3を厳選して！', '高時給だけ'],
                ],
            ],
        ]);

        $response = $this->getJson('/api/chat/config?page_type=list');

        $response->assertStatus(200)
            ->assertJson([
                'enabled' => true,
                'suggest_display_mode' => 'chips_only',
            ]);
    }

    public function test_chat_config_returns_disabled_when_no_setting(): void
    {
        $response = $this->getJson('/api/chat/config?page_type=top');

        $response->assertStatus(200)
            ->assertJson([
                'enabled' => false,
                'suggest_categories' => [],
                'suggest_display_mode' => 'off',
            ]);
    }

    public function test_chat_config_returns_disabled_when_setting_is_off(): void
    {
        AiChatSetting::create([
            'page_type' => 'top',
            'enabled' => false,
            'system_prompt' => 'test',
            'tone' => 'friendly',
        ]);

        $response = $this->getJson('/api/chat/config?page_type=top');

        $response->assertStatus(200)
            ->assertJson([
                'enabled' => false,
                'suggest_categories' => [],
                'suggest_display_mode' => 'off',
            ]);
    }

    // ========== Store listing pagination ==========

    public function test_stores_are_paginated(): void
    {
        for ($i = 0; $i < 25; $i++) {
            $this->createPublishedStore();
        }

        $response = $this->getJson('/api/stores?per_page=10');

        $response->assertStatus(200);
        $this->assertCount(10, $response->json('data'));
        $this->assertEquals(25, $response->json('total'));
    }
}
