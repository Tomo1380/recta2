<?php

namespace Database\Seeders;

use App\Models\Consultation;
use App\Models\PickupShop;
use App\Models\SiteSetting;
use Illuminate\Database\Seeder;

class ContentSeeder extends Seeder
{
    public function run(): void
    {
        // Pickup shops - anchor stores + some generated ones for variety
        $pickups = [
            ['store_id' => 1, 'sort_order' => 0, 'is_pr' => true, 'visible' => true],   // Club Lumière (六本木)
            ['store_id' => 2, 'sort_order' => 1, 'is_pr' => false, 'visible' => true],   // Lounge SEIREN (銀座)
            ['store_id' => 3, 'sort_order' => 2, 'is_pr' => false, 'visible' => true],   // Girls Bar Honey (渋谷)
            ['store_id' => 4, 'sort_order' => 3, 'is_pr' => true, 'visible' => true],    // Club GRANDEUR (新宿)
            ['store_id' => 5, 'sort_order' => 4, 'is_pr' => false, 'visible' => true],   // Lounge Crescent (恵比寿)
            ['store_id' => 6, 'sort_order' => 5, 'is_pr' => false, 'visible' => true],   // generated store
            ['store_id' => 8, 'sort_order' => 6, 'is_pr' => true, 'visible' => true],    // generated store
            ['store_id' => 12, 'sort_order' => 7, 'is_pr' => false, 'visible' => true],  // generated store
            ['store_id' => 15, 'sort_order' => 8, 'is_pr' => false, 'visible' => false], // hidden
            ['store_id' => 20, 'sort_order' => 9, 'is_pr' => false, 'visible' => false], // hidden
        ];

        foreach ($pickups as $pickup) {
            PickupShop::create($pickup);
        }

        // Consultations
        $consultations = [
            ['question' => 'ノルマなしのお店は本当にある？', 'tag' => '#条件', 'count' => 1100, 'sort_order' => 1],
            ['question' => '容姿に自信がなくても大丈夫？', 'tag' => '#不安', 'count' => 1400, 'sort_order' => 2],
            ['question' => 'バレずに働ける方法はある？', 'tag' => '#プライバシー', 'count' => 2300, 'sort_order' => 3],
            ['question' => '渋谷エリアの時給相場は？', 'tag' => '#エリア', 'count' => 920, 'sort_order' => 4],
            ['question' => '昼職との両立は可能？', 'tag' => '#働き方', 'count' => 780, 'sort_order' => 5],
            ['question' => '初日の服装はどうすればいい？', 'tag' => '#体入', 'count' => 650, 'sort_order' => 6],
            ['question' => 'お酒が飲めなくても働ける？', 'tag' => '#不安', 'count' => 1850, 'sort_order' => 7],
            ['question' => 'キャバクラとラウンジの違いは？', 'tag' => '#業種', 'count' => 1200, 'sort_order' => 8],
        ];

        foreach ($consultations as $consultation) {
            Consultation::create($consultation);
        }

        // Site settings
        $settings = [
            'hero_tagline' => 'AIと探す、理想のナイトワーク',
            'hero_subtitle' => 'キャバクラ・ラウンジ・クラブ｜全国1,200件以上',
            'hero_badge' => 'ナイトワーク求人',
            'hero_ai_label' => 'AI MATCHING',
        ];

        foreach ($settings as $key => $value) {
            SiteSetting::create(['key' => $key, 'value' => $value]);
        }
    }
}
