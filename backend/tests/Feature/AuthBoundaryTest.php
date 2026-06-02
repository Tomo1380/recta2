<?php

namespace Tests\Feature;

use App\Models\AdminUser;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * admin / user の認証境界テスト。
 *
 * AdminUser と User は同一 personal_access_tokens テーブルにトークンを発行する。
 * `auth:sanctum` だけだと LINE ログインの User トークンで管理画面 API を叩けてしまう
 * 権限昇格があったため、user.type middleware で境界を強制している。本テストは
 * 実トークン (Bearer) を使ってクロス認証が 403 になることを保証する。
 */
class AuthBoundaryTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): AdminUser
    {
        return AdminUser::create([
            'name' => 'Boundary Admin',
            'email' => 'boundary-admin@test.com',
            'password' => 'password',
            'role' => 'super_admin',
            'status' => 'active',
        ]);
    }

    private function user(): User
    {
        return User::create([
            'line_user_id' => 'U' . str_pad((string) random_int(1, 9999999999), 10, '0', STR_PAD_LEFT),
            'line_display_name' => 'Boundary User',
            'status' => 'active',
        ]);
    }

    public function test_user_token_cannot_access_admin_api(): void
    {
        $token = $this->user()->createToken('line-auth', ['user'])->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/admin/dashboard')
            ->assertForbidden();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/admin/users')
            ->assertForbidden();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/admin/stores', [])
            ->assertForbidden();
    }

    public function test_admin_token_can_access_admin_api(): void
    {
        $token = $this->admin()->createToken('admin-token', ['admin'])->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/admin/dashboard')
            ->assertOk();
    }

    public function test_admin_token_cannot_access_user_api(): void
    {
        $token = $this->admin()->createToken('admin-token', ['admin'])->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/user/me')
            ->assertForbidden();
    }

    public function test_user_token_can_access_user_api(): void
    {
        $token = $this->user()->createToken('line-auth', ['user'])->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/user/me')
            ->assertOk();
    }
}
