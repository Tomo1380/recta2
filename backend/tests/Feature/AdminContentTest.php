<?php

namespace Tests\Feature;

use App\Models\AdminUser;
use App\Models\Consultation;
use App\Models\PickupShop;
use App\Models\SiteSetting;
use App\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminContentTest extends TestCase
{
    use RefreshDatabase;

    private AdminUser $admin;
    private Store $store;

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

        $this->store = Store::create([
            'name' => 'Test Store',
            'area' => '新宿',
            'category' => 'キャバクラ',
            'publish_status' => 'published',
        ]);
    }

    // ========== Pickup Shops ==========

    public function test_admin_can_list_pickup_shops(): void
    {
        PickupShop::create([
            'store_id' => $this->store->id,
            'sort_order' => 0,
            'is_pr' => true,
            'visible' => true,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/pickup-shops');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json());
    }

    public function test_admin_can_create_pickup_shop(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/pickup-shops', [
                'store_id' => $this->store->id,
                'sort_order' => 1,
                'is_pr' => true,
                'visible' => true,
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'store_id' => $this->store->id,
                'is_pr' => true,
            ]);
    }

    public function test_admin_can_update_pickup_shop(): void
    {
        $pickup = PickupShop::create([
            'store_id' => $this->store->id,
            'is_pr' => false,
            'visible' => true,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/admin/pickup-shops/{$pickup->id}", [
                'is_pr' => true,
                'visible' => false,
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'is_pr' => true,
                'visible' => false,
            ]);
    }

    public function test_admin_can_delete_pickup_shop(): void
    {
        $pickup = PickupShop::create([
            'store_id' => $this->store->id,
            'visible' => true,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/admin/pickup-shops/{$pickup->id}");

        $response->assertStatus(204);
        $this->assertDatabaseMissing('pickup_shops', ['id' => $pickup->id]);
    }

    public function test_admin_can_reorder_pickup_shops(): void
    {
        $p1 = PickupShop::create(['store_id' => $this->store->id, 'sort_order' => 0]);

        $store2 = Store::create([
            'name' => 'Store 2',
            'area' => '六本木',
            'category' => 'ラウンジ',
            'publish_status' => 'published',
        ]);
        $p2 = PickupShop::create(['store_id' => $store2->id, 'sort_order' => 1]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/pickup-shops/reorder', [
                'ids' => [$p2->id, $p1->id],
            ]);

        $response->assertStatus(200)
            ->assertJson(['message' => 'OK']);

        $this->assertDatabaseHas('pickup_shops', ['id' => $p2->id, 'sort_order' => 0]);
        $this->assertDatabaseHas('pickup_shops', ['id' => $p1->id, 'sort_order' => 1]);
    }

    public function test_create_pickup_shop_validates_store_id(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/pickup-shops', [
                'store_id' => 99999, // non-existent
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['store_id']);
    }

    // ========== Consultations ==========

    public function test_admin_can_list_consultations(): void
    {
        Consultation::create([
            'question' => '未経験でも大丈夫ですか？',
            'tag' => '初心者',
            'count' => 10,
            'visible' => true,
            'sort_order' => 0,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/consultations');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json());
    }

    public function test_admin_can_create_consultation(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/consultations', [
                'question' => '送りはありますか？',
                'tag' => '待遇',
                'count' => 5,
                'visible' => true,
                'sort_order' => 0,
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'question' => '送りはありますか？',
                'tag' => '待遇',
            ]);
    }

    public function test_admin_can_update_consultation(): void
    {
        $consultation = Consultation::create([
            'question' => 'Original question',
            'tag' => 'test',
            'visible' => true,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/admin/consultations/{$consultation->id}", [
                'question' => 'Updated question',
                'visible' => false,
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'question' => 'Updated question',
                'visible' => false,
            ]);
    }

    public function test_admin_can_delete_consultation(): void
    {
        $consultation = Consultation::create([
            'question' => 'To delete',
            'tag' => 'test',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/admin/consultations/{$consultation->id}");

        $response->assertStatus(204);
        $this->assertDatabaseMissing('consultations', ['id' => $consultation->id]);
    }

    // ========== Banner Settings ==========

    public function test_admin_can_get_banner_settings(): void
    {
        SiteSetting::create(['key' => 'hero_tagline', 'value' => 'Welcome']);
        SiteSetting::create(['key' => 'hero_subtitle', 'value' => 'Find your job']);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/banner-settings');

        $response->assertStatus(200)
            ->assertJson([
                'hero_tagline' => 'Welcome',
                'hero_subtitle' => 'Find your job',
            ]);
    }

    public function test_admin_can_update_banner_settings(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson('/api/admin/banner-settings', [
                'hero_tagline' => 'Updated Tagline',
                'hero_subtitle' => 'Updated Subtitle',
                'hero_badge' => 'New Badge',
                'hero_ai_label' => 'AI Label',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'hero_tagline' => 'Updated Tagline',
                'hero_subtitle' => 'Updated Subtitle',
                'hero_badge' => 'New Badge',
                'hero_ai_label' => 'AI Label',
            ]);

        $this->assertDatabaseHas('site_settings', [
            'key' => 'hero_tagline',
            'value' => 'Updated Tagline',
        ]);
    }

    public function test_banner_settings_returns_null_for_missing_keys(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/banner-settings');

        $response->assertStatus(200)
            ->assertJson([
                'hero_tagline' => null,
                'hero_subtitle' => null,
                'hero_badge' => null,
                'hero_ai_label' => null,
            ]);
    }

    public function test_content_endpoints_require_authentication(): void
    {
        $this->getJson('/api/admin/pickup-shops')->assertStatus(401);
        $this->getJson('/api/admin/consultations')->assertStatus(401);
        $this->getJson('/api/admin/banner-settings')->assertStatus(401);
    }
}
