<?php

namespace Database\Seeders;

use App\Models\Review;
use App\Models\Store;
use Illuminate\Database\Seeder;

class ReviewSeeder extends Seeder
{
    private const REVIEW_BODIES = [
        5 => [
            '未経験で不安でしたが、スタッフの方が本当に親切で安心して働けました。ノルマもないし、終電で帰れるので学校との両立もバッチリです！',
            'お店の雰囲気がとても良く、毎日楽しく働いています。お客様の質も高くて安心です。',
            '体入の時から丁寧に教えてもらえました。ドレスも貸してもらえるので初期費用がかからないのが嬉しい。',
            '入店して3ヶ月ですが、指名も少しずつ増えてきて楽しくなってきました。先輩キャストも優しい方ばかりです。',
            'スタッフさんが親身になって相談に乗ってくれるので、初めてでも安心できました。おすすめです！',
            '友達に紹介されて入りましたが、本当に良いお店でした。シフトも融通が利くし、最高です。',
        ],
        4 => [
            '雰囲気はすごくいいです。客層も落ち着いていて、変なお客さんはほとんどいません。ただ、週末は結構忙しいです。',
            'ボトルバックがしっかりあるのが魅力的。常連のお客様が多いので、指名が安定しやすいです。',
            '全額日払いなのが助かります。交通費も出るし、初めてのナイトワークにはぴったりだと思います。',
            '終電上がりOKなのがありがたい。休みも多いので予定も立てやすいです。',
            '少人数制なので一人ひとりに目が行き届いている感じ。おしゃれなお客様が多いです。',
            '時給も高めで、バック率も良いです。稼ぎたい方にはおすすめ。',
        ],
        3 => [
            '雰囲気はいいけど、未経験だと最初はちょっと大変かも。接客のレベルが高いので、しっかり覚悟して来た方がいいです。',
            '稼げるのは間違いないけど、忙しさもトップクラス。体力に自信がある人向けかな。',
            '可もなく不可もなくという感じ。普通に良いお店だと思います。',
            'まあまあかな。もう少しバック率が高いと嬉しいです。',
        ],
    ];

    public function run(): void
    {
        $stores = Store::where('publish_status', 'published')->get();

        foreach ($stores as $store) {
            // 60% chance a store gets reviews
            if (rand(1, 100) > 60) continue;

            $reviewCount = rand(1, 4);
            for ($i = 0; $i < $reviewCount; $i++) {
                $rating = $this->weightedRating();
                $bodies = self::REVIEW_BODIES[$rating] ?? self::REVIEW_BODIES[4];
                $body = $bodies[array_rand($bodies)];

                Review::create([
                    'user_id' => rand(1, 8),
                    'store_id' => $store->id,
                    'rating' => $rating,
                    'body' => $body,
                    'status' => 'published',
                    'created_at' => now()->subDays(rand(1, 90)),
                ]);
            }
        }

        // A few unpublished/deleted reviews
        $someStore = $stores->random();
        Review::create([
            'user_id' => 5, 'store_id' => $someStore->id, 'rating' => 2,
            'body' => 'スタッフの対応がイマイチだった。', 'status' => 'unpublished',
            'created_at' => now()->subDays(rand(1, 30)),
        ]);
        Review::create([
            'user_id' => 5, 'store_id' => $stores->random()->id, 'rating' => 1,
            'body' => '合わなかった。', 'status' => 'deleted',
            'created_at' => now()->subDays(rand(1, 30)),
        ]);
    }

    private function weightedRating(): int
    {
        $rand = rand(1, 100);
        if ($rand <= 35) return 5;
        if ($rand <= 70) return 4;
        return 3;
    }
}
