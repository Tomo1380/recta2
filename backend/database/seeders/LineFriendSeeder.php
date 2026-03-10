<?php

namespace Database\Seeders;

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
        $friendOnlyRecords = [
            [
                'user_id' => null,
                'line_user_id' => 'Uf1234567890abcdef1234567890abcde',
                'display_name' => 'かなこ',
                'picture_url' => 'https://profile.line-scdn.net/sample_f1.jpg',
                'followed_at' => now()->subDays(10),
                'is_following' => true,
            ],
            [
                'user_id' => null,
                'line_user_id' => 'Uf2345678901abcdef2345678901abcde',
                'display_name' => 'えみ',
                'picture_url' => null,
                'followed_at' => now()->subDays(7),
                'is_following' => true,
            ],
            [
                'user_id' => null,
                'line_user_id' => 'Uf3456789012abcdef3456789012abcde',
                'display_name' => 'りさ',
                'picture_url' => 'https://profile.line-scdn.net/sample_f3.jpg',
                'followed_at' => now()->subDays(3),
                'is_following' => true,
            ],
        ];

        foreach ($friendOnlyRecords as $record) {
            LineFriend::create($record);
        }
    }
}
