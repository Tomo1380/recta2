<?php

namespace Database\Seeders;

use App\Models\AdminUser;
use Illuminate\Database\Seeder;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        AdminUser::create([
            'name' => '管理者',
            'email' => 'admin@recta2.jp',
            'password' => 'password',
            'role' => 'super_admin',
            'status' => 'active',
        ]);

        AdminUser::create([
            'name' => '田中 太郎',
            'email' => 'tanaka@recta2.jp',
            'password' => 'password',
            'role' => 'admin',
            'status' => 'active',
        ]);
    }
}
