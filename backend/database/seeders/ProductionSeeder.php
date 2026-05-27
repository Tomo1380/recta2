<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * 本番環境への 1 回目投入用シーダー。
 *
 * 旧 RenderSeeder の置き換え (Render.com デプロイは使っていない)。
 *
 * 設計方針:
 *   - **店舗 / 口コミ / AIチャットログは入れない**。これらは運営が実データで
 *     入れるので、Faker で作った見本データを本番に混ぜない。
 *   - **マスター/設定/AI 教材のみ** seed する。管理画面ですぐ運用を始められる
 *     状態を作る。
 *   - **冪等**: 既存データがあるテーブルはスキップ。再実行しても重複しない。
 *
 * 使い方:
 *   php artisan db:seed --class=ProductionSeeder
 *
 * 含むもの:
 *   - admin_users (管理者ログイン用)
 *   - areas / categories (マスター)
 *   - ai_chat_settings (top/list/detail の 3 件、初期は disabled で投入)
 *   - ai_chat_limits (利用上限の singleton)
 *   - consultations (TOP の「みんなの相談」)
 *   - site_settings (hero 文言)
 *   - industry_knowledges (AI が参照する業界用語)
 *   - fine_tuning_qa (FT モデル教材)
 *   - relocate_voices (上京した先輩の声)
 *
 * 含まないもの (本番では運営が手動投入):
 *   - stores
 *   - users (LINE 経由でエンドユーザーが登録される)
 *   - reviews (ユーザーが投稿する)
 *   - line_friends (Webhook で自動登録される)
 *   - ai_chat_logs (実利用で蓄積される)
 *   - pickup_shops (実店舗が入ってから運営が選ぶ)
 *   - articles (運営がコラムを書く)
 */
class ProductionSeeder extends Seeder
{
    public function run(): void
    {
        // 管理者ユーザー (なければ作成)
        if (\App\Models\AdminUser::count() === 0) {
            $this->call(AdminUserSeeder::class);
        }

        // エリア・カテゴリマスター (なければ作成)
        if (\App\Models\Area::count() === 0 || \App\Models\Category::count() === 0) {
            $this->call(AreaCategorySeeder::class);
        }

        // AI チャット既定設定 (top/list/detail) - なければ作成
        if (\App\Models\AiChatSetting::count() === 0) {
            $this->call(AiChatSettingSeeder::class);
        }

        // AI チャット利用上限 singleton (なければ作成)
        if (\App\Models\AiChatLimit::count() === 0) {
            $this->call(AiChatLimitSeeder::class);
        }

        // TOP の「みんなの相談」と hero 文言。
        // ※ ContentSeeder は pickup_shops も含むが、本番では店舗が空なので
        //   実質 consultations と site_settings だけが入る。
        //   PickupShop::query()->delete() で先頭から消すため冪等。
        if (\App\Models\Consultation::count() === 0 && \App\Models\SiteSetting::count() === 0) {
            $this->call(ContentSeeder::class);
        }

        // 業界ナレッジ (AI チャットの参照元)
        if (\App\Models\IndustryKnowledge::count() === 0) {
            $this->call(IndustryKnowledgeSeeder::class);
        }

        // Fine-tuning Q&A 教材
        if (\App\Models\FineTuningQa::count() === 0) {
            $this->call(FineTuningQaSeeder::class);
        }

        // 上京した先輩の声 (LP コンテンツ)
        if (\App\Models\RelocateVoice::count() === 0) {
            $this->call(RelocateVoiceSeeder::class);
        }
    }
}
