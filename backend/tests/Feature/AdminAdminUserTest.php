<?php

namespace Tests\Feature;

use App\Models\AdminUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminAdminUserTest extends TestCase
{
    use RefreshDatabase;

    private AdminUser $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = AdminUser::create([
            'name' => 'Super Admin',
            'email' => 'super@test.com',
            'password' => 'password',
            'role' => 'super_admin',
            'status' => 'active',
        ]);
    }

    public function test_admin_can_list_admin_users(): void
    {
        AdminUser::create([
            'name' => 'Another Admin',
            'email' => 'another@test.com',
            'password' => 'password',
            'role' => 'admin',
            'status' => 'active',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/admin-users');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'email', 'role', 'status'],
                ],
                'current_page',
                'total',
            ]);

        // The super admin + another admin
        $this->assertEquals(2, $response->json('total'));
    }

    public function test_admin_can_create_admin_user(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/admin-users', [
                'name' => 'New Admin',
                'email' => 'newadmin@test.com',
                'password' => 'securepassword',
                'role' => 'admin',
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'name' => 'New Admin',
                'email' => 'newadmin@test.com',
                'role' => 'admin',
            ]);

        $this->assertDatabaseHas('admin_users', [
            'email' => 'newadmin@test.com',
            'role' => 'admin',
        ]);
    }

    public function test_admin_can_update_admin_user(): void
    {
        $target = AdminUser::create([
            'name' => 'Target Admin',
            'email' => 'target@test.com',
            'password' => 'password',
            'role' => 'admin',
            'status' => 'active',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/admin/admin-users/{$target->id}", [
                'name' => 'Updated Admin',
                'role' => 'super_admin',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'name' => 'Updated Admin',
                'role' => 'super_admin',
            ]);
    }

    public function test_admin_can_reset_admin_user_password(): void
    {
        $target = AdminUser::create([
            'name' => 'Target Admin',
            'email' => 'target@test.com',
            'password' => 'oldpassword',
            'role' => 'admin',
            'status' => 'active',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/admin/admin-users/{$target->id}/reset-password", [
                'password' => 'newpassword123',
            ]);

        $response->assertStatus(200)
            ->assertJson(['message' => 'パスワードをリセットしました。']);

        // Verify new password works
        $loginResponse = $this->postJson('/api/admin/login', [
            'email' => 'target@test.com',
            'password' => 'newpassword123',
        ]);
        $loginResponse->assertStatus(200);
    }

    public function test_admin_can_delete_admin_user(): void
    {
        $target = AdminUser::create([
            'name' => 'To Delete',
            'email' => 'delete@test.com',
            'password' => 'password',
            'role' => 'admin',
            'status' => 'active',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/admin/admin-users/{$target->id}");

        $response->assertStatus(204);
        $this->assertDatabaseMissing('admin_users', ['id' => $target->id]);
    }

    public function test_create_admin_user_validates_required_fields(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/admin-users', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'email', 'password']);
    }

    public function test_create_admin_user_validates_unique_email(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/admin-users', [
                'name' => 'Duplicate',
                'email' => 'super@test.com', // Already used by $this->admin
                'password' => 'password123',
                'role' => 'admin',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_create_admin_user_validates_password_length(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/admin-users', [
                'name' => 'Short Pass',
                'email' => 'short@test.com',
                'password' => 'short', // min:8
                'role' => 'admin',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }

    public function test_update_admin_user_can_change_status(): void
    {
        $target = AdminUser::create([
            'name' => 'Target',
            'email' => 'target@test.com',
            'password' => 'password',
            'role' => 'admin',
            'status' => 'active',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/admin/admin-users/{$target->id}", [
                'status' => 'inactive',
            ]);

        $response->assertStatus(200)
            ->assertJson(['status' => 'inactive']);
    }

    public function test_admin_user_list_requires_authentication(): void
    {
        $response = $this->getJson('/api/admin/admin-users');

        $response->assertStatus(401);
    }
}
