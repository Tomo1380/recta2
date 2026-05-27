<?php

namespace Tests\Feature;

use App\Models\AdminUser;
use App\Models\IndustryKnowledge;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Phase 0 snapshot: 業界ナレッジ admin CRUD のレスポンス shape を固定。
 *
 * 現状: index / show / update は model 直 return (Resource なし)。
 * Phase 1 で Resource 化と shape 統一の対象。
 */
class AdminIndustryKnowledgeTest extends TestCase
{
    use RefreshDatabase;

    private AdminUser $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = AdminUser::create([
            'name' => 'Admin',
            'email' => 'admin@test.com',
            'password' => 'password',
            'role' => 'super_admin',
            'status' => 'active',
        ]);
    }

    private function createKnowledge(array $overrides = []): IndustryKnowledge
    {
        static $counter = 0;
        $counter++;
        return IndustryKnowledge::create(array_merge([
            'category' => '基本用語',
            'slug' => "knowledge-{$counter}",
            'title' => "ナレッジ {$counter}",
            'keywords' => ['体入', '初心者'],
            'content' => '本文サンプル',
            'is_active' => true,
            'sort_order' => $counter,
        ], $overrides));
    }

    public function test_admin_can_list_industry_knowledge_as_flat_array(): void
    {
        $this->createKnowledge();
        $this->createKnowledge();

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/ai-chat/knowledge');

        // 現状: 配列直返し (paginator なし)
        $response->assertStatus(200)
            ->assertJsonStructure([
                '*' => [
                    'id', 'category', 'slug', 'title', 'keywords',
                    'content', 'is_active', 'sort_order',
                    'created_at', 'updated_at',
                ],
            ]);

        $this->assertCount(2, $response->json());
    }

    public function test_admin_can_create_industry_knowledge(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/ai-chat/knowledge', [
                'category' => '体入',
                'title' => '体入とは',
                'keywords' => ['体入', '初心者'],
                'content' => '体入の説明文',
                'is_active' => true,
            ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'id', 'category', 'slug', 'title', 'keywords',
                'content', 'is_active', 'sort_order',
            ])
            ->assertJsonPath('title', '体入とは');
    }

    public function test_create_validates_required_fields(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/ai-chat/knowledge', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['category', 'title', 'keywords', 'content']);
    }

    public function test_admin_can_update_industry_knowledge(): void
    {
        $kn = $this->createKnowledge();

        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/admin/ai-chat/knowledge/{$kn->id}", [
                'title' => '更新後タイトル',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('title', '更新後タイトル');
    }

    public function test_admin_can_delete_industry_knowledge(): void
    {
        $kn = $this->createKnowledge();

        $response = $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/admin/ai-chat/knowledge/{$kn->id}");

        $response->assertStatus(204);
        $this->assertDatabaseMissing('industry_knowledges', ['id' => $kn->id]);
    }

    public function test_admin_can_reorder_industry_knowledge(): void
    {
        $a = $this->createKnowledge();
        $b = $this->createKnowledge();
        $c = $this->createKnowledge();

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/ai-chat/knowledge/reorder', [
                'ids' => [$c->id, $a->id, $b->id],
            ]);

        $response->assertStatus(200)
            ->assertJson(['message' => 'OK']);

        $this->assertEquals(0, $c->fresh()->sort_order);
        $this->assertEquals(1, $a->fresh()->sort_order);
        $this->assertEquals(2, $b->fresh()->sort_order);
    }

    public function test_knowledge_list_requires_authentication(): void
    {
        $this->getJson('/api/admin/ai-chat/knowledge')->assertStatus(401);
    }
}
