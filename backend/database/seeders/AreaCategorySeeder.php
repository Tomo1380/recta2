<?php

namespace Database\Seeders;

use App\Models\Area;
use App\Models\Category;
use Illuminate\Database\Seeder;

class AreaCategorySeeder extends Seeder
{
    public function run(): void
    {
        // Idempotent reseed
        Area::query()->delete();
        Category::query()->delete();

        $areas = [
            ['name' => '渋谷', 'slug' => 'shibuya', 'visible' => true, 'sort_order' => 1],
            ['name' => '新宿', 'slug' => 'shinjuku', 'visible' => true, 'sort_order' => 2],
            ['name' => '六本木', 'slug' => 'roppongi', 'visible' => true, 'sort_order' => 3],
            ['name' => '銀座', 'slug' => 'ginza', 'visible' => true, 'sort_order' => 4],
            ['name' => '池袋', 'slug' => 'ikebukuro', 'visible' => true, 'sort_order' => 5],
            ['name' => '恵比寿', 'slug' => 'ebisu', 'visible' => true, 'sort_order' => 6],
            ['name' => '麻布十番', 'slug' => 'azabujuban', 'visible' => true, 'sort_order' => 7],
            ['name' => '表参道', 'slug' => 'omotesando', 'visible' => true, 'sort_order' => 8],
            ['name' => '中洲', 'slug' => 'nakasu', 'visible' => false, 'sort_order' => 9],
            ['name' => 'すすきの', 'slug' => 'susukino', 'visible' => false, 'sort_order' => 10],
        ];

        foreach ($areas as $area) {
            Area::create($area);
        }

        // Default category images sourced from the legacy frontend hardcoded
        // dictionary (Unsplash CDN). Admins can override these from the admin
        // /admin/area-category screen.
        $categories = [
            ['name' => 'ラウンジ', 'slug' => 'lounge', 'image_url' => 'https://images.unsplash.com/photo-1573830540758-68d5a242fc79?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400', 'visible' => true, 'sort_order' => 1],
            ['name' => 'キャバクラ', 'slug' => 'cabaret', 'image_url' => 'https://images.unsplash.com/photo-1620022604911-126743712882?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400', 'visible' => true, 'sort_order' => 2],
            ['name' => 'クラブ', 'slug' => 'club', 'image_url' => 'https://images.unsplash.com/photo-1628500548389-3557986eba8c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400', 'visible' => true, 'sort_order' => 3],
            ['name' => 'ガールズバー', 'slug' => 'girls-bar', 'image_url' => 'https://images.unsplash.com/photo-1758526348234-2dd7170514d0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400', 'visible' => true, 'sort_order' => 4],
            ['name' => 'コンカフェ', 'slug' => 'concafe', 'image_url' => 'https://images.unsplash.com/photo-1612452556802-f9e9ab097eaf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400', 'visible' => true, 'sort_order' => 5],
            ['name' => 'スナック', 'slug' => 'snack', 'image_url' => null, 'visible' => false, 'sort_order' => 6],
        ];

        foreach ($categories as $category) {
            Category::create($category);
        }
    }
}
