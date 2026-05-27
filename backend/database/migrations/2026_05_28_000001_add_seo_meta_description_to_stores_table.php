<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            // 検索結果用 meta description。120〜140 文字想定だが、運営の
            // 入力ミスや長文も受け入れたいので text にしておく (空 = 自動生成)。
            $table->text('seo_meta_description')->nullable()->after('description');
        });
    }

    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->dropColumn('seo_meta_description');
        });
    }
};
