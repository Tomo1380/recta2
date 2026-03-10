<?php

namespace Tests\Feature;

use App\Models\AdminUser;
use App\Models\Review;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminDashboardTest extends TestCase
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

    public function test_admin_can_get_dashboard_data(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/dashboard');

        $response->assertStatus(200);
    }

    public function test_dashboard_returns_correct_structure(): void
    {
        // Create test data
        $user = User::create([
            'line_user_id' => 'U1234567890',
            'line_display_name' => 'Test User',
            'status' => 'active',
        ]);

        $store = Store::create([
            'name' => 'Test Store',
            'area' => '新宿',
            'category' => 'キャバクラ',
            'publish_status' => 'published',
        ]);

        Review::create([
            'user_id' => $user->id,
            'store_id' => $store->id,
            'rating' => 4,
            'body' => 'Great place!',
            'status' => 'published',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/dashboard');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'stats' => [
                    'user_count',
                    'store_count',
                    'review_count',
                    'today_chat_count',
                ],
                'user_trend',
                'chat_trend',
                'line_stats',
                'recent_messages',
                'activity_logs',
            ]);

        // Verify stats values
        $data = $response->json();
        $this->assertEquals(1, $data['stats']['user_count']);
        $this->assertEquals(1, $data['stats']['store_count']);
        $this->assertEquals(1, $data['stats']['review_count']);
    }

    public function test_dashboard_requires_authentication(): void
    {
        $response = $this->getJson('/api/admin/dashboard');

        $response->assertStatus(401);
    }
}
