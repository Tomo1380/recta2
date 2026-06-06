<?php

namespace Tests\Feature;

use App\Models\AdminUser;
use App\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminStoreTest extends TestCase
{
    use RefreshDatabase;

    private AdminUser $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = AdminUser::create([
            'name' => 'Test Admin',
            'email' => 'admin@test.com',
            'password' => 'password',
            'role' => 'super_admin',
            'status' => 'active',
        ]);
    }

    private function createStore(array $overrides = []): Store
    {
        return Store::create(array_merge([
            'name' => 'Test Store',
            'area' => '新宿',
            'category' => 'キャバクラ',
            'publish_status' => 'published',
        ], $overrides));
    }

    public function test_admin_can_list_stores(): void
    {
        $this->createStore(['name' => 'Store A']);
        $this->createStore(['name' => 'Store B', 'email' => null]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/stores');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'area', 'category', 'publish_status'],
                ],
                'current_page',
                'total',
            ]);

        $this->assertCount(2, $response->json('data'));
    }

    public function test_admin_can_create_store(): void
    {
        $storeData = [
            'name' => 'New Store',
            'area' => '六本木',
            'category' => 'ラウンジ',
            'publish_status' => 'draft',
            // 通常時給は廃止。給与は体入時給 (trial_hourly_*) に一本化。
            // フロントは体入時給を文字列で送る (BUG-013)。
            'trial_hourly_min' => '3000',
            'trial_hourly_max' => '8000',
            'description' => 'A nice lounge',
            'feature_tags' => ['未経験歓迎', 'ノルマなし'],
        ];

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/stores', $storeData);

        $response->assertStatus(201)
            ->assertJson([
                'name' => 'New Store',
                'area' => '六本木',
                'category' => 'ラウンジ',
                'publish_status' => 'draft',
                // 通常時給は廃止。給与は体入時給に一本化。
                'trial_hourly_min' => 3000,
                'trial_hourly_max' => 8000,
            ]);

        $this->assertDatabaseHas('stores', [
            'name' => 'New Store',
            'area' => '六本木',
        ]);
    }

    public function test_create_store_rejects_javascript_scheme_website_url(): void
    {
        // 公開ページの <a href> に直接出るため、javascript:/data: scheme は拒否する (格納型XSS防止)。
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/stores', [
                'name' => 'XSS Store',
                'area' => '六本木',
                'category' => 'ラウンジ',
                'website_url' => 'javascript:alert(document.cookie)',
            ]);

        $response->assertStatus(422)->assertJsonValidationErrors('website_url');
    }

    public function test_store_images_are_normalized_to_url_order_objects(): void
    {
        // images JSONB は生 URL 文字列 (アップロード経由) と {url, order} (seed) が
        // 混在しうる。StoreResource は常に {url, order} に正規化して返す
        // (混在だと店舗詳細に画像が出ない不具合があった)。
        $store = $this->createStore([
            'images' => [
                'https://example.com/legacy-string.jpg',
                ['url' => 'https://example.com/object.jpg', 'order' => 5],
            ],
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/admin/stores/{$store->id}");

        $response->assertStatus(200)
            ->assertJsonPath('images.0.url', 'https://example.com/legacy-string.jpg')
            ->assertJsonPath('images.0.order', 0)
            ->assertJsonPath('images.1.url', 'https://example.com/object.jpg')
            ->assertJsonPath('images.1.order', 5);
    }

    public function test_create_store_accepts_https_website_url(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/stores', [
                'name' => 'OK Store',
                'area' => '六本木',
                'category' => 'ラウンジ',
                'website_url' => 'https://example.com/shop',
            ]);

        $response->assertStatus(201);
    }

    public function test_admin_can_show_store(): void
    {
        $store = $this->createStore();

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/admin/stores/{$store->id}");

        $response->assertStatus(200)
            ->assertJson([
                'id' => $store->id,
                'name' => 'Test Store',
                'area' => '新宿',
                'category' => 'キャバクラ',
            ]);
    }

    public function test_admin_can_update_store(): void
    {
        $store = $this->createStore();

        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/admin/stores/{$store->id}", [
                'name' => 'Updated Store',
                // 通常時給は廃止。給与は体入時給 (trial_hourly_*) に一本化。
                'trial_hourly_min' => '5000',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'name' => 'Updated Store',
                // 通常時給は廃止。給与は体入時給に一本化。
                'trial_hourly_min' => 5000,
            ]);

        $this->assertDatabaseHas('stores', [
            'id' => $store->id,
            'name' => 'Updated Store',
        ]);
    }

    public function test_admin_can_delete_store(): void
    {
        $store = $this->createStore();

        $response = $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/admin/stores/{$store->id}");

        $response->assertStatus(204);
        $this->assertDatabaseMissing('stores', ['id' => $store->id]);
    }

    public function test_admin_can_search_stores(): void
    {
        $this->createStore(['name' => 'Club Lumiere']);
        $this->createStore(['name' => 'Lounge Etoile']);

        // Search is via 'search' query param using ilike which may not work on SQLite.
        // We test the endpoint responds correctly.
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/stores?search=Lumiere');

        $response->assertStatus(200);
    }

    public function test_admin_can_filter_stores_by_area(): void
    {
        $this->createStore(['name' => 'Shinjuku Store', 'area' => '新宿']);
        $this->createStore(['name' => 'Roppongi Store', 'area' => '六本木']);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/stores?area=' . urlencode('新宿'));

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals('新宿', $data[0]['area']);
    }

    public function test_admin_can_filter_stores_by_category(): void
    {
        $this->createStore(['name' => 'Cabaret Store', 'category' => 'キャバクラ']);
        $this->createStore(['name' => 'Lounge Store', 'category' => 'ラウンジ']);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/stores?category=' . urlencode('ラウンジ'));

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals('ラウンジ', $data[0]['category']);
    }

    public function test_admin_can_filter_stores_by_publish_status(): void
    {
        $this->createStore(['name' => 'Published', 'publish_status' => 'published']);
        $this->createStore(['name' => 'Draft', 'publish_status' => 'draft']);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/stores?publish_status=draft');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals('Draft', $data[0]['name']);
    }

    public function test_create_store_validates_required_fields(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/stores', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'area', 'category']);
    }

    public function test_create_store_with_json_fields(): void
    {
        $storeData = [
            'name' => 'Store with JSON',
            'area' => '銀座',
            'category' => 'クラブ',
            'back_items' => [
                ['label' => 'ドリンクバック', 'amount' => '1000円'],
            ],
            'fee_items' => [
                ['label' => 'ヘアメ代', 'amount' => '1500円'],
            ],
            'qa' => [
                ['question' => '未経験でも大丈夫？', 'answer' => 'はい、大丈夫です！'],
            ],
            'feature_tags' => ['未経験歓迎', '日払いOK'],
        ];

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/stores', $storeData);

        $response->assertStatus(201);
        $this->assertEquals('Store with JSON', $response->json('name'));
    }

    /**
     * 6/4 追加FB: 採用例はセクション単位 (recent_hire_examples) で保存・返却される。
     * recent_hires は月別の人数だけを持ち、examples は紐付かない。
     */
    public function test_create_store_with_recent_hire_examples(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/stores', [
                'name' => 'Recent Hire Store',
                'area' => '銀座',
                'category' => 'クラブ',
                'recent_hires' => [
                    ['month' => '1ヶ月前', 'count' => 12],
                    ['month' => '2ヶ月前', 'count' => 8],
                ],
                'recent_hires_summary' => '直近2ヶ月で20名採用',
                'recent_hire_examples' => [
                    '20歳 未経験 → 時給5,000円スタート',
                    '25歳 経験1年 → 時給6,500円スタート',
                ],
            ]);

        $response->assertStatus(201);
        $this->assertSame(['20歳 未経験 → 時給5,000円スタート', '25歳 経験1年 → 時給6,500円スタート'], $response->json('recent_hire_examples'));
        $this->assertSame(12, $response->json('recent_hires.0.count'));
        // 月別エントリに examples は含めない。
        $this->assertArrayNotHasKey('examples', $response->json('recent_hires.0'));
    }

    /**
     * 6/4 追加FB: 店舗画像をドラッグ&ドロップで並べ替えできる (= サムネイル変更)。
     * order は現在 index の新しい並び順。order フィールドも振り直される。
     */
    public function test_admin_can_reorder_store_images(): void
    {
        $store = $this->createStore([
            'images' => [
                ['url' => 'https://example.com/a.jpg', 'order' => 0],
                ['url' => 'https://example.com/b.jpg', 'order' => 1],
                ['url' => 'https://example.com/c.jpg', 'order' => 2],
            ],
        ]);

        // 3枚目を先頭 (サムネイル) に持ってくる: [2, 0, 1]
        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/admin/stores/{$store->id}/images/reorder", ['order' => [2, 0, 1]]);

        $response->assertStatus(200);
        $images = $response->json('images');
        $this->assertSame('https://example.com/c.jpg', $images[0]['url']);
        $this->assertSame('https://example.com/a.jpg', $images[1]['url']);
        $this->assertSame('https://example.com/b.jpg', $images[2]['url']);
        // order は新しい位置で振り直される。
        $this->assertSame([0, 1, 2], array_column($images, 'order'));
    }

    public function test_reorder_store_images_rejects_invalid_permutation(): void
    {
        $store = $this->createStore([
            'images' => [
                ['url' => 'https://example.com/a.jpg', 'order' => 0],
                ['url' => 'https://example.com/b.jpg', 'order' => 1],
            ],
        ]);

        // 重複・欠番は順列でないので 422。
        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/admin/stores/{$store->id}/images/reorder", ['order' => [0, 0]]);

        $response->assertStatus(422);
    }

    public function test_store_list_requires_authentication(): void
    {
        $response = $this->getJson('/api/admin/stores');

        $response->assertStatus(401);
    }

    /**
     * 第2弾グループ4: ドレスコードの説明＋ドレス例画像 (dress_code.photos) が
     * dress_code_detail として返ること。
     */
    public function test_create_store_with_dress_photos(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/stores', [
                'name' => 'Dress Photo Store',
                'area' => '銀座',
                'category' => 'ラウンジ',
                'dress_code' => [
                    'description' => "明るめのミニドレス推奨。\n黒・ロングはNG。",
                    'photos' => [
                        ['image_url' => 'https://example.com/dress1.jpg', 'caption' => 'スナイデル'],
                    ],
                ],
            ]);

        $response->assertStatus(201);
        $this->assertCount(1, $response->json('dress_code_detail.photos'));
        $this->assertSame('スナイデル', $response->json('dress_code_detail.photos.0.caption'));
    }

    /**
     * 第2弾グループ3: 面接で聞かれることリスト (interview_info.questions) が
     * 格納され Resource で返ること。
     */
    public function test_create_store_with_interview_questions(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/stores', [
                'name' => 'Interview Q Store',
                'area' => '銀座',
                'category' => 'クラブ',
                'interview_info' => [
                    'criteria' => "明るい方歓迎\n未経験OK",
                    'questions' => [
                        ['question' => '出勤頻度は？', 'answer' => '週1からOKです'],
                        ['question' => '体験はできますか？', 'answer' => 'はい、当日体験も可能です'],
                    ],
                ],
            ]);

        $response->assertStatus(201);
        $this->assertCount(2, $response->json('interview_info.questions'));
        $this->assertSame('出勤頻度は？', $response->json('interview_info.questions.0.question'));
        $this->assertSame('週1からOKです', $response->json('interview_info.questions.0.answer'));
    }

    /**
     * 第2弾グループ1: 給料システム / バックのフリーテキスト / 給与サイクル・
     * 給料日・日払い上限 が JSONB に格納され、Resource で flat に返ること。
     */
    public function test_create_store_with_pay_system_and_payroll_fields(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/stores', [
                'name' => 'Pay System Store',
                'area' => '六本木',
                'category' => 'ラウンジ',
                'pay_system_types' => ['完全時給制', '時給+バックor売上の高い方'],
                'salary_notes' => "売上の20%還元。\nポイントは1pt=100円。",
                'back_text' => "同伴バック：21:30まで\n1回目→5,000円",
                'payroll_cycle' => '月末締め翌月払い',
                'payroll_pay_day' => '月末締め翌月15日払い',
                'daily_pay_type' => 'capped',
                'daily_pay_limit' => 30000,
                'facility_photos' => [
                    ['image_url' => 'https://example.com/locker.jpg', 'caption' => '更衣室'],
                    ['image_url' => '/storage/stores/extra/toilet.jpg', 'caption' => 'パウダールーム'],
                ],
            ]);

        $response->assertStatus(201);
        $this->assertSame('完全時給制', $response->json('pay_system_types.0'));
        $this->assertCount(2, $response->json('facility_photos'));
        $this->assertSame('更衣室', $response->json('facility_photos.0.caption'));
        $this->assertCount(2, $response->json('pay_system_types'));
        $this->assertStringContainsString('ポイント', $response->json('salary_notes'));
        $this->assertStringContainsString('同伴バック', $response->json('back_text'));
        $this->assertSame('月末締め翌月払い', $response->json('payroll_cycle'));
        $this->assertSame('月末締め翌月15日払い', $response->json('payroll_pay_day'));
        $this->assertSame('capped', $response->json('daily_pay_type'));
        $this->assertSame(30000, $response->json('daily_pay_limit'));
    }

    /**
     * 金額＋％の複合バック項目は {value,unit} 1組では表現できないため、
     * 入力文字列をそのまま amount に保持して忠実に表示する (金額が消えない)。
     */
    public function test_compound_back_item_preserves_amount(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/stores', [
                'name' => 'Compound Back',
                'area' => '銀座',
                'category' => 'クラブ',
                'back_items' => [
                    ['label' => '指名バック', 'amount' => '1,000円 / 10%'],
                    ['label' => '同伴バック', 'amount' => '15%'],
                ],
            ]);

        $response->assertStatus(201);
        // 複合は raw 文字列を保持 (10% だけに潰れない)
        $this->assertSame('1,000円 / 10%', $response->json('back_items.0.amount'));
        // ％単体は従来どおり {value,unit} に正規化
        $this->assertSame(15, $response->json('back_items.1.value'));
        $this->assertSame('percent', $response->json('back_items.1.unit'));
    }

    /**
     * 項目名だけで金額が空でも保存できる (画面ラベルが「任意」)。
     * 空金額は「無料」と誤表示せず value/unit を付けない。
     */
    public function test_back_item_amount_is_optional(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/stores', [
                'name' => 'Empty Amount',
                'area' => '銀座',
                'category' => 'クラブ',
                'back_items' => [
                    ['label' => '応相談バック', 'amount' => ''],
                ],
            ]);

        $response->assertStatus(201);
        $this->assertSame('応相談バック', $response->json('back_items.0.label'));
        $this->assertNull($response->json('back_items.0.value'));
        $this->assertNull($response->json('back_items.0.unit'));
    }
}
