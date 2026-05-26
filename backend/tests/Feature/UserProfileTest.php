<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Phase 0 snapshot: エンドユーザー (LINE 認証) のプロフィール API shape を固定。
 *
 * 現状:
 *   GET /user/me     → User model 直返し (Resource なし)
 *   PUT /user/profile → User model 直返し
 *   POST /user/logout → {message: 'ログアウトしました'}
 *
 * Phase 1 で UserResource 作成 + shape 統一の対象。
 */
class UserProfileTest extends TestCase
{
    use RefreshDatabase;

    private function createUser(array $overrides = []): User
    {
        static $counter = 0;
        $counter++;
        return User::create(array_merge([
            'line_user_id' => "U-test-{$counter}",
            'line_display_name' => "User {$counter}",
            'nickname' => "ニックネーム{$counter}",
            'status' => 'active',
        ], $overrides));
    }

    public function test_me_returns_authenticated_user(): void
    {
        $user = $this->createUser();

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/user/me');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'id', 'line_user_id', 'line_display_name', 'nickname',
                'status', 'created_at', 'updated_at',
            ])
            ->assertJsonPath('id', $user->id);
    }

    public function test_me_requires_authentication(): void
    {
        $this->getJson('/api/user/me')->assertStatus(401);
    }

    public function test_user_can_update_nickname(): void
    {
        $user = $this->createUser();

        $response = $this->actingAs($user, 'sanctum')
            ->putJson('/api/user/profile', [
                'nickname' => '新しいニックネーム',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('nickname', '新しいニックネーム');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'nickname' => '新しいニックネーム',
        ]);
    }

    public function test_profile_update_validates_nickname_length(): void
    {
        $user = $this->createUser();

        $response = $this->actingAs($user, 'sanctum')
            ->putJson('/api/user/profile', [
                'nickname' => str_repeat('あ', 60), // > 50
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['nickname']);
    }

    public function test_user_logout_returns_message(): void
    {
        $user = $this->createUser();
        $token = $user->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/user/logout');

        $response->assertStatus(200)
            ->assertJson(['message' => 'ログアウトしました']);
    }
}
