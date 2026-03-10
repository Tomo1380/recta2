<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            // パターン1: ログイン済み + LINE友だち
            [
                'line_user_id' => 'U1234567890abcdef1234567890abcdef',
                'line_display_name' => 'みく',
                'line_picture_url' => 'https://profile.line-scdn.net/sample1.jpg',
                'status' => 'active',
                'admin_notes' => '六本木希望。未経験。22歳。',
                'last_login_at' => now()->subHours(2),
            ],
            [
                'line_user_id' => 'U2345678901abcdef2345678901abcdef',
                'line_display_name' => 'あやか',
                'line_picture_url' => 'https://profile.line-scdn.net/sample2.jpg',
                'status' => 'active',
                'admin_notes' => '銀座ラウンジ経験2年。高時給希望。',
                'last_login_at' => now()->subDays(1),
            ],
            [
                'line_user_id' => 'U3456789012abcdef3456789012abcdef',
                'line_display_name' => 'れいな🌸',
                'line_picture_url' => 'https://profile.line-scdn.net/sample3.jpg',
                'status' => 'active',
                'last_login_at' => now()->subDays(3),
            ],
            [
                'line_user_id' => 'U4567890123abcdef4567890123abcdef',
                'line_display_name' => 'ゆい',
                'line_picture_url' => null,
                'status' => 'active',
                'admin_notes' => '歌舞伎町キャバクラ経験5年。即戦力。',
                'last_login_at' => now()->subWeeks(1),
            ],
            [
                'line_user_id' => 'U5678901234abcdef5678901234abcdef',
                'line_display_name' => 'まりな',
                'line_picture_url' => 'https://profile.line-scdn.net/sample5.jpg',
                'status' => 'suspended',
                'admin_notes' => '連絡取れず。アカウント停止。',
                'last_login_at' => now()->subMonths(1),
            ],

            // パターン2: ログイン済み + ブロック済み（元友だち）
            [
                'line_user_id' => 'U6789012345abcdef6789012345abcdef',
                'line_display_name' => 'さき💫',
                'line_picture_url' => 'https://profile.line-scdn.net/sample6.jpg',
                'status' => 'active',
                'admin_notes' => '友だち追加後にブロック。',
                'last_login_at' => now(),
            ],

            // パターン2: ログイン済み + 未友だち（サイトにログインしたが公式アカウント未追加）
            [
                'line_user_id' => 'U7890123456abcdef7890123456abcdef',
                'line_display_name' => 'ほのか',
                'line_picture_url' => null,
                'status' => 'active',
                'admin_notes' => '銀座希望。経験3年。公式アカウント未追加。',
                'last_login_at' => now()->subHours(5),
            ],
            [
                'line_user_id' => 'U8901234567abcdef8901234567abcdef',
                'line_display_name' => 'なな',
                'line_picture_url' => 'https://profile.line-scdn.net/sample8.jpg',
                'status' => 'active',
                'last_login_at' => now()->subDays(2),
            ],

            // パターン3: 未ログイン + LINE友だち（公式アカウント追加したがサイト未ログイン）
            // Webhook経由でユーザーレコードが作られるケース
            [
                'line_user_id' => 'Uf1234567890abcdef1234567890abcde',
                'line_display_name' => 'かなこ',
                'line_picture_url' => 'https://profile.line-scdn.net/sample_f1.jpg',
                'status' => 'active',
                'admin_notes' => '友だち追加のみ。サイト未ログイン。',
                'last_login_at' => null,
            ],
            [
                'line_user_id' => 'Uf2345678901abcdef2345678901abcde',
                'line_display_name' => 'えみ',
                'line_picture_url' => null,
                'status' => 'active',
                'last_login_at' => null,
            ],
            [
                'line_user_id' => 'Uf3456789012abcdef3456789012abcde',
                'line_display_name' => 'りさ',
                'line_picture_url' => 'https://profile.line-scdn.net/sample_f3.jpg',
                'status' => 'active',
                'admin_notes' => '渋谷のガールズバー探し中とメッセージあり。',
                'last_login_at' => null,
            ],
        ];

        foreach ($users as $user) {
            User::create($user);
        }
    }
}
