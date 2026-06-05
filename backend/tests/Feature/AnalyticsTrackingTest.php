<?php

namespace Tests\Feature;

use App\Models\AdminUser;
use App\Models\LinkClick;
use App\Models\PageView;
use App\Models\Store;
use App\Models\TrackingLink;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * アクセス解析基盤（FB 2026-06-05 A）の Feature テスト。
 * PV ビーコン / 計測リンクのリダイレクト / ランキング集計 / リンク発行 を検証する。
 */
class AnalyticsTrackingTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): AdminUser
    {
        return AdminUser::create([
            'name' => 'Test Admin',
            'email' => 'admin@test.com',
            'password' => 'password',
            'role' => 'super_admin',
            'status' => 'active',
        ]);
    }

    public function test_pv_beacon_records_page_view(): void
    {
        $store = Store::create([
            'name' => 'PV Store',
            'area' => '渋谷',
            'category' => 'ラウンジ',
            'publish_status' => 'published',
        ]);

        $this->postJson('/api/track/pv', [
            'page_type' => 'store',
            'store_id' => $store->id,
            'area' => '渋谷',
        ])->assertNoContent();

        $this->assertDatabaseHas('page_views', [
            'page_type' => 'store',
            'store_id' => $store->id,
            'area' => '渋谷',
        ]);
    }

    public function test_redirect_records_click_and_redirects_to_destination(): void
    {
        $link = TrackingLink::create([
            'code' => 'abc123',
            'label' => 'X campaign',
            'target_type' => 'standalone',
            'destination_url' => 'https://line.me/R/ti/p/@example',
            'is_active' => true,
        ]);

        $this->get('/r/abc123')
            ->assertRedirect('https://line.me/R/ti/p/@example');

        $this->assertDatabaseHas('link_clicks', [
            'tracking_link_id' => $link->id,
            'source' => 'affiliate',
        ]);
    }

    public function test_unknown_code_falls_back_to_line(): void
    {
        $res = $this->get('/r/does-not-exist');
        $res->assertStatus(302);
        $this->assertStringContainsString('line.me', $res->headers->get('Location'));
        $this->assertDatabaseCount('link_clicks', 0);
    }

    public function test_overview_computes_store_ranking_and_cv(): void
    {
        $store = Store::create([
            'name' => 'Ranked Store',
            'area' => '六本木',
            'category' => 'キャバクラ',
            'publish_status' => 'published',
        ]);

        // 2 PV + 1 LINEクリック → CV率 50%
        PageView::create(['page_type' => 'store', 'store_id' => $store->id]);
        PageView::create(['page_type' => 'store', 'store_id' => $store->id]);
        LinkClick::create(['source' => 'store-detail:bottom-card', 'store_id' => $store->id]);

        $res = $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/admin/analytics/overview?days=30');

        $res->assertStatus(200)
            ->assertJsonPath('summary.pv', 2)
            ->assertJsonPath('summary.line_clicks', 1)
            ->assertJsonPath('stores.0.id', $store->id)
            ->assertJsonPath('stores.0.pv', 2)
            ->assertJsonPath('stores.0.line_clicks', 1);

        $this->assertEquals(50.0, $res->json('stores.0.cv_rate'));
    }

    public function test_breakdown_returns_per_screen_clicks_for_a_store(): void
    {
        $store = Store::create([
            'name' => 'Drilldown Store',
            'area' => '銀座',
            'category' => 'クラブ',
            'publish_status' => 'published',
        ]);

        LinkClick::create(['source' => 'store-detail:bottom-card', 'store_id' => $store->id]);
        LinkClick::create(['source' => 'store-detail:bottom-card', 'store_id' => $store->id]);
        LinkClick::create(['source' => 'fab:line', 'store_id' => $store->id]);

        $res = $this->actingAs($this->admin(), 'sanctum')
            ->getJson("/api/admin/analytics/breakdown?type=store&key={$store->id}&days=30");

        $res->assertStatus(200)
            ->assertJsonPath('type', 'store')
            ->assertJsonPath('rows.0.source', 'store-detail:bottom-card')
            ->assertJsonPath('rows.0.clicks', 2)
            ->assertJsonPath('rows.1.source', 'fab:line')
            ->assertJsonPath('rows.1.clicks', 1);
    }

    public function test_admin_can_issue_tracking_link(): void
    {
        $res = $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/admin/tracking-links', [
                'label' => 'SNS direct',
                'target_type' => 'standalone',
            ]);

        $res->assertStatus(201)
            ->assertJsonPath('label', 'SNS direct')
            ->assertJsonStructure(['id', 'code', 'public_url']);

        $this->assertStringContainsString('/r/', $res->json('public_url'));
        $this->assertDatabaseHas('tracking_links', ['label' => 'SNS direct']);
    }
}
