<?php

namespace Tests\Feature;

use App\Models\AdminUser;
use App\Models\Area;
use App\Models\Category;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminAreaCategoryTest extends TestCase
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

    // ========== Areas ==========

    public function test_admin_can_list_areas(): void
    {
        Area::create(['name' => '新宿', 'slug' => 'shinjuku', 'sort_order' => 0]);
        Area::create(['name' => '六本木', 'slug' => 'roppongi', 'sort_order' => 1]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/areas');

        $response->assertStatus(200);
        $this->assertCount(2, $response->json());
    }

    public function test_admin_can_create_area(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/areas', [
                'name' => '銀座',
                'slug' => 'ginza',
                'tier' => 'gold',
                'visible' => true,
                'sort_order' => 0,
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'name' => '銀座',
                'slug' => 'ginza',
            ]);

        $this->assertDatabaseHas('areas', ['name' => '銀座', 'slug' => 'ginza']);
    }

    public function test_admin_can_update_area(): void
    {
        $area = Area::create(['name' => '新宿', 'slug' => 'shinjuku']);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/admin/areas/{$area->id}", [
                'name' => '新宿エリア',
                'tier' => 'gold',
            ]);

        $response->assertStatus(200)
            ->assertJson(['name' => '新宿エリア']);
    }

    public function test_admin_can_delete_area(): void
    {
        $area = Area::create(['name' => '渋谷', 'slug' => 'shibuya']);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/admin/areas/{$area->id}");

        $response->assertStatus(204);
        $this->assertDatabaseMissing('areas', ['id' => $area->id]);
    }

    public function test_admin_can_reorder_areas(): void
    {
        $area1 = Area::create(['name' => 'A', 'slug' => 'a', 'sort_order' => 0]);
        $area2 = Area::create(['name' => 'B', 'slug' => 'b', 'sort_order' => 1]);
        $area3 = Area::create(['name' => 'C', 'slug' => 'c', 'sort_order' => 2]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/areas/reorder', [
                'ids' => [$area3->id, $area1->id, $area2->id],
            ]);

        $response->assertStatus(200)
            ->assertJson(['message' => 'OK']);

        $this->assertDatabaseHas('areas', ['id' => $area3->id, 'sort_order' => 0]);
        $this->assertDatabaseHas('areas', ['id' => $area1->id, 'sort_order' => 1]);
        $this->assertDatabaseHas('areas', ['id' => $area2->id, 'sort_order' => 2]);
    }

    public function test_create_area_validates_required_fields(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/areas', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'slug']);
    }

    public function test_create_area_validates_unique_slug(): void
    {
        Area::create(['name' => '新宿', 'slug' => 'shinjuku']);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/areas', [
                'name' => '新宿2',
                'slug' => 'shinjuku', // duplicate
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['slug']);
    }

    // ========== Categories ==========

    public function test_admin_can_list_categories(): void
    {
        Category::create(['name' => 'キャバクラ', 'slug' => 'cabaret', 'sort_order' => 0]);
        Category::create(['name' => 'ラウンジ', 'slug' => 'lounge', 'sort_order' => 1]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/categories');

        $response->assertStatus(200);
        $this->assertCount(2, $response->json());
    }

    public function test_admin_can_create_category(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/categories', [
                'name' => 'ガールズバー',
                'slug' => 'girls-bar',
                'color' => '#ff6699',
                'visible' => true,
                'sort_order' => 0,
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'name' => 'ガールズバー',
                'slug' => 'girls-bar',
                'color' => '#ff6699',
            ]);

        $this->assertDatabaseHas('categories', ['slug' => 'girls-bar']);
    }

    public function test_admin_can_update_category(): void
    {
        $category = Category::create([
            'name' => 'キャバクラ',
            'slug' => 'cabaret',
            'color' => '#000000',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/admin/categories/{$category->id}", [
                'color' => '#ff0000',
            ]);

        $response->assertStatus(200)
            ->assertJson(['color' => '#ff0000']);
    }

    public function test_admin_can_delete_category(): void
    {
        $category = Category::create(['name' => 'Test', 'slug' => 'test']);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/admin/categories/{$category->id}");

        $response->assertStatus(204);
        $this->assertDatabaseMissing('categories', ['id' => $category->id]);
    }

    public function test_admin_can_reorder_categories(): void
    {
        $cat1 = Category::create(['name' => 'A', 'slug' => 'a', 'sort_order' => 0]);
        $cat2 = Category::create(['name' => 'B', 'slug' => 'b', 'sort_order' => 1]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/categories/reorder', [
                'ids' => [$cat2->id, $cat1->id],
            ]);

        $response->assertStatus(200)
            ->assertJson(['message' => 'OK']);

        $this->assertDatabaseHas('categories', ['id' => $cat2->id, 'sort_order' => 0]);
        $this->assertDatabaseHas('categories', ['id' => $cat1->id, 'sort_order' => 1]);
    }

    public function test_area_list_requires_authentication(): void
    {
        $response = $this->getJson('/api/admin/areas');

        $response->assertStatus(401);
    }

    public function test_category_list_requires_authentication(): void
    {
        $response = $this->getJson('/api/admin/categories');

        $response->assertStatus(401);
    }
}
