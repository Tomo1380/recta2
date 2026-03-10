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
            AreaCategorySeeder::class,
            ContentSeeder::class,
        ]);
    }
}
