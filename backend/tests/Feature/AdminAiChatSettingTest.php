<?php

namespace Tests\Feature;

use App\Models\AdminUser;
use App\Models\AiChatLimit;
use App\Models\AiChatSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminAiChatSettingTest extends TestCase
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

    private function createSetting(array $overrides = []): AiChatSetting
    {
        return AiChatSetting::create(array_merge([
            'page_type' => 'top',
            'enabled' => true,
            'system_prompt' => 'You are a helpful assistant.',
            'tone' => 'friendly',
            'suggest_buttons' => ['条件で探したい', '私の適正時給診断'],
        ], $overrides));
    }

    public function test_admin_can_list_ai_chat_settings(): void
    {
        $this->createSetting(['page_type' => 'top']);
        $this->createSetting(['page_type' => 'list']);
        $this->createSetting(['page_type' => 'detail']);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/ai-chat/settings');

        $response->assertStatus(200);
        $this->assertCount(3, $response->json());
    }

    public function test_admin_can_update_ai_chat_setting(): void
    {
        $setting = $this->createSetting();

        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/admin/ai-chat/settings/{$setting->id}", [
                'enabled' => false,
                'system_prompt' => 'Updated prompt',
                'tone' => 'casual',
                'suggest_buttons' => ['新しいボタン'],
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'enabled' => false,
                'system_prompt' => 'Updated prompt',
                'tone' => 'casual',
            ]);

        $setting->refresh();
        $this->assertFalse($setting->enabled);
        $this->assertEquals('Updated prompt', $setting->system_prompt);
    }

    public function test_admin_can_get_ai_chat_stats(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/ai-chat/stats');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'daily_stats',
                'top_users',
                'monthly_total',
                'monthly_tokens',
                'mode_stats',
                'mode_daily_stats',
            ]);
    }

    public function test_admin_can_get_limits(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/ai-chat/limits');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'user_daily_limit',
                'user_monthly_limit',
                'ip_daily_limit',
                'global_daily_limit',
                'limit_reached_message',
            ]);
    }

    public function test_admin_can_update_limits(): void
    {
        // Ensure limits row exists
        AiChatLimit::current();

        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson('/api/admin/ai-chat/limits', [
                'user_daily_limit' => 100,
                'ip_daily_limit' => 20,
                'limit_reached_message' => 'カスタムメッセージ',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'user_daily_limit' => 100,
                'ip_daily_limit' => 20,
                'limit_reached_message' => 'カスタムメッセージ',
            ]);
    }

    public function test_update_limits_validates_input(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson('/api/admin/ai-chat/limits', [
                'user_daily_limit' => 0, // min:1
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['user_daily_limit']);
    }

    public function test_update_setting_validates_tone(): void
    {
        $setting = $this->createSetting();

        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/admin/ai-chat/settings/{$setting->id}", [
                'tone' => 'invalid_tone',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['tone']);
    }

    public function test_ai_chat_settings_require_authentication(): void
    {
        $response = $this->getJson('/api/admin/ai-chat/settings');

        $response->assertStatus(401);
    }
}
