<?php

namespace Database\Seeders;

use App\Models\AiChatLog;
use App\Models\LineFriend;
use App\Models\LineMessage;
use App\Models\User;
use Illuminate\Database\Seeder;

class LineFriendSeeder extends Seeder
{
    public function run(): void
    {
        $users = User::all();

        // Create LineFriend records for first 5 users (they are LINE friends)
        foreach ($users->take(5) as $i => $user) {
            $friend = LineFriend::create([
                'user_id' => $user->id,
                'line_user_id' => $user->line_user_id,
                'display_name' => $user->line_display_name,
                'picture_url' => $user->line_picture_url,
                'followed_at' => now()->subDays(30 - $i * 3),
                'unfollowed_at' => null,
                'is_following' => true,
            ]);

            // Add some sample messages for first 3 friends
            if ($i < 3) {
                LineMessage::create([
                    'line_user_id' => $user->line_user_id,
                    'user_id' => $user->id,
                    'direction' => 'inbound',
                    'message_type' => 'text',
                    'content' => '六本木エリアで時給の高いお店を探しています',
                    'created_at' => now()->subDays(5)->subHours($i),
                ]);
                LineMessage::create([
                    'line_user_id' => $user->line_user_id,
                    'user_id' => $user->id,
                    'direction' => 'outbound',
                    'message_type' => 'text',
                    'content' => 'ご連絡ありがとうございます！六本木エリアのおすすめ店舗をご紹介しますね。',
                    'created_at' => now()->subDays(5)->subHours($i)->addMinutes(10),
                ]);
                LineMessage::create([
                    'line_user_id' => $user->line_user_id,
                    'user_id' => $user->id,
                    'direction' => 'inbound',
                    'message_type' => 'text',
                    'content' => 'ありがとうございます！体験入店はできますか？',
                    'created_at' => now()->subDays(4)->subHours($i),
                ]);
            }
        }

        // User 6 (さき) unfollowed
        if ($users->count() >= 6) {
            $user6 = $users[5];
            LineFriend::create([
                'user_id' => $user6->id,
                'line_user_id' => $user6->line_user_id,
                'display_name' => $user6->line_display_name,
                'picture_url' => $user6->line_picture_url,
                'followed_at' => now()->subDays(20),
                'unfollowed_at' => now()->subDays(5),
                'is_following' => false,
            ]);
        }

        // LINE-friend-only records (people who added OA but haven't logged in via LINE Login)
        // These users exist in the users table (created by UserSeeder) so we link them
        $friendOnlyLineIds = [
            'Uf1234567890abcdef1234567890abcde',
            'Uf2345678901abcdef2345678901abcde',
            'Uf3456789012abcdef3456789012abcde',
        ];

        foreach ($friendOnlyLineIds as $i => $lineUserId) {
            $user = User::where('line_user_id', $lineUserId)->first();
            $friend = LineFriend::create([
                'user_id' => $user?->id,
                'line_user_id' => $lineUserId,
                'display_name' => $user?->line_display_name ?? $lineUserId,
                'picture_url' => $user?->line_picture_url,
                'followed_at' => now()->subDays(10 - $i * 3),
                'is_following' => true,
            ]);

            // Add sample messages for friend-only users
            if ($user && $i === 0) {
                LineMessage::create([
                    'line_user_id' => $lineUserId,
                    'user_id' => $user->id,
                    'direction' => 'inbound',
                    'message_type' => 'text',
                    'content' => '友だち追加しました！お仕事探してます。',
                    'created_at' => now()->subDays(10),
                ]);
            }
            if ($user && $i === 2) {
                LineMessage::create([
                    'line_user_id' => $lineUserId,
                    'user_id' => $user->id,
                    'direction' => 'inbound',
                    'message_type' => 'text',
                    'content' => '渋谷のガールズバーで働きたいんですが、おすすめありますか？',
                    'created_at' => now()->subDays(3),
                ]);
                LineMessage::create([
                    'line_user_id' => $lineUserId,
                    'user_id' => $user->id,
                    'direction' => 'outbound',
                    'message_type' => 'text',
                    'content' => 'ご連絡ありがとうございます！渋谷エリアのガールズバーをいくつかご紹介しますね。',
                    'created_at' => now()->subDays(3)->addMinutes(15),
                ]);
            }
        }

        $this->seedHeavyChatterFriend();
    }

    /**
     * 「フォロー中だが LINE ログインしていない」ヘビーチャッターのテストデータ。
     * AIチャットは LINEトーク基準 (line_user_id) で紐づくので、user_id なしの
     * AiChatLog を多数作ると人物詳細に履歴が出る。詳細の履歴まとめ表示
     * (件数が多いと長くなるのを 3 件 + もっと見るに畳む) の確認用。
     */
    private function seedHeavyChatterFriend(): void
    {
        $lineId = 'Uheavychatter000000000000000000001';

        // display_name は「LINE プロフィールから取得した表示名」を想定したリアルな名前。
        // 本番では detail を開いた時に getProfile が実際の LINE 表示名を取得する
        // (フォロー中＝公式追加済みなので未ログインでも取れる)。dev はトークン未設定の
        // ため、ここで入れた値が getProfile 結果の代わりに表示される。
        LineFriend::firstOrCreate(
            ['line_user_id' => $lineId],
            [
                'display_name' => 'ゆうな🌙',
                'picture_url' => 'https://i.pravatar.cc/150?img=47',
                'is_following' => true,
                'followed_at' => now()->subDays(8),
            ],
        );

        // [page_type, mode, user_message, ai_response]
        $samples = [
            ['top', 'agent', '未経験でも稼げるお店ありますか？', '未経験歓迎で時給も高めのお店を5件ピックアップしました。最初は体験入店から始めるのがおすすめです。'],
            ['top', 'agent', '渋谷で日払いのお店教えて', '渋谷で全額日払い対応のガールズバー・ラウンジを4件ご紹介します。'],
            ['list', 'agent', 'ノルマなしのところだけ見たい', 'ノルマ・ペナルティなしの店舗だけに絞り込みました。10件ヒットしています。'],
            ['detail', 'agent', 'このお店って送りありますか？', 'はい、こちらの店舗は送り(車での自宅送迎)ありです。深夜でも安心して帰れます。'],
            ['top', 'finetuned', '上京したいけどお金が不安です', '上京サポートでは住居・引越し費用の補助や、初期費用の立て替え制度があります。貯金ゼロでも始められるお店が多いので、まずは相談だけでも大丈夫ですよ。具体的にどのエリアを考えていますか？'],
            ['detail', 'agent', '体入の流れを詳しく教えて', '体験入店の流れは、(1)応募・面接予約 (2)面接(私服OK・30分ほど) (3)当日または後日に体入 (4)実際に3〜4時間ほど接客 (5)体入給を当日支給、という流れです。合わないと感じたらそのまま辞退してもOKなので、気軽に試せます。'],
            ['list', 'agent', '週1から働けるところある？', '週1日・1日3時間〜OKの自由シフト店を絞り込みました。学業やWワークと両立しやすいお店です。'],
            ['top', 'agent', '客層が落ち着いてるお店がいい', '客層が落ち着いた大人向けのラウンジ・クラブを中心にご紹介します。'],
            ['detail', 'agent', 'ここの時給っていくら？', 'こちらは体入時給5,000円〜、本入店後も同水準です。指名やバックで上乗せもあります。'],
        ];

        $logs = [];
        for ($i = 0; $i < 16; $i++) {
            $s = $samples[$i % count($samples)];
            $logs[] = [
                'user_id' => null,                 // 未ログイン
                'line_user_id' => $lineId,         // LINEトーク基準で紐づく
                'ip_address' => '203.0.113.' . (10 + $i),
                'page_type' => $s[0],
                'mode' => $s[1],
                'user_message' => $s[2],
                'ai_response' => $s[3],
                'input_tokens' => 200 + $i * 6,
                'output_tokens' => 120 + $i * 4,
                'created_at' => now()->subDays($i)->subHours(rand(0, 12)),
                'updated_at' => now(),
            ];
        }
        foreach (array_chunk($logs, 50) as $chunk) {
            AiChatLog::insert($chunk);
        }
    }
}
