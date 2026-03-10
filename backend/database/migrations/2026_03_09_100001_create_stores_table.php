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

            // シャンパンメニュー（画像）
            $table->jsonb('champagne_images')->nullable();  // [{url}]

            // 送り・交通サポート（画像）
            $table->jsonb('transport_images')->nullable();  // [{url}]

            // アフター・同伴スポット
            $table->jsonb('after_spots')->nullable();       // [{name, genre, distance}]
            $table->jsonb('companion_spots')->nullable();   // [{name, genre, distance}]

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
