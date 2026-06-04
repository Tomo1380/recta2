<?php

namespace Database\Seeders;

use App\Models\RelocateVoice;
use Illuminate\Database\Seeder;

class RelocateVoiceSeeder extends Seeder
{
    public function run(): void
    {
        $voices = [
            [
                'area_from' => '北海道',
                'area_to' => '六本木',
                'body' => '面接から入店まで全部オンラインで完結。家も用意してもらえて、上京1週間後には働けてました。',
            ],
            [
                'area_from' => '九州',
                'area_to' => '銀座',
                'body' => '体入確約だったので安心して来れました。最初の家賃も補助があったので貯金ゼロでも始められた。',
            ],
            [
                'area_from' => '東北',
                'area_to' => '歌舞伎町',
                'body' => '家具家電付きの家を紹介してもらえて、スーツケース1つで上京しました。',
            ],
        ];

        foreach ($voices as $i => $voice) {
            RelocateVoice::create([
                ...$voice,
                'visible' => true,
                'display_order' => $i,
            ]);
        }
    }
}
