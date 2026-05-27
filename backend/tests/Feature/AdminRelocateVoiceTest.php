<?php

namespace Tests\Feature;

use App\Models\AdminUser;
use App\Models\RelocateVoice;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Phase 0 snapshot: 上京した先輩の声 admin CRUD と public 取得 endpoint の
 * レスポンス shape を固定。Phase 1 で Resource 化の対象。
 */
class AdminRelocateVoiceTest extends TestCase
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

    private function createVoice(array $overrides = []): RelocateVoice
    {
        static $counter = 0;
        $counter++;
        return RelocateVoice::create(array_merge([
            'area_from' => '北海道',
            'area_to' => '新宿',
            'body' => "声の本文 {$counter}",
            'visible' => true,
            'display_order' => $counter,
        ], $overrides));
    }

    public function test_admin_can_list_relocate_voices(): void
    {
        $this->createVoice();
        $this->createVoice(['visible' => false]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/relocate-voices');

        $response->assertStatus(200)
            ->assertJsonStructure([
                '*' => [
                    'id', 'area_from', 'area_to', 'body',
                    'visible', 'display_order',
                    'created_at', 'updated_at',
                ],
            ]);

        $this->assertCount(2, $response->json());
    }

    public function test_admin_can_create_relocate_voice(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/relocate-voices', [
                'area_from' => '福岡',
                'area_to' => '六本木',
                'body' => '上京して頑張ってます',
                'visible' => true,
                'display_order' => 0,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('area_from', '福岡')
            ->assertJsonPath('visible', true);
    }

    public function test_admin_can_update_relocate_voice(): void
    {
        $voice = $this->createVoice();

        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/admin/relocate-voices/{$voice->id}", [
                'body' => '更新後の本文',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('body', '更新後の本文');
    }

    public function test_admin_can_delete_relocate_voice(): void
    {
        $voice = $this->createVoice();

        $response = $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/admin/relocate-voices/{$voice->id}");

        $response->assertStatus(204);
        $this->assertDatabaseMissing('relocate_voices', ['id' => $voice->id]);
    }

    public function test_admin_can_reorder_relocate_voices(): void
    {
        $a = $this->createVoice();
        $b = $this->createVoice();

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/relocate-voices/reorder', [
                'ids' => [$b->id, $a->id],
            ]);

        $response->assertStatus(200)->assertJson(['message' => 'OK']);
        $this->assertEquals(0, $b->fresh()->display_order);
        $this->assertEquals(1, $a->fresh()->display_order);
    }

    public function test_public_relocate_voices_returns_visible_only(): void
    {
        $this->createVoice(['visible' => true]);
        $this->createVoice(['visible' => false]);

        $response = $this->getJson('/api/relocate-voices');

        $response->assertStatus(200)
            ->assertJsonStructure([
                '*' => ['id', 'area_from', 'area_to', 'body'],
            ]);

        $this->assertCount(1, $response->json());
    }

    public function test_voice_list_requires_authentication(): void
    {
        $this->getJson('/api/admin/relocate-voices')->assertStatus(401);
    }
}
