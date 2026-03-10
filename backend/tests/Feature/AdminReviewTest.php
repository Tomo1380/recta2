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
        return Review::create(array_merge([
            'user_id' => $this->user->id,
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
