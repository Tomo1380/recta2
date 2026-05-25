<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * 店舗周りのテーブル一式。
 *
 *  stores              : 店舗本体。求人情報を JSONB 中心の柔軟スキーマで保持
 *  store_videos        : 1 店舗あたり複数本の動画（店内ツアー / インタビュー / …）
 *  store_staff_photos  : 在籍女性ギャラリー（インスタリンク付き）
 *  pickup_shops        : トップページの「ピックアップ」枠の並び順管理
 *
 * stores の JSONB カラムには UI 側で扱うネスト構造が入る。各カラムの意図は
 * インラインコメント参照。lat/lng は管理画面の「住所→緯度経度」ボタンで
 * Google Geocoding 経由で書き込み、送り・足代マップで距離別円を描画する。
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('stores', function (Blueprint $table) {
            $table->id();

            // 基本情報
            $table->string('name');
            $table->string('area');
            $table->string('address')->nullable();
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();
            $table->string('nearest_station')->nullable();
            $table->string('category');
            $table->string('phone')->nullable();
            $table->string('website_url')->nullable();

            // 求人スペック（JSONB は UI で扱うネスト構造をそのまま保存）
            $table->jsonb('schedule')->nullable();
            // { open: "20:00", close: "01:00", holidays, shift_info, hours_text }

            $table->jsonb('wage')->nullable();
            // { regular:{min,max,unit}, trial:{hourly,days}, payroll:{type,description}, daily_estimate }

            $table->jsonb('compensation')->nullable();
            // { back:[{label,amount}], fees:[{label,amount}], notes }

            $table->jsonb('guarantee')->nullable();
            // { period, details, norma, same_day_trial }

            $table->jsonb('interview')->nullable();
            // { start, end, dress_advice, tips, criteria, dialog, recruitment_standards }

            // 紹介テキスト＆タグ
            $table->jsonb('feature_tags')->nullable();
            $table->text('description')->nullable();
            $table->text('features_text')->nullable();

            // メディア
            $table->jsonb('images')->nullable();
            $table->jsonb('analysis')->nullable();
            // { experience_level, atmosphere, cast_style, customer_age, drink_style }

            // 採用関連
            $table->jsonb('required_documents')->nullable();
            $table->jsonb('recent_hires')->nullable();
            $table->string('recent_hires_summary')->nullable();
            $table->jsonb('qa')->nullable();
            $table->jsonb('staff_comment')->nullable();

            // シャンパン目安価格（テキーラ／ベル・エポック／アルマンド／ラベイ）
            $table->jsonb('champagne_prices')->nullable();
            // { tequila:{label,amount}, belle_epoque:{...}, armand:{...}, lavay:{...} }
            $table->text('champagne_description')->nullable();

            // 送り・足代
            $table->text('transfer_description')->nullable();
            $table->string('transfer_km')->nullable();
            $table->jsonb('transfer_zones')->nullable();
            // [{ label?, radius_km, fee, color }, ...]

            // ドレスコード（OK/NG 写真ギャラリー）
            $table->jsonb('dress_code')->nullable();
            // { ok_examples:[{image_url,note}], ng_examples:[...], description }

            // セット料金
            $table->jsonb('set_fee')->nullable();
            // { items:[{label,amount,note}], notes }

            // レクタ経由入店女性エピソード
            $table->jsonb('recta_episodes')->nullable();
            // [{ name, instagram_url, photo_url, comment }]

            // 系列店舗
            $table->jsonb('related_store_ids')->nullable(); // [int, ...]

            // フラグ・公開状態
            $table->boolean('experience_guaranteed')->default(false);
            $table->enum('publish_status', ['published', 'unpublished', 'draft'])->default('draft');

            $table->timestamps();

            // 単純インデックス（管理画面の絞り込み・並び替えで使う）
            $table->index('area');
            $table->index('category');
            $table->index('publish_status');
            $table->index('experience_guaranteed');

            // よく使う複合インデックス
            $table->index(['publish_status', 'category'], 'idx_stores_status_category');
            $table->index(['publish_status', 'area'], 'idx_stores_status_area');
            $table->index(['publish_status', 'created_at'], 'idx_stores_status_created');
        });

        // JSONB / 全文検索用の GIN インデックス（pgsql のみ）
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('CREATE INDEX stores_wage_gin_idx ON stores USING gin (wage jsonb_path_ops)');
            DB::statement('CREATE INDEX stores_analysis_gin_idx ON stores USING gin (analysis jsonb_path_ops)');
            DB::statement('CREATE INDEX idx_stores_feature_tags ON stores USING GIN (feature_tags)');

            // ILIKE 検索（pg_trgm 拡張は最初のマイグレで有効化済み）
            DB::statement('CREATE INDEX idx_stores_description_trgm ON stores USING GIN (description gin_trgm_ops)');
            DB::statement('CREATE INDEX idx_stores_features_text_trgm ON stores USING GIN (features_text gin_trgm_ops)');
            DB::statement('CREATE INDEX idx_stores_name_trgm ON stores USING GIN (name gin_trgm_ops)');
        }

        // 1 店舗あたり複数本の動画。label / description で
        // 「店内ツアー」「インタビュー」など UI に出す説明文を持つ。
        Schema::create('store_videos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('video_url', 500);
            $table->string('label', 100)->nullable();
            $table->text('description')->nullable();
            $table->string('poster_url', 500)->nullable();
            $table->unsignedInteger('display_order')->default(0);
            $table->timestamps();

            $table->index(['store_id', 'display_order']);
        });

        // 在籍女性ギャラリー。staff_type は「在籍」「レクタ経由入店」「OG」など
        // UI 上のバッジ表現に使う自由ラベル。
        Schema::create('store_staff_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('image_url', 500);
            $table->string('caption', 255)->nullable();
            $table->string('instagram_url', 500)->nullable();
            $table->string('staff_type', 50)->nullable();
            $table->unsignedInteger('display_order')->default(0);
            $table->timestamps();

            $table->index(['store_id', 'display_order']);
        });

        // トップページ「ピックアップ」枠の並び順管理。is_pr は PR ラベル表示用。
        Schema::create('pickup_shops', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_pr')->default(false);
            $table->boolean('visible')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pickup_shops');
        Schema::dropIfExists('store_staff_photos');
        Schema::dropIfExists('store_videos');
        Schema::dropIfExists('stores');
    }
};
