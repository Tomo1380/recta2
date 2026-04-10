<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stores', function (Blueprint $table) {
            $table->id();

            // 基本情報
            $table->string('name');
            $table->string('area');
            $table->string('address')->nullable();
            $table->string('nearest_station')->nullable();
            $table->string('category'); // キャバクラ, ラウンジ, クラブ, ガールズバー
            $table->string('business_hours')->nullable();
            $table->string('holidays')->nullable();
            $table->string('phone')->nullable();
            $table->string('website_url')->nullable();

            // 給与・待遇
            $table->integer('hourly_min')->nullable();
            $table->integer('hourly_max')->nullable();
            $table->string('daily_estimate')->nullable();
            $table->jsonb('back_items')->nullable();      // [{label, amount}]
            $table->jsonb('fee_items')->nullable();        // [{label, amount}]
            $table->text('salary_notes')->nullable();

            // 保証・ノルマ
            $table->string('guarantee_period')->nullable();
            $table->text('guarantee_details')->nullable();
            $table->text('norma_info')->nullable();

            // 体入
            $table->string('trial_avg_hourly')->nullable();
            $table->string('trial_hourly')->nullable();
            $table->string('interview_hours')->nullable();
            $table->boolean('same_day_trial')->default(false);

            // 特徴
            $table->jsonb('feature_tags')->nullable();     // ["未経験歓迎", "終電上がりOK"]
            $table->text('description')->nullable();
            $table->text('features_text')->nullable();

            // メディア
            $table->jsonb('images')->nullable();           // [{url, order}]
            $table->string('video_url')->nullable();

            // 店舗分析
            $table->jsonb('analysis')->nullable();         // {experience_level, atmosphere, cast_style, ...}

            // 採用基準・スコア
            $table->text('recruitment_standards')->nullable();   // 自由記述の採用基準
            $table->string('rank')->nullable();                  // S/A/B/C ランク
            $table->integer('gal_point')->nullable();            // ギャル度 0-100
            $table->integer('loose_point')->nullable();          // ゆるさ度 0-100
            $table->integer('age_point')->nullable();            // 年齢層 0-100
            $table->integer('waiwai_point')->nullable();         // わいわい度 0-100
            $table->integer('cute_point')->nullable();           // かわいい度 0-100

            // 給与体系
            $table->string('unit_wage_type')->nullable();        // 時給/日給/月給
            $table->string('payroll_system_type')->nullable();   // 全額日払い/日払い可/月2回/月末 etc
            $table->text('payroll_system_description')->nullable();

            // ドレスコード
            $table->text('dress_code')->nullable();              // 服装規定の詳細

            // 面接・採用
            $table->jsonb('interview_info')->nullable();   // {dress_advice, tips, dress_code, criteria, dialog}

            // 必要書類
            $table->jsonb('required_documents')->nullable(); // {documents: [], notes: ""}

            // 勤務スケジュール
            $table->jsonb('schedule')->nullable();          // {hours, holidays, shift_info}

            // 直近の採用実績
            $table->jsonb('recent_hires')->nullable();      // [{month, count, examples}]
            $table->string('recent_hires_summary')->nullable();

            // 人気の特徴
            $table->jsonb('popular_features')->nullable();  // {features: [], hint: ""}

            // シャンパン情報
            $table->text('champagne_description')->nullable();

            // 送り・交通サポート
            $table->text('transfer_description')->nullable();
            $table->string('transfer_km')->nullable();       // 送り可能距離

            // Q&A
            $table->jsonb('qa')->nullable();                // [{question, answer}]

            // スタッフコメント
            $table->jsonb('staff_comment')->nullable();     // {name, role, comment, supports}

            // 公開ステータス
            $table->enum('publish_status', ['published', 'unpublished', 'draft'])->default('draft');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stores');
    }
};
