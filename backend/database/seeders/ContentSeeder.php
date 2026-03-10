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
        // Pickup shops (store IDs 1-5)
        for ($i = 1; $i <= 5; $i++) {
            PickupShop::create([
                'store_id' => $i,
                'sort_order' => $i - 1,
                'is_pr' => $i === 1,
                'visible' => true,
            ]);
        }

        // Consultations
        $consultations = [
            ['question' => 'ノルマなしのお店は本当にある？', 'tag' => '#条件', 'count' => 1100, 'sort_order' => 1],
            ['question' => '容姿に自信がなくても大丈夫？', 'tag' => '#不安', 'count' => 1400, 'sort_order' => 2],
            ['question' => 'バレずに働ける方法はある？', 'tag' => '#プライバシー', 'count' => 2300, 'sort_order' => 3],
            ['question' => '渋谷エリアの時給相場は？', 'tag' => '#エリア', 'count' => 920, 'sort_order' => 4],
            ['question' => '昼職との両立は可能？', 'tag' => '#働き方', 'count' => 780, 'sort_order' => 5],
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
