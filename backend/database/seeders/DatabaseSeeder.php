<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $this->call([
            AdminUserSeeder::class,
            StoreSeeder::class,
            UserSeeder::class,
            ReviewSeeder::class,
            AiChatSettingSeeder::class,
            AiChatLimitSeeder::class,
            AiChatLogSeeder::class,        // ← User より後 (FK)
            AreaCategorySeeder::class,
            ContentSeeder::class,
            ArticleSeeder::class,
            LineFriendSeeder::class,
            IndustryKnowledgeSeeder::class,
            RelocateVoiceSeeder::class,
        ]);
    }
}
