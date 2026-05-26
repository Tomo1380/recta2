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
                'generated_at',
                'kpis' => [
                    'published_stores' => ['value', 'delta_30d'],
                    'active_users_30d' => ['value', 'delta_vs_prev'],
                    'line_friends' => ['value', 'delta_30d'],
                    'reviews_today' => ['value', 'delta_vs_yesterday'],
                    'chat_today' => ['value', 'avg_tokens'],
                ],
                'chat_trend',
                'line_friend_trend',
                'stores_by_area',
                'stores_by_category',
                'recent_reviews',
                'recent_messages',
                'recent_chats',
                'secondary' => [
                    'unread_messages',
                    'pending_reviews',
                    'published_articles',
                    'fine_tuning_qa_active',
                ],
            ]);

        $data = $response->json();
        $this->assertEquals(1, $data['kpis']['published_stores']['value']);
    }

    public function test_dashboard_requires_authentication(): void
    {
        $response = $this->getJson('/api/admin/dashboard');

        $response->assertStatus(401);
    }
}
