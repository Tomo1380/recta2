<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * コラム刷新（FB 2026-06-05 C2-C4）。
 *
 *  section            : コラムTOPの上段ナビ用の大テーマ
 *                       （夜の始め方 / エリア別比較 / 地方から上京 / Q&A）。
 *  related_store_ids  : 「この記事で紹介した店舗」(C4 回遊動線)。管理者が手動で紐付ける。
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('articles', function (Blueprint $table) {
            $table->string('section')->nullable()->after('category')->index();
            $table->jsonb('related_store_ids')->nullable()->after('section');
        });
    }

    public function down(): void
    {
        Schema::table('articles', function (Blueprint $table) {
            $table->dropColumn(['section', 'related_store_ids']);
        });
    }
};
