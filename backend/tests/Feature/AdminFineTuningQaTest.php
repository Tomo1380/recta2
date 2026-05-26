<?php

namespace Tests\Feature;

use App\Models\AdminUser;
use App\Models\FineTuningQa;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Phase 0 snapshot: 管理画面の Fine-tuning Q&A CRUD のレスポンス shape を固定。
 *
 * 現状の独自 shape:
 *   index → { items: paginator (flat), status_counts: {...}, categories: [...] }
 *   show  → model 直 (no Resource)
 *   destroy → { message: "archived" }  (※ soft-delete: status=archived)
 *
 * Phase 1 で Resource 化と shape 統一の対象。
 */
class AdminFineTuningQaTest extends TestCase
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

    private function createQa(array $overrides = []): FineTuningQa
    {
        static $counter = 0;
        $counter++;
        return FineTuningQa::create(array_merge([
            'category' => '基本',
            'question' => "質問 {$counter}",
            'answer' => "回答 {$counter}",
            'tags' => ['初心者'],
            'source' => 'manual',
            'status' => FineTuningQa::STATUS_ACTIVE,
        ], $overrides));
    }

    public function test_admin_can_list_qa_with_items_wrapper(): void
    {
        $this->createQa();
        $this->createQa(['status' => FineTuningQa::STATUS_DRAFT]);
        $this->createQa(['status' => FineTuningQa::STATUS_ARCHIVED]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/fine-tuning/qa');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'items' => [
                    'current_page',
                    'last_page',
                    'per_page',
                    'total',
                    'data' => [
                        '*' => [
                            'id', 'category', 'question', 'answer', 'tags',
                            'source', 'status', 'created_at', 'updated_at',
                        ],
                    ],
                ],
                'status_counts' => ['active', 'draft', 'archived'],
                'categories',
            ]);

        $this->assertEquals(1, $response->json('status_counts.active'));
        $this->assertEquals(1, $response->json('status_counts.draft'));
        $this->assertEquals(1, $response->json('status_counts.archived'));
    }

    public function test_admin_can_filter_qa_by_status(): void
    {
        $this->createQa(['status' => FineTuningQa::STATUS_ACTIVE]);
        $this->createQa(['status' => FineTuningQa::STATUS_DRAFT]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/fine-tuning/qa?status=draft');

        $response->assertStatus(200);
        $this->assertEquals(1, $response->json('items.total'));
    }

    public function test_admin_can_search_qa_by_keyword(): void
    {
        $this->createQa(['question' => '体入はいつでもできますか']);
        $this->createQa(['question' => '時給はいくらですか']);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/fine-tuning/qa?q=' . urlencode('体入'));

        $response->assertStatus(200);
        $this->assertEquals(1, $response->json('items.total'));
    }

    public function test_admin_can_show_qa(): void
    {
        $qa = $this->createQa();

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/admin/fine-tuning/qa/{$qa->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'id', 'category', 'question', 'answer', 'tags',
                'source', 'status', 'created_at', 'updated_at',
            ])
            ->assertJsonPath('id', $qa->id);
    }

    public function test_admin_can_create_qa(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/fine-tuning/qa', [
                'category' => '基本',
                'question' => '新しい質問',
                'answer' => '新しい回答',
                'tags' => ['初心者'],
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('question', '新しい質問')
            ->assertJsonPath('status', FineTuningQa::STATUS_ACTIVE);
    }

    public function test_admin_can_update_qa(): void
    {
        $qa = $this->createQa();

        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/admin/fine-tuning/qa/{$qa->id}", [
                'answer' => '更新後の回答',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('answer', '更新後の回答');
    }

    public function test_admin_destroy_archives_qa_not_deletes(): void
    {
        $qa = $this->createQa();

        $response = $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/admin/fine-tuning/qa/{$qa->id}");

        $response->assertStatus(200)
            ->assertJson(['message' => 'archived']);

        // soft-delete: row は残ってstatusだけ archived に
        $this->assertDatabaseHas('fine_tuning_qa', [
            'id' => $qa->id,
            'status' => FineTuningQa::STATUS_ARCHIVED,
        ]);
    }

    public function test_qa_list_requires_authentication(): void
    {
        $this->getJson('/api/admin/fine-tuning/qa')->assertStatus(401);
    }
}
