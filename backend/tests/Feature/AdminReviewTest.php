<?php

namespace Tests\Feature;

use App\Models\AdminUser;
use App\Models\Review;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminReviewTest extends TestCase
{
    use RefreshDatabase;

    private AdminUser $admin;
    private User $user;
    private Store $store;

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

        $this->user = User::create([
            'line_user_id' => 'U0000000001',
            'line_display_name' => 'Reviewer',
            'status' => 'active',
        ]);

        $this->store = Store::create([
            'name' => 'Test Store',
            'area' => '新宿',
            'category' => 'キャバクラ',
            'publish_status' => 'published',
        ]);
    }

    private function createReview(array $overrides = []): Review
    {
        // 「1 ユーザー 1 店舗につき口コミ 1 件」を DB の部分ユニークインデックスで
        // 保証するようになったため、明示指定が無い限り口コミごとに別ユーザーを作る
        // (= 実際の運用と同じ状態)。
        static $counter = 0;
        $counter++;

        $userId = $overrides['user_id'] ?? User::create([
            'line_user_id' => 'UR' . str_pad((string) $counter, 9, '0', STR_PAD_LEFT),
            'line_display_name' => "Reviewer {$counter}",
            'status' => 'active',
        ])->id;

        return Review::create(array_merge([
            'user_id' => $userId,
            'store_id' => $this->store->id,
            'rating' => 4,
            'body' => 'Good place to work!',
            'status' => 'published',
        ], $overrides));
    }

    public function test_admin_can_list_reviews(): void
    {
        $this->createReview();
        $this->createReview(['rating' => 5, 'body' => 'Excellent!']);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/reviews');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'user_id', 'store_id', 'rating', 'body', 'status'],
                ],
                'current_page',
                'total',
            ]);

        $this->assertEquals(2, $response->json('total'));
    }

    public function test_admin_can_show_review(): void
    {
        $review = $this->createReview();

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/admin/reviews/{$review->id}");

        $response->assertStatus(200)
            ->assertJson([
                'id' => $review->id,
                'rating' => 4,
                'body' => 'Good place to work!',
                'status' => 'published',
            ])
            ->assertJsonStructure([
                'id', 'rating', 'body', 'status',
                'user' => ['id', 'line_display_name'],
                'store' => ['id', 'name'],
            ]);
    }

    public function test_admin_can_update_review_status(): void
    {
        $review = $this->createReview(['status' => 'published']);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/admin/reviews/{$review->id}/status", [
                'status' => 'unpublished',
            ]);

        $response->assertStatus(200)
            ->assertJson(['status' => 'unpublished']);

        $this->assertDatabaseHas('reviews', [
            'id' => $review->id,
            'status' => 'unpublished',
        ]);
    }

    public function test_admin_can_filter_reviews_by_status(): void
    {
        $this->createReview(['status' => 'published']);
        $this->createReview(['status' => 'unpublished']);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/reviews?status=unpublished');

        $response->assertStatus(200);
        $this->assertEquals(1, $response->json('total'));
    }

    public function test_admin_can_filter_reviews_by_rating(): void
    {
        $this->createReview(['rating' => 5]);
        $this->createReview(['rating' => 3]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/reviews?rating=5');

        $response->assertStatus(200);
        $this->assertEquals(1, $response->json('total'));
    }

    public function test_admin_can_filter_reviews_by_store(): void
    {
        $store2 = Store::create([
            'name' => 'Other Store',
            'area' => '六本木',
            'category' => 'ラウンジ',
            'publish_status' => 'published',
        ]);

        $this->createReview(['store_id' => $this->store->id]);
        $this->createReview(['store_id' => $store2->id]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/admin/reviews?store_id={$store2->id}");

        $response->assertStatus(200);
        $this->assertEquals(1, $response->json('total'));
    }

    public function test_admin_can_search_reviews_by_user_name(): void
    {
        $taro = User::create([
            'line_user_id' => 'USEARCH0001',
            'line_display_name' => '田中タロウ',
            'status' => 'active',
        ]);
        $this->createReview(['user_id' => $taro->id]);
        $this->createReview(); // 別ユーザー (Reviewer N)

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/reviews?search=' . urlencode('田中'));

        $response->assertStatus(200);
        $this->assertEquals(1, $response->json('total'));
        $this->assertEquals($taro->id, $response->json('data.0.user_id'));
    }

    public function test_admin_can_search_reviews_by_store_name(): void
    {
        $bene = Store::create([
            'name' => 'ベネ系列の店',
            'area' => '銀座',
            'category' => 'ラウンジ',
            'publish_status' => 'published',
        ]);
        $this->createReview(['store_id' => $bene->id]);
        $this->createReview(['store_id' => $this->store->id]); // Test Store

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/reviews?search=' . urlencode('ベネ'));

        $response->assertStatus(200);
        $this->assertEquals(1, $response->json('total'));
        $this->assertEquals($bene->id, $response->json('data.0.store_id'));
    }

    public function test_admin_can_sort_reviews_by_updated_at_asc(): void
    {
        $first = $this->createReview();
        $second = $this->createReview();
        // updated_at を明示的にずらす (created とは別軸で並ぶことを確認)。
        $first->forceFill(['updated_at' => now()->addMinute()])->save();

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/reviews?sort=updated_at&order=asc');

        $response->assertStatus(200);
        // 昇順なので、後から更新した $first が最後に来る。
        $ids = array_column($response->json('data'), 'id');
        $this->assertEquals($first->id, end($ids));
    }

    public function test_update_review_status_validates_input(): void
    {
        $review = $this->createReview();

        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/admin/reviews/{$review->id}/status", [
                'status' => 'invalid',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['status']);
    }

    public function test_review_list_requires_authentication(): void
    {
        $response = $this->getJson('/api/admin/reviews');

        $response->assertStatus(401);
    }
}
