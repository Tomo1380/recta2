<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            [
                'line_user_id' => 'U1234567890abcdef1234567890abcdef',
                'line_display_name' => 'みく',
                'line_picture_url' => 'https://profile.line-scdn.net/sample1.jpg',
                'nickname' => 'みくちゃん',
                'age' => 22,
                'preferred_area' => '六本木',
                'preferred_category' => 'キャバクラ',
                'experience' => '未経験',
                'status' => 'active',
                'last_login_at' => now()->subHours(2),
            ],
            [
                'line_user_id' => 'U2345678901abcdef2345678901abcdef',
                'line_display_name' => 'あやか',
                'line_picture_url' => 'https://profile.line-scdn.net/sample2.jpg',
                'nickname' => 'あやか',
                'age' => 25,
                'preferred_area' => '銀座',
                'preferred_category' => 'ラウンジ',
                'experience' => '経験2年',
                'status' => 'active',
                'last_login_at' => now()->subDays(1),
            ],
            [
                'line_user_id' => 'U3456789012abcdef3456789012abcdef',
                'line_display_name' => 'れいな🌸',
                'line_picture_url' => 'https://profile.line-scdn.net/sample3.jpg',
                'nickname' => null,
                'age' => 20,
                'preferred_area' => '渋谷',
                'preferred_category' => 'ガールズバー',
                'experience' => '未経験',
                'status' => 'active',
                'last_login_at' => now()->subDays(3),
            ],
            [
                'line_user_id' => 'U4567890123abcdef4567890123abcdef',
                'line_display_name' => 'ゆい',
                'line_picture_url' => null,
                'nickname' => 'ゆいぴ',
                'age' => 28,
                'preferred_area' => '歌舞伎町',
                'preferred_category' => 'キャバクラ',
                'experience' => '経験5年',
                'status' => 'active',
                'last_login_at' => now()->subWeeks(1),
            ],
            [
                'line_user_id' => 'U5678901234abcdef5678901234abcdef',
                'line_display_name' => 'まりな',
                'line_picture_url' => 'https://profile.line-scdn.net/sample5.jpg',
                'nickname' => 'まりな',
                'age' => 23,
                'preferred_area' => '恵比寿',
                'preferred_category' => 'ラウンジ',
                'experience' => '経験1年',
                'status' => 'suspended',
                'last_login_at' => now()->subMonths(1),
            ],
            [
                'line_user_id' => 'U6789012345abcdef6789012345abcdef',
                'line_display_name' => 'さき💫',
                'line_picture_url' => 'https://profile.line-scdn.net/sample6.jpg',
                'age' => 21,
                'preferred_area' => '六本木',
                'experience' => '未経験',
                'status' => 'active',
                'last_login_at' => now(),
            ],
            [
                'line_user_id' => 'U7890123456abcdef7890123456abcdef',
                'line_display_name' => 'ほのか',
                'line_picture_url' => null,
                'age' => 24,
                'preferred_area' => '銀座',
                'experience' => '経験3年',
                'status' => 'active',
                'last_login_at' => now()->subHours(5),
            ],
            [
                'line_user_id' => 'U8901234567abcdef8901234567abcdef',
                'line_display_name' => 'なな',
                'line_picture_url' => 'https://profile.line-scdn.net/sample8.jpg',
                'age' => 19,
                'preferred_area' => '渋谷',
                'experience' => '未経験',
                'status' => 'active',
                'last_login_at' => now()->subDays(2),
            ],
        ];

        foreach ($users as $user) {
            User::create($user);
        }
    }
}
