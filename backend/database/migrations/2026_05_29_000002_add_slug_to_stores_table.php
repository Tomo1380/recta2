<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            // SEO 用 URL slug。"店舗名-エリア" のローマ字化、最大 160 文字。
            // 既存店舗は BackfillStoreSlugs コマンドで一括埋める。
            // unique 制約で同名衝突は backfill 時に末尾連番で回避する。
            $table->string('slug', 160)->nullable()->unique()->after('id');
        });
    }

    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->dropUnique(['slug']);
            $table->dropColumn('slug');
        });
    }
};
