<?php

namespace Database\Seeders;

use App\Models\Area;
use App\Models\Category;
use Illuminate\Database\Seeder;

class AreaCategorySeeder extends Seeder
{
    public function run(): void
    {
        $areas = [
            ['name' => '渋谷', 'slug' => 'shibuya', 'tier' => 'gold', 'visible' => true, 'sort_order' => 1],
            ['name' => '新宿', 'slug' => 'shinjuku', 'tier' => 'gold', 'visible' => true, 'sort_order' => 2],
            ['name' => '六本木', 'slug' => 'roppongi', 'tier' => 'gold', 'visible' => true, 'sort_order' => 3],
            ['name' => '銀座', 'slug' => 'ginza', 'tier' => 'standard', 'visible' => true, 'sort_order' => 4],
            ['name' => '池袋', 'slug' => 'ikebukuro', 'tier' => 'standard', 'visible' => true, 'sort_order' => 5],
            ['name' => '恵比寿', 'slug' => 'ebisu', 'tier' => 'standard', 'visible' => true, 'sort_order' => 6],
            ['name' => '麻布十番', 'slug' => 'azabujuban', 'tier' => 'standard', 'visible' => true, 'sort_order' => 7],
            ['name' => '表参道', 'slug' => 'omotesando', 'tier' => 'standard', 'visible' => true, 'sort_order' => 8],
            ['name' => '中洲', 'slug' => 'nakasu', 'tier' => 'standard', 'visible' => false, 'sort_order' => 9],
            ['name' => 'すすきの', 'slug' => 'susukino', 'tier' => 'standard', 'visible' => false, 'sort_order' => 10],
        ];

        foreach ($areas as $area) {
            Area::create($area);
        }

        $categories = [
            ['name' => 'ラウンジ', 'slug' => 'lounge', 'color' => '#C86080', 'visible' => true, 'sort_order' => 1],
            ['name' => 'キャバクラ', 'slug' => 'cabaret', 'color' => '#D4AF37', 'visible' => true, 'sort_order' => 2],
            ['name' => 'クラブ', 'slug' => 'club', 'color' => '#4A90D9', 'visible' => true, 'sort_order' => 3],
            ['name' => 'ガールズバー', 'slug' => 'girls-bar', 'color' => '#50C878', 'visible' => true, 'sort_order' => 4],
            ['name' => 'コンカフェ', 'slug' => 'concafe', 'color' => '#FF6B9D', 'visible' => true, 'sort_order' => 5],
            ['name' => 'スナック', 'slug' => 'snack', 'color' => '#9B7DDB', 'visible' => false, 'sort_order' => 6],
        ];

        foreach ($categories as $category) {
            Category::create($category);
        }
    }
}
