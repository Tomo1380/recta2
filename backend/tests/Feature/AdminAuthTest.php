<?php

namespace Tests\Feature;

use App\Models\AdminUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminAuthTest extends TestCase
{
    use RefreshDatabase;

    private function createAdmin(array $overrides = []): AdminUser
    {
        return AdminUser::create(array_merge([
            'name' => 'Test Admin',
            'email' => 'test@example.com',
            'password' => 'password',
            'role' => 'super_admin',
            'status' => 'active',
        ], $overrides));
    }

    public function test_admin_can_login_with_valid_credentials(): void
    {
        $this->createAdmin();

        $response = $this->postJson('/api/admin/login', [
            'email' => 'test@example.com',
            'password' => 'password',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'token',
                'admin' => ['id', 'name', 'email', 'role', 'status'],
            ]);
    }

    public function test_admin_cannot_login_with_invalid_credentials(): void
    {
        $this->createAdmin();

        $response = $this->postJson('/api/admin/login', [
            'email' => 'test@example.com',
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(401)
            ->assertJson(['message' => 'メールアドレスまたはパスワードが正しくありません。']);
    }

    public function test_admin_cannot_login_with_nonexistent_email(): void
    {
        $response = $this->postJson('/api/admin/login', [
            'email' => 'nonexistent@example.com',
            'password' => 'password',
        ]);

        $response->assertStatus(401);
    }

    public function test_inactive_admin_cannot_login(): void
    {
        $this->createAdmin(['status' => 'inactive']);

        $response = $this->postJson('/api/admin/login', [
            'email' => 'test@example.com',
            'password' => 'password',
        ]);

        $response->assertStatus(403)
            ->assertJson(['message' => 'アカウントが無効化されています。']);
    }

    public function test_admin_can_logout(): void
    {
        $admin = $this->createAdmin();

        // Login first to get a real token
        $loginResponse = $this->postJson('/api/admin/login', [
            'email' => 'test@example.com',
            'password' => 'password',
        ]);
        $token = $loginResponse->json('token');

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/admin/logout');

        $response->assertStatus(200)
            ->assertJson(['message' => 'ログアウトしました。']);
    }

    public function test_admin_can_get_profile(): void
    {
        $admin = $this->createAdmin();

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/me');

        $response->assertStatus(200)
            ->assertJson([
                'id' => $admin->id,
                'name' => 'Test Admin',
                'email' => 'test@example.com',
                'role' => 'super_admin',
            ]);
    }

    public function test_unauthenticated_access_is_rejected(): void
    {
        $response = $this->getJson('/api/admin/me');

        $response->assertStatus(401);
    }

    public function test_login_validates_required_fields(): void
    {
        $response = $this->postJson('/api/admin/login', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email', 'password']);
    }

    public function test_login_updates_last_login_at(): void
    {
        $admin = $this->createAdmin();
        $this->assertNull($admin->last_login_at);

        $this->postJson('/api/admin/login', [
            'email' => 'test@example.com',
            'password' => 'password',
        ]);

        $admin->refresh();
        $this->assertNotNull($admin->last_login_at);
    }
}
