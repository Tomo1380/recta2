<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 計測リンクを「ラベルのみ」に簡素化 (2026-06-07 FB)。
 *
 * 種別(target_type)・店舗/記事/エリアの紐付けは運用が複雑な割に効果が薄いため撤去。
 * リンクは「ラベル＋飛び先(既定LINE)」だけにし、経路ランキングはラベルで識別する。
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('tracking_links', function (Blueprint $table) {
            if (Schema::hasColumn('tracking_links', 'store_id')) {
                $table->dropConstrainedForeignId('store_id');
            }
            if (Schema::hasColumn('tracking_links', 'article_id')) {
                $table->dropConstrainedForeignId('article_id');
            }
        });

        Schema::table('tracking_links', function (Blueprint $table) {
            foreach (['target_type', 'area'] as $col) {
                if (Schema::hasColumn('tracking_links', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }

    public function down(): void
    {
        Schema::table('tracking_links', function (Blueprint $table) {
            if (! Schema::hasColumn('tracking_links', 'target_type')) {
                $table->string('target_type')->default('standalone')->index();
            }
            if (! Schema::hasColumn('tracking_links', 'store_id')) {
                $table->foreignId('store_id')->nullable()->constrained()->nullOnDelete();
            }
            if (! Schema::hasColumn('tracking_links', 'article_id')) {
                $table->foreignId('article_id')->nullable()->constrained()->nullOnDelete();
            }
            if (! Schema::hasColumn('tracking_links', 'area')) {
                $table->string('area')->nullable();
            }
        });
    }
};
