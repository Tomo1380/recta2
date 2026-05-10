<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP TABLE IF EXISTS stores CASCADE');
        } else {
            Schema::dropIfExists('stores');
        }

        Schema::create('stores', function (Blueprint $table) {
            $table->id();

            $table->string('name');
            $table->string('area');
            $table->string('address')->nullable();
            $table->string('nearest_station')->nullable();
            $table->string('category');
            $table->string('phone')->nullable();
            $table->string('website_url')->nullable();
            $table->string('rank')->nullable();

            $table->jsonb('schedule')->nullable();
            // {
            //   open: "20:00", close: "01:00",
            //   holidays: "日曜",
            //   shift_info: "週2日〜OK",
            //   hours_text: "20:00〜LAST"
            // }

            $table->jsonb('wage')->nullable();
            // {
            //   regular: { min: 4000, max: 8000, unit: "hour" },
            //   trial:   { hourly: 5000, days: 3 },
            //   payroll: { type: "daily", description: "全額日払い可" },
            //   daily_estimate: "30,000〜80,000円"
            // }

            $table->jsonb('compensation')->nullable();
            // {
            //   back: [{label, amount}],
            //   fees: [{label, amount}],
            //   notes: "..."
            // }

            $table->jsonb('guarantee')->nullable();
            // {
            //   period: "3ヶ月",
            //   details: "...",
            //   norma: "ノルマなし",
            //   same_day_trial: true
            // }

            $table->jsonb('cast_profile')->nullable();
            // { gal:50, loose:30, age:40, waiwai:60, cute:70 }

            $table->jsonb('interview')->nullable();
            // {
            //   start: "14:00", end: "19:00",
            //   dress_advice: "...",
            //   tips: "...",
            //   criteria: "...",
            //   dialog: "...",
            //   recruitment_standards: "..."
            // }

            $table->jsonb('feature_tags')->nullable();
            $table->text('description')->nullable();
            $table->text('features_text')->nullable();

            $table->jsonb('images')->nullable();
            $table->string('video_url')->nullable();

            $table->jsonb('analysis')->nullable();
            // { experience_level, atmosphere, cast_style, customer_age, drink_style }

            $table->jsonb('required_documents')->nullable();
            $table->jsonb('recent_hires')->nullable();
            $table->string('recent_hires_summary')->nullable();
            $table->jsonb('popular_features')->nullable();
            $table->jsonb('qa')->nullable();
            $table->jsonb('staff_comment')->nullable();

            $table->jsonb('champagne_prices')->nullable();
            // { tequila:{label,amount,image_url}, belle_epoque:{...}, armand:{...}, lavay:{...} }
            $table->text('champagne_description')->nullable();

            $table->text('transfer_description')->nullable();
            $table->string('transfer_km')->nullable();
            $table->string('transfer_map_image_url')->nullable();
            $table->jsonb('transfer_zones')->nullable();
            // [{ radius_km: 3, fee: 0, color: "#22c55e" }, ...]

            $table->jsonb('dress_code')->nullable();
            // { ok_examples: [{image_url, note}], ng_examples: [...], description }

            $table->jsonb('set_fee')->nullable();
            // { items: [{label, amount, note}], notes }

            $table->jsonb('salary_simulator')->nullable();
            // { default_hourly: 5000, default_sales: 500000, default_nominations: 30,
            //   formulas: [{label, expression}] }

            $table->jsonb('recta_episodes')->nullable();
            // [{ name, instagram_url, photo_url, comment }]

            $table->jsonb('related_store_ids')->nullable(); // [int, ...]

            $table->boolean('experience_guaranteed')->default(false);
            // FB④: 体験確約フラグ

            $table->enum('publish_status', ['published', 'unpublished', 'draft'])->default('draft');

            $table->timestamps();

            $table->index('area');
            $table->index('category');
            $table->index('publish_status');
            $table->index('experience_guaranteed');
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('CREATE INDEX stores_wage_gin_idx ON stores USING gin (wage jsonb_path_ops)');
            DB::statement('CREATE INDEX stores_feature_tags_gin_idx ON stores USING gin (feature_tags jsonb_path_ops)');
            DB::statement('CREATE INDEX stores_analysis_gin_idx ON stores USING gin (analysis jsonb_path_ops)');
        }

        // Re-create foreign keys that referenced the old stores table.
        // CASCADE drop above removed them; restore so dependent tables stay consistent.
        if (Schema::hasTable('reviews')) {
            Schema::table('reviews', function (Blueprint $table) {
                $table->foreign('store_id')->references('id')->on('stores')->cascadeOnDelete();
            });
        }
        if (Schema::hasTable('pickup_shops')) {
            Schema::table('pickup_shops', function (Blueprint $table) {
                $table->foreign('store_id')->references('id')->on('stores')->cascadeOnDelete();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('stores');
    }
};
