<?php

namespace Database\Seeders;

use App\Models\Consultation;
use App\Models\SiteSetting;
use Illuminate\Database\Seeder;

/**
 * リリース前 QA テスト用のクリーン環境シーダー。
 * 既存の本番風 DatabaseSeeder と違い、店舗・口コミ・AIチャットログ等の
 * 「テスト中に手動で作るもの」は seed せず、最低限のマスタと
 * 管理者/テストユーザーだけを入れる。
 *
 * 使い方:
 *   php artisan migrate:fresh --seeder=TestQaSeeder
 *
 * 含むもの:
 * - 管理者アカウント 2件 (admin@recta2.jp / password)
 * - エリア・カテゴリマスタ
 * - AIチャット既定設定
 * - LINEユーザー 11名 (各状態網羅)
 * - LINE友だち状態
 * - ヒーロー文言・相談Q&A
 *
 * 含まないもの (テスト中に手動で作成 or 不要):
 * - 店舗・口コミ・ピックアップ
 * - コラム記事
 * - AIチャットログ
 * - 上京者の声・FineTuningQA・業界知識
 */
class TestQaSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            AdminUserSeeder::class,
            AreaCategorySeeder::class,
            AiChatSettingSeeder::class,
            AiChatLimitSeeder::class,
            UserSeeder::class,
            LineFriendSeeder::class,
        ]);

        // Site settings (ヒーロー文言など) と相談Q&A を直接投入。
        // 本番用 ContentSeeder は pickup_shops が store FK で詰まるので、
        // ここでは pickup_shops を除いた最小サブセットを入れる。
        $this->seedSiteSettings();
        $this->seedConsultations();
    }

    private function seedSiteSettings(): void
    {
        $settings = [
            'hero_tagline' => 'AIと探す、理想のナイトワーク',
            'hero_subtitle' => 'キャバクラ・ラウンジ・クラブ｜都内主要エリアを網羅',
            'hero_badge' => 'ナイトワーク求人',
            'hero_ai_label' => 'AI MATCHING',
        ];

        foreach ($settings as $key => $value) {
            SiteSetting::create(['key' => $key, 'value' => $value]);
        }
    }

    private function seedConsultations(): void
    {
        $consultations = [
            ['question' => 'ノルマなしのお店は本当にある？', 'answer' => 'あります！求人の絞り込みで「ノルマなし」を選んでください。', 'tag' => '#条件', 'count' => 1100, 'sort_order' => 1],
            ['question' => '容姿に自信がなくても大丈夫？', 'answer' => '大丈夫です。会話力や雰囲気、気配りなど総合的な魅力が大切です。', 'tag' => '#不安', 'count' => 1400, 'sort_order' => 2],
            ['question' => 'バレずに働ける方法はある？', 'answer' => 'プライバシー対策はお店ごとに用意されています。面接時にご相談ください。', 'tag' => '#プライバシー', 'count' => 2300, 'sort_order' => 3],
        ];

        foreach ($consultations as $row) {
            Consultation::create($row + ['visible' => true]);
        }
    }
}
