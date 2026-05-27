<?php

namespace Database\Seeders;

use App\Models\Consultation;
use App\Models\PickupShop;
use App\Models\SiteSetting;
use App\Models\Store;
use Illuminate\Database\Seeder;

class ContentSeeder extends Seeder
{
    public function run(): void
    {
        // Idempotent reseed: clear existing rows so re-running this seeder
        // (after a partial run, or as part of `db:seed --force`) doesn't
        // create duplicate pickup_shops / consultations / site_settings rows.
        // Uses delete() instead of truncate() because pickup_shops has FK
        // dependencies and Postgres truncate cascades aren't always available.
        PickupShop::query()->delete();
        Consultation::query()->delete();
        SiteSetting::query()->delete();

        // Pickup shops - published stores の先頭から拾う。
        // (旧コードは store_id = 1〜20 を hard-coded していたが、auto-increment
        //  リセット後に id 範囲が変わると FK violation で落ちるため、
        //  実在する store_id を動的に取る)
        $storeIds = Store::where('publish_status', 'published')
            ->orderBy('id')
            ->limit(10)
            ->pluck('id')
            ->all();

        $pickupVariations = [
            ['is_pr' => true,  'visible' => true],
            ['is_pr' => false, 'visible' => true],
            ['is_pr' => false, 'visible' => true],
            ['is_pr' => true,  'visible' => true],
            ['is_pr' => false, 'visible' => true],
            ['is_pr' => false, 'visible' => true],
            ['is_pr' => true,  'visible' => true],
            ['is_pr' => false, 'visible' => true],
            ['is_pr' => false, 'visible' => false], // hidden
            ['is_pr' => false, 'visible' => false], // hidden
        ];

        foreach ($storeIds as $i => $storeId) {
            $variation = $pickupVariations[$i] ?? ['is_pr' => false, 'visible' => true];
            PickupShop::create([
                'store_id' => $storeId,
                'sort_order' => $i,
                ...$variation,
            ]);
        }

        // Consultations - question + answer pairs surfaced on the top page
        // "みんなの相談" feed and editable from /admin/content.
        $consultations = [
            ['question' => 'ノルマなしのお店は本当にある？', 'answer' => 'あります！特にラウンジやスナックはノルマなしのお店が多いです。キャバクラでも最近はノルマなしを打ち出すお店が増えています。求人情報の絞り込みで「ノルマなし」を選んでみてください。', 'tag' => '#条件', 'count' => 1100, 'sort_order' => 1],
            ['question' => '容姿に自信がなくても大丈夫？', 'answer' => '大丈夫です！ナイトワークは容姿だけでなく、会話力や雰囲気、気配りなど総合的な魅力が大切です。お店によって求める雰囲気も違うので、自分に合ったお店がきっと見つかりますよ。', 'tag' => '#不安', 'count' => 1400, 'sort_order' => 2],
            ['question' => 'バレずに働ける方法はある？', 'answer' => '多くのお店がプライバシー保護に配慮しています。源氏名の使用、写真掲載NG、特定エリアのお客様ブロックなど対策はさまざま。面接時に相談すれば柔軟に対応してくれるお店が多いです。', 'tag' => '#プライバシー', 'count' => 2300, 'sort_order' => 3],
            ['question' => '渋谷エリアの時給相場は？', 'answer' => '渋谷エリアの相場は、ラウンジで時給3,000〜5,000円、キャバクラで時給4,000〜7,000円程度が目安です。お店や経験によって変動しますので、Rectaの絞り込みで比較してみてください。', 'tag' => '#エリア', 'count' => 920, 'sort_order' => 4],
            ['question' => '昼職との両立は可能？', 'answer' => '掛け持ちしている方はとても多いです。週末だけ、平日の夜だけなど柔軟に働けるお店を選べば無理なく両立できます。Rectaでは勤務時間帯でも絞り込みできますよ。', 'tag' => '#働き方', 'count' => 780, 'sort_order' => 5],
            ['question' => '初日の服装はどうすればいい？', 'answer' => '初日(体入時)はドレスの貸出があるお店が多いので、私服で来店して問題ない店がほとんどです。事前に「ドレス貸出あり」かは面接時に確認しておくと安心。露出控えめで清潔感のある服装で来店すれば失礼になりません。', 'tag' => '#体入', 'count' => 650, 'sort_order' => 6],
            ['question' => 'お酒が飲めなくても働ける？', 'answer' => '飲めなくても問題ないお店はたくさんあります！ソフトドリンクやノンアルコールで対応できるお店も多いです。面接時に正直に伝えれば、配慮してもらえますよ。', 'tag' => '#不安', 'count' => 1850, 'sort_order' => 7],
            ['question' => 'キャバクラとラウンジの違いは？', 'answer' => '大きな違いは接客スタイルです。キャバクラは指名制でマンツーマン、ラウンジはフリーで複数のお客様と会話するスタイルが一般的。ラウンジの方がカジュアルな雰囲気のお店が多いです。', 'tag' => '#業種', 'count' => 1200, 'sort_order' => 8],
            ['question' => '体験入店ってどんな流れ？', 'answer' => '一般的には ①お店に到着 → ②簡単な説明 → ③ドレスに着替え → ④2〜3時間ほど接客体験 → ⑤体験終了・お給料受け取り、という流れです。気軽に雰囲気を見られるので、まずは体験からがおすすめ。', 'tag' => '#体入', 'count' => 2100, 'sort_order' => 9],
            ['question' => '送迎ありのお店が知りたい', 'answer' => '送迎サービスは多くのお店で用意されています。自宅近くまで送ってもらえる店、駅までの送迎など形態はさまざま。Rectaで「送迎あり」絞り込みをお試しください。', 'tag' => '#待遇', 'count' => 640, 'sort_order' => 10],
        ];

        foreach ($consultations as $consultation) {
            Consultation::create($consultation);
        }

        // Site settings
        $settings = [
            'hero_tagline' => 'AIと探す、理想のナイトワーク',
            // BUG-E13: 実店舗数 (75件規模) と乖離していたため修正。
            // 数値を明示せず、エリア感を出すコピーに寄せる。
            'hero_subtitle' => 'キャバクラ・ラウンジ・クラブ｜都内主要エリアを網羅',
            'hero_badge' => 'ナイトワーク求人',
            'hero_ai_label' => 'AI MATCHING',
        ];

        foreach ($settings as $key => $value) {
            SiteSetting::create(['key' => $key, 'value' => $value]);
        }
    }
}
