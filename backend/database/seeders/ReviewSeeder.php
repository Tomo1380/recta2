<?php

namespace Database\Seeders;

use App\Models\Review;
use App\Models\Store;
use App\Models\User;
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
        $userIds = User::pluck('id')->all();

        if (empty($userIds) || $stores->isEmpty()) {
            // 依存データが無ければスキップ (migrate:fresh 以外の単発実行で
            // 順序が崩れていても落ちないようにする)
            $this->command?->warn('ReviewSeeder: users or published stores are empty, skipping.');
            return;
        }

        // 先頭 5 件のアンカー店舗には必ず 3〜5 件のレビューを入れる。
        // デモ環境でトップ・詳細画面の口コミセクションが必ず生きてる状態を維持。
        // (id ハードコードだと migrate:fresh のたびに id 範囲が変わって壊れる
        //  ため、現在 published な店の先頭から拾う)
        $anchorIds = $stores->take(5)->pluck('id')->all();

        foreach ($stores as $store) {
            $isAnchor = in_array($store->id, $anchorIds, true);

            if (!$isAnchor && rand(1, 100) > 60) {
                continue; // 通常店舗は 60% の確率でスキップ
            }

            $reviewCount = $isAnchor ? rand(3, 5) : rand(1, 4);
            for ($i = 0; $i < $reviewCount; $i++) {
                $rating = $this->weightedRating();
                $bodies = self::REVIEW_BODIES[$rating] ?? self::REVIEW_BODIES[4];
                $body = $bodies[array_rand($bodies)];

                Review::create([
                    'user_id' => $userIds[array_rand($userIds)],
                    'store_id' => $store->id,
                    'rating' => $rating,
                    'body' => $body,
                    'status' => 'published',
                    // BUG-E06: 時刻もランダム化。これまで now()->subDays() だけだったので
                    // 全レビューが seed 実行時刻 (例: 03:37) でクラスタリングしていた。
                    'created_at' => $this->randomPastTimestamp(1, 90),
                ]);
            }
        }

        // A few unpublished/deleted reviews
        Review::create([
            'user_id' => $userIds[array_rand($userIds)],
            'store_id' => $stores->random()->id,
            'rating' => 2,
            'body' => 'スタッフの対応がイマイチだった。',
            'status' => 'unpublished',
            'created_at' => $this->randomPastTimestamp(1, 30),
        ]);
        Review::create([
            'user_id' => $userIds[array_rand($userIds)],
            'store_id' => $stores->random()->id,
            'rating' => 1,
            'body' => '合わなかった。',
            'status' => 'deleted',
            'created_at' => $this->randomPastTimestamp(1, 30),
        ]);
    }

    private function weightedRating(): int
    {
        $rand = rand(1, 100);
        if ($rand <= 35) return 5;
        if ($rand <= 70) return 4;
        return 3;
    }

    /**
     * 過去 N日〜M日の範囲で「時刻まで」ランダムなタイムスタンプを返す。
     * `now()->subDays(rand(...))` だと時:分:秒は seed 実行時刻に揃ってしまう。
     */
    private function randomPastTimestamp(int $minDays, int $maxDays): \Illuminate\Support\Carbon
    {
        return now()
            ->subDays(rand($minDays, $maxDays))
            ->setTime(rand(0, 23), rand(0, 59), rand(0, 59));
    }
}
