<?php

namespace Tests\Feature;

use App\Models\AdminUser;
use App\Models\LineFriend;
use App\Models\LineMessage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * LINE 友だち統合 (2026-06-06 FB) の管理 API を検証する。
 *  - ユーザー一覧に「アプリ User 未連携の友だち」が含まれる
 *  - line_user_id 基準でトーク (messages) が取れる
 *  - 管理用の表示名 (admin_name) を編集できる (LINE 本名 display_name は維持)
 */
class AdminLineFriendTest extends TestCase
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

    public function test_talk_list_includes_unlinked_friend_as_a_person_row(): void
    {
        // アプリ User 未連携 (LINEログインせずメッセージしただけ) の友だちも
        // トーク主役の一覧に「人」として 1 行で出る。
        LineFriend::create([
            'line_user_id' => 'U_unlinked_1',
            'display_name' => 'なまえ太郎',
            'is_following' => true,
            'followed_at' => now(),
        ]);

        $res = $this->actingAs($this->admin, 'sanctum')->getJson('/api/admin/users');

        $res->assertOk();
        $people = collect($res->json('people.data'));
        $row = $people->firstWhere('line_user_id', 'U_unlinked_1');
        $this->assertNotNull($row);
        $this->assertSame('なまえ太郎', $row['name']);
        $this->assertFalse($row['has_account']); // LINEログイン未連携
        $this->assertSame(1, $res->json('stats.talk_count'));
    }

    public function test_messages_thread_works_by_line_user_id_without_app_user(): void
    {
        LineFriend::create(['line_user_id' => 'U_unlinked_2', 'is_following' => true]);
        LineMessage::create([
            'line_user_id' => 'U_unlinked_2',
            'user_id' => null,
            'direction' => 'inbound',
            'message_type' => 'text',
            'content' => 'こんにちは',
        ]);

        $res = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/line-friends/U_unlinked_2/messages');

        $res->assertOk();
        $this->assertSame('U_unlinked_2', $res->json('friend.line_user_id'));
        $this->assertSame('こんにちは', $res->json('messages.data.0.content'));
    }

    public function test_update_admin_name_keeps_original_line_name(): void
    {
        LineFriend::create([
            'line_user_id' => 'U_unlinked_3',
            'display_name' => '本来のLINE名',
            'is_following' => true,
        ]);

        $res = $this->actingAs($this->admin, 'sanctum')
            ->putJson('/api/admin/line-friends/U_unlinked_3/name', ['admin_name' => '管理用の別名']);

        $res->assertOk();
        $this->assertSame('管理用の別名', $res->json('person.admin_name'));
        $this->assertSame('本来のLINE名', $res->json('person.display_name')); // 本名は維持
        $this->assertSame('管理用の別名', $res->json('person.name'));          // 解決名は別名優先
    }

    public function test_update_name_creates_friend_row_if_missing(): void
    {
        // まだ LineFriend 行が無い line_user_id でも upsert される
        $res = $this->actingAs($this->admin, 'sanctum')
            ->putJson('/api/admin/line-friends/U_brand_new/name', ['admin_name' => 'あだ名']);

        $res->assertOk();
        $this->assertDatabaseHas('line_friends', [
            'line_user_id' => 'U_brand_new',
            'admin_name' => 'あだ名',
        ]);
    }

    public function test_person_show_marks_friend_only_as_not_logged_in(): void
    {
        LineFriend::create([
            'line_user_id' => 'U_friend_only',
            'display_name' => '友だち太郎',
            'is_following' => true,
        ]);

        $res = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/line-friends/U_friend_only');

        $res->assertOk()
            ->assertJsonPath('person.has_account', false)   // LINE未ログイン
            ->assertJsonPath('person.is_talk', true)
            ->assertJsonPath('person.reviews', []);
    }

    public function test_person_show_includes_reviews_for_logged_in_user(): void
    {
        $user = User::create(['line_user_id' => 'U_with_reviews', 'line_display_name' => 'レビュー子', 'status' => 'active']);
        LineFriend::create(['line_user_id' => 'U_with_reviews', 'user_id' => $user->id, 'is_following' => true]);
        $store = \App\Models\Store::create(['name' => 'テスト店', 'area' => '渋谷', 'category' => 'キャバクラ', 'publish_status' => 'published']);
        \App\Models\Review::create(['user_id' => $user->id, 'store_id' => $store->id, 'rating' => 5, 'body' => 'よかった', 'status' => 'published']);

        $res = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/line-friends/U_with_reviews');

        $res->assertOk()
            ->assertJsonPath('person.has_account', true)
            ->assertJsonPath('person.reviews.0.body', 'よかった');
    }

    public function test_person_show_includes_users_ai_chats(): void
    {
        $user = User::create(['line_user_id' => 'U_chatter', 'line_display_name' => 'チャット子', 'status' => 'active']);
        LineFriend::create(['line_user_id' => 'U_chatter', 'user_id' => $user->id, 'is_following' => true]);
        \App\Models\AiChatLog::create([
            'user_id' => $user->id, 'page_type' => 'top', 'mode' => 'agent',
            'user_message' => '渋谷で働ける？', 'ai_response' => 'はい働けます', 'input_tokens' => 5, 'output_tokens' => 7,
        ]);
        // 別ユーザーのチャットは混ざらない
        \App\Models\AiChatLog::create(['user_id' => null, 'page_type' => 'top', 'mode' => 'agent', 'user_message' => '匿名', 'ai_response' => 'x']);

        $res = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/line-friends/U_chatter');

        $res->assertOk();
        $this->assertCount(1, $res->json('person.ai_chats'));
        $this->assertSame('渋谷で働ける？', $res->json('person.ai_chats.0.user_message'));
    }

    public function test_person_show_backfills_line_name_for_following_friend(): void
    {
        // フォロー中なのに名前が空の相手は、詳細を開いた時に Messaging API から補完。
        // フォロー中＝公式アカウント追加済みなので LINE ログイン未連携でも取得できる。
        config(['services.line_messaging.access_token' => 'test-token']);
        Http::fake([
            'api.line.me/v2/bot/profile/*' => Http::response([
                'displayName' => 'LINEで取得太郎',
                'pictureUrl' => 'https://example.com/p.jpg',
            ], 200),
        ]);
        LineFriend::create(['line_user_id' => 'U_follow_noname', 'display_name' => null, 'is_following' => true]);

        $res = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/line-friends/U_follow_noname');

        $res->assertOk()->assertJsonPath('person.display_name', 'LINEで取得太郎');
        $this->assertDatabaseHas('line_friends', [
            'line_user_id' => 'U_follow_noname',
            'display_name' => 'LINEで取得太郎',
        ]);
    }

    public function test_update_notes_saves_admin_memo(): void
    {
        LineFriend::create(['line_user_id' => 'U_memo', 'is_following' => true]);

        $res = $this->actingAs($this->admin, 'sanctum')
            ->putJson('/api/admin/line-friends/U_memo/notes', ['admin_notes' => '六本木希望・要フォロー']);

        $res->assertOk()->assertJsonPath('person.admin_notes', '六本木希望・要フォロー');
        $this->assertDatabaseHas('line_friends', ['line_user_id' => 'U_memo', 'admin_notes' => '六本木希望・要フォロー']);
    }
}
