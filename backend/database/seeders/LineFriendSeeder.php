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
    }
}
