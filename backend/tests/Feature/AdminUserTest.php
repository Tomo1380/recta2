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

        // 一覧は LINE トーク主役。createUser はトーク無し(=ログインのみ)なので
        // mode=login_only で取得する。
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/users?mode=login_only');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'people' => [
                    'data' => [
                        '*' => ['line_user_id', 'name', 'has_account', 'messages_count', 'kind'],
                    ],
                    'current_page',
                    'total',
                ],
                'stats' => [
                    'talk_count',
                    'login_only_count',
                    'total_users',
                ],
            ]);

        $this->assertEquals(2, $response->json('people.total'));
        $this->assertSame('login_only', $response->json('people.data.0.kind'));
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

    public function test_people_list_is_talk_first_and_mode_filter_works(): void
    {
        // トーク無しのログインユーザー 2 人
        $this->createUser();
        $this->createUser();
        // トークありの友だち 1 人 (User 未連携)
        \App\Models\LineFriend::create([
            'line_user_id' => 'U_talk_only',
            'display_name' => 'トーク太郎',
            'is_following' => true,
            'followed_at' => now(),
        ]);

        // 既定 (talk) はトーク相手のみ → 友だち 1 人だけ
        $talk = $this->actingAs($this->admin, 'sanctum')->getJson('/api/admin/users');
        $this->assertEquals(1, $talk->json('people.total'));
        $this->assertSame('U_talk_only', $talk->json('people.data.0.line_user_id'));

        // login_only はログインのみ 2 人
        $login = $this->actingAs($this->admin, 'sanctum')->getJson('/api/admin/users?mode=login_only');
        $this->assertEquals(2, $login->json('people.total'));

        // all は両方 = 3 人
        $all = $this->actingAs($this->admin, 'sanctum')->getJson('/api/admin/users?mode=all');
        $this->assertEquals(3, $all->json('people.total'));
    }
}
