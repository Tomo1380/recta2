<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Render deploy用の冪等シーダー
 * 既存データがあればスキップする
 */
class RenderSeeder extends Seeder
{
    public function run(): void
    {
        // 管理者ユーザー（なければ作成）
        if (\App\Models\AdminUser::count() === 0) {
            $this->call(AdminUserSeeder::class);
        }

        // 店舗データ（なければ作成）
        if (\App\Models\Store::count() === 0) {
            $this->call(StoreSeeder::class);
        }

        // AIチャット設定（なければ作成）
        if (\App\Models\AiChatSetting::count() === 0) {
            $this->call(AiChatSettingSeeder::class);
        }

        // エリア・カテゴリ（なければ作成）
        if (\App\Models\Area::count() === 0) {
            $this->call(AreaCategorySeeder::class);
        }

        // コンテンツ（なければ作成）
        if (\App\Models\Content::count() === 0) {
            $this->call(ContentSeeder::class);
        }
    }
}
