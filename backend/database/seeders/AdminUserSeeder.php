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

        // 一般管理者のサンプル。権限の組み合わせ例として「チャット担当 + コラム担当」
        // （ユーザー対応とコラム作成のみ）を付与しておく。
        AdminUser::create([
            'name' => '田中 太郎',
            'email' => 'tanaka@recta2.jp',
            'password' => 'password',
            'role' => 'admin',
            'status' => 'active',
            'permissions' => ['chat', 'articles'],
        ]);
    }
}
