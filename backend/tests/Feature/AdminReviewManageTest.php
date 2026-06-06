<?php

namespace Tests\Feature;

use App\Models\AdminUser;
use App\Models\Review;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * 管理者による口コミ運用（FB 2026-06-05 B）のテスト。
 * 桜口コミ/有名嬢口コミ作成・店側返答・投稿者絞り込み。
 */
class AdminReviewManageTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): AdminUser
    {
        return AdminUser::create([
            'name' => 'Admin', 'email' => 'admin@test.com', 'password' => 'password',
            'role' => 'super_admin', 'status' => 'active',
        ]);
    }

    private function store(): Store
    {
        return Store::create([
            'name' => 'Test Store', 'area' => '新宿', 'category' => 'キャバクラ',
            'publish_status' => 'published',
        ]);
    }

    public function test_admin_can_create_featured_review_without_user(): void
    {
        $store = $this->store();

        $res = $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/admin/reviews', [
                'store_id' => $store->id,
                'rating' => 5,
                'body' => '有名嬢からの推薦',
                'author_name' => '有名キャバ嬢A',
                'is_featured' => true,
            ]);

        $res->assertStatus(201)
            ->assertJsonPath('author_name', '有名キャバ嬢A')
            ->assertJsonPath('is_featured', true)
            ->assertJsonPath('user_id', null)
            ->assertJsonPath('display_author_name', '有名キャバ嬢A');

        $this->assertDatabaseHas('reviews', [
            'store_id' => $store->id,
            'author_name' => '有名キャバ嬢A',
            'is_featured' => true,
            'user_id' => null,
        ]);
    }

    public function test_admin_can_add_store_reply(): void
    {
        $store = $this->store();
        $review = Review::create([
            'store_id' => $store->id, 'rating' => 4, 'body' => '良かった', 'status' => 'published',
        ]);

        $res = $this->actingAs($this->admin(), 'sanctum')
            ->putJson("/api/admin/reviews/{$review->id}", [
                'store_reply' => 'ご来店ありがとうございます！',
            ]);

        $res->assertStatus(200)
            ->assertJsonPath('store_reply', 'ご来店ありがとうございます！');
        $this->assertNotNull($res->json('store_reply_at'));
    }

    public function test_index_filters_by_user_id(): void
    {
        $store = $this->store();
        $user = User::create(['line_user_id' => 'U1', 'line_display_name' => 'A', 'status' => 'active']);
        $other = User::create(['line_user_id' => 'U2', 'line_display_name' => 'B', 'status' => 'active']);

        Review::create(['store_id' => $store->id, 'user_id' => $user->id, 'rating' => 5, 'body' => 'mine1', 'status' => 'published']);
        Review::create(['store_id' => $store->id, 'user_id' => $other->id, 'rating' => 3, 'body' => 'other', 'status' => 'published']);

        $res = $this->actingAs($this->admin(), 'sanctum')
            ->getJson("/api/admin/reviews?user_id={$user->id}");

        $res->assertStatus(200)->assertJsonPath('total', 1);
    }
}
