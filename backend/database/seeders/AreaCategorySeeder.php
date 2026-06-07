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

        // lat/lng は各エリアの中心座標。トップのピックアップ近隣ソート用。
        // 本番では管理画面のエリア作成時に geocode 自動セットされるが、Google key
        // 無しのローカル/fresh でも動くよう既知エリアは座標を持たせておく。
        $areas = [
            ['name' => '渋谷', 'slug' => 'shibuya', 'visible' => true, 'sort_order' => 1, 'lat' => 35.6580, 'lng' => 139.6994],
            ['name' => '新宿', 'slug' => 'shinjuku', 'visible' => true, 'sort_order' => 2, 'lat' => 35.6938, 'lng' => 139.7034],
            ['name' => '六本木', 'slug' => 'roppongi', 'visible' => true, 'sort_order' => 3, 'lat' => 35.6628, 'lng' => 139.7315],
            ['name' => '銀座', 'slug' => 'ginza', 'visible' => true, 'sort_order' => 4, 'lat' => 35.6717, 'lng' => 139.7650],
            ['name' => '池袋', 'slug' => 'ikebukuro', 'visible' => true, 'sort_order' => 5, 'lat' => 35.7295, 'lng' => 139.7109],
            ['name' => '恵比寿', 'slug' => 'ebisu', 'visible' => true, 'sort_order' => 6, 'lat' => 35.6467, 'lng' => 139.7100],
            ['name' => '麻布十番', 'slug' => 'azabujuban', 'visible' => true, 'sort_order' => 7, 'lat' => 35.6556, 'lng' => 139.7363],
            ['name' => '表参道', 'slug' => 'omotesando', 'visible' => true, 'sort_order' => 8, 'lat' => 35.6655, 'lng' => 139.7126],
            ['name' => '中洲', 'slug' => 'nakasu', 'visible' => false, 'sort_order' => 9, 'lat' => 33.5939, 'lng' => 130.4017],
            ['name' => 'すすきの', 'slug' => 'susukino', 'visible' => false, 'sort_order' => 10, 'lat' => 43.0556, 'lng' => 141.3534],
        ];

        foreach ($areas as $area) {
            Area::create($area);
        }

        // Default category images sourced from the legacy frontend hardcoded
        // dictionary (Unsplash CDN). Admins can override these from the admin
        // /admin/area-category screen.
        $categories = [
            ['name' => 'ラウンジ', 'slug' => 'lounge', 'image_url' => 'https://images.unsplash.com/photo-1573830540758-68d5a242fc79?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400', 'visible' => true, 'sort_order' => 1],
            // BUG-E14: 「キャバレー」と誤解されない `cabaclub` に統一 (Article slug 等と揃える)。
            ['name' => 'キャバクラ', 'slug' => 'cabaclub', 'image_url' => 'https://images.unsplash.com/photo-1620022604911-126743712882?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400', 'visible' => true, 'sort_order' => 2],
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
