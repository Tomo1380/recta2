<?php

namespace Tests\Unit\Services\AiChat;

use App\Models\AiChatLimit;
use App\Models\AiChatLog;
use App\Models\User;
use App\Services\AiChat\UsageLimitGuard;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UsageLimitGuardTest extends TestCase
{
    use RefreshDatabase;

    private UsageLimitGuard $guard;

    protected function setUp(): void
    {
        parent::setUp();
        $this->guard = new UsageLimitGuard();
    }

    private function setLimits(array $values): AiChatLimit
    {
        return AiChatLimit::create(array_merge([
            'user_daily_limit' => 50,
            'user_monthly_limit' => 500,
            'ip_daily_limit' => 10,
            'global_daily_limit' => 1000,
            'limit_reached_message' => '本日の上限です',
        ], $values));
    }

    public function test_returns_null_when_below_limits(): void
    {
        $this->setLimits([]);

        $this->assertNull($this->guard->check(null, '127.0.0.1'));
    }

    public function test_returns_global_daily_when_global_count_exceeds(): void
    {
        $this->setLimits(['global_daily_limit' => 2]);

        AiChatLog::create(['ip_address' => '1.1.1.1', 'page_type' => 'top', 'user_message' => 'a', 'ai_response' => 'b', 'mode' => 'agent']);
        AiChatLog::create(['ip_address' => '2.2.2.2', 'page_type' => 'top', 'user_message' => 'a', 'ai_response' => 'b', 'mode' => 'agent']);

        $result = $this->guard->check(null, '3.3.3.3');

        $this->assertNotNull($result);
        $this->assertEquals('global_daily', $result['limit_type']);
        $this->assertEquals('本日の上限です', $result['message']);
    }

    public function test_returns_ip_daily_for_anonymous_user(): void
    {
        $this->setLimits(['ip_daily_limit' => 1]);

        AiChatLog::create(['ip_address' => '5.5.5.5', 'page_type' => 'top', 'user_message' => 'a', 'ai_response' => 'b', 'mode' => 'agent']);

        $result = $this->guard->check(null, '5.5.5.5');

        $this->assertEquals('ip_daily', $result['limit_type']);
    }

    public function test_ip_limit_does_not_block_different_ip(): void
    {
        $this->setLimits(['ip_daily_limit' => 1]);

        AiChatLog::create(['ip_address' => '5.5.5.5', 'page_type' => 'top', 'user_message' => 'a', 'ai_response' => 'b', 'mode' => 'agent']);

        $this->assertNull($this->guard->check(null, '6.6.6.6'));
    }

    public function test_returns_user_daily_for_authenticated_user(): void
    {
        $this->setLimits(['user_daily_limit' => 1]);

        $user = User::create([
            'line_user_id' => 'U-test',
            'line_display_name' => 'test',
            'status' => 'active',
        ]);

        AiChatLog::create(['user_id' => $user->id, 'ip_address' => '5.5.5.5', 'page_type' => 'top', 'user_message' => 'a', 'ai_response' => 'b', 'mode' => 'agent']);

        $result = $this->guard->check($user, '5.5.5.5');

        $this->assertEquals('user_daily', $result['limit_type']);
    }

    public function test_user_limit_does_not_block_anonymous(): void
    {
        $this->setLimits(['user_daily_limit' => 1, 'ip_daily_limit' => 100]);

        $user = User::create([
            'line_user_id' => 'U-test',
            'line_display_name' => 'test',
            'status' => 'active',
        ]);

        AiChatLog::create(['user_id' => $user->id, 'ip_address' => '5.5.5.5', 'page_type' => 'top', 'user_message' => 'a', 'ai_response' => 'b', 'mode' => 'agent']);

        // 別の anonymous request は user_daily に引っかからない
        $this->assertNull($this->guard->check(null, '5.5.5.5'));
    }

    public function test_returns_user_monthly_when_monthly_quota_exceeded(): void
    {
        $this->setLimits(['user_daily_limit' => 100, 'user_monthly_limit' => 2]);

        $user = User::create([
            'line_user_id' => 'U-month',
            'line_display_name' => 'monthly',
            'status' => 'active',
        ]);

        // 月内で 2 件
        AiChatLog::create(['user_id' => $user->id, 'ip_address' => '5.5.5.5', 'page_type' => 'top', 'user_message' => 'a', 'ai_response' => 'b', 'mode' => 'agent', 'created_at' => now()->startOfMonth()]);
        AiChatLog::create(['user_id' => $user->id, 'ip_address' => '5.5.5.5', 'page_type' => 'top', 'user_message' => 'a', 'ai_response' => 'b', 'mode' => 'agent', 'created_at' => now()->startOfMonth()->addHours(2)]);

        $result = $this->guard->check($user, '5.5.5.5');

        $this->assertEquals('user_monthly', $result['limit_type']);
    }
}
