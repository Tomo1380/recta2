<?php

namespace Tests\Feature;

use App\Models\AdminUser;
use App\Models\Review;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminUserTest extends TestCase
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

    private function createUser(array $overrides = []): User
    {
        static $counter = 0;
        $counter++;

        return User::create(array_merge([
            'line_user_id' => 'U' . str_pad($counter, 10, '0', STR_PAD_LEFT),
            'line_display_name' => "Test User {$counter}",
            'status' => 'active',
        ], $overrides));
    }

    public function test_admin_can_list_users(): void
    {
        $this->createUser();
        $this->createUser();

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/users');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'users' => [
                    'data' => [
                        '*' => ['id', 'line_user_id', 'line_display_name', 'status'],
                    ],
                    'current_page',
                    'total',
                ],
                'line_stats' => [
                    'total_users',
                    'line_friend_count',
                ],
            ]);

        $this->assertEquals(2, $response->json('users.total'));
    }

    public function test_admin_can_show_user(): void
    {
        $user = $this->createUser(['line_display_name' => 'Show User']);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/admin/users/{$user->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'user' => ['id', 'line_user_id', 'line_display_name', 'status'],
                'line_messages',
            ])
            ->assertJsonPath('user.line_display_name', 'Show User');
    }

    public function test_admin_can_update_user_status(): void
    {
        $user = $this->createUser(['status' => 'active']);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/admin/users/{$user->id}/status", [
                'status' => 'suspended',
            ]);

        $response->assertStatus(200)
            ->assertJson(['status' => 'suspended']);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'status' => 'suspended',
        ]);
    }

    public function test_admin_can_update_user_notes(): void
    {
        $user = $this->createUser();

        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/admin/users/{$user->id}/notes", [
                'admin_notes' => 'VIP user - handle with care',
            ]);

        $response->assertStatus(200)
            ->assertJson(['admin_notes' => 'VIP user - handle with care']);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'admin_notes' => 'VIP user - handle with care',
        ]);
    }

    public function test_update_status_validates_input(): void
    {
        $user = $this->createUser();

        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/admin/users/{$user->id}/status", [
                'status' => 'invalid_status',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['status']);
    }

    public function test_user_show_includes_reviews(): void
    {
        $user = $this->createUser();
        $store = Store::create([
            'name' => 'Review Store',
            'area' => '新宿',
            'category' => 'キャバクラ',
            'publish_status' => 'published',
        ]);

        Review::create([
            'user_id' => $user->id,
            'store_id' => $store->id,
            'rating' => 5,
            'body' => 'Excellent!',
            'status' => 'published',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/admin/users/{$user->id}");

        $response->assertStatus(200);
        $this->assertNotEmpty($response->json('user.reviews'));
    }

    public function test_user_list_requires_authentication(): void
    {
        $response = $this->getJson('/api/admin/users');

        $response->assertStatus(401);
    }

    public function test_admin_can_filter_users_by_status(): void
    {
        $this->createUser(['status' => 'active']);
        $this->createUser(['status' => 'suspended']);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/users?status=suspended');

        $response->assertStatus(200);
        $this->assertEquals(1, $response->json('users.total'));
    }
}
