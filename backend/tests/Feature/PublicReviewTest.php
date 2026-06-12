<?php

namespace Tests\Feature;

use App\Models\Review;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Phase 0 snapshot: 口コミ投稿/削除/自分の口コミ一覧の shape を固定。
 *
 * 現状:
 *   POST /stores/{store}/reviews → ReviewResource (success) / {message} (error)
 *   GET  /user/reviews → paginator + ReviewResource (flat shape)
 *   DELETE /user/reviews/{review} → {message: '口コミを削除しました'}
 */
class PublicReviewTest extends TestCase
{
    use RefreshDatabase;

    private function createUser(): User
    {
        static $c = 0;
        $c++;
        return User::create([
            'line_user_id' => "U-test-{$c}",
            'line_display_name' => "U{$c}",
            'status' => 'active',
        ]);
    }

    private function createStore(): Store
    {
        static $c = 0;
        $c++;
        return Store::create([
            'name' => "Store {$c}",
            'area' => '新宿',
            'category' => 'キャバクラ',
            'publish_status' => 'published',
        ]);
    }

    public function test_authenticated_user_can_post_review(): void
    {
        $user = $this->createUser();
        $store = $this->createStore();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson("/api/stores/{$store->id}/reviews", [
                'rating' => 5,
                'body' => '最高のお店でした。雰囲気もスタッフも◎',
            ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'id', 'rating', 'body', 'status', 'created_at',
            ])
            ->assertJsonPath('rating', 5)
            ->assertJsonPath('body', '最高のお店でした。雰囲気もスタッフも◎');
    }

    public function test_review_requires_authentication(): void
    {
        $store = $this->createStore();

        $this->postJson("/api/stores/{$store->id}/reviews", [
            'rating' => 5,
            'body' => '十分な長さの本文サンプル',
        ])->assertStatus(401);
    }

    public function test_can_post_multiple_reviews_for_same_store(): void
    {
        // 1店舗1口コミ制限は 2026-06-12 FB で撤廃。同一店舗への再投稿を許可する。
        $user = $this->createUser();
        $store = $this->createStore();

        Review::create([
            'user_id' => $user->id,
            'store_id' => $store->id,
            'rating' => 4,
            'body' => 'first',
            'status' => 'published',
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson("/api/stores/{$store->id}/reviews", [
                'rating' => 5,
                'body' => '2回目の十分な長さの本文サンプル',
            ]);

        $response->assertStatus(201);
        $this->assertSame(2, Review::where('user_id', $user->id)->where('store_id', $store->id)->count());
    }

    public function test_invalid_tweet_url_returns_422(): void
    {
        $user = $this->createUser();
        $store = $this->createStore();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson("/api/stores/{$store->id}/reviews", [
                'rating' => 5,
                'body' => '十分な長さの本文サンプル',
                'tweet_url' => 'https://example.com/not-a-tweet',
            ]);

        $response->assertStatus(422)
            ->assertJson(['message' => 'XのポストURLを正しく貼り付けてください']);
    }

    public function test_user_can_list_own_reviews_with_paginator_flat_shape(): void
    {
        $user = $this->createUser();
        $store1 = $this->createStore();
        $store2 = $this->createStore();

        Review::create([
            'user_id' => $user->id,
            'store_id' => $store1->id,
            'rating' => 5, 'body' => 'a', 'status' => 'published',
        ]);
        Review::create([
            'user_id' => $user->id,
            'store_id' => $store2->id,
            'rating' => 4, 'body' => 'b', 'status' => 'published',
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/user/reviews');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'current_page', 'last_page', 'per_page', 'total',
                'data' => [
                    '*' => ['id', 'rating', 'body', 'status', 'store'],
                ],
            ]);

        $this->assertEquals(2, $response->json('total'));
    }

    public function test_user_can_soft_delete_own_review(): void
    {
        $user = $this->createUser();
        $store = $this->createStore();
        $review = Review::create([
            'user_id' => $user->id,
            'store_id' => $store->id,
            'rating' => 5, 'body' => 'a', 'status' => 'published',
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->deleteJson("/api/user/reviews/{$review->id}");

        $response->assertStatus(200)
            ->assertJson(['message' => '口コミを削除しました']);

        $this->assertDatabaseHas('reviews', [
            'id' => $review->id,
            'status' => 'deleted',
        ]);
    }

    public function test_user_cannot_delete_other_users_review(): void
    {
        $author = $this->createUser();
        $other = $this->createUser();
        $store = $this->createStore();

        $review = Review::create([
            'user_id' => $author->id,
            'store_id' => $store->id,
            'rating' => 5, 'body' => 'a', 'status' => 'published',
        ]);

        $response = $this->actingAs($other, 'sanctum')
            ->deleteJson("/api/user/reviews/{$review->id}");

        $response->assertStatus(403);
    }
}
