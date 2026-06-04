<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            // 店舗まとめ (例「六本木ポセイドンまとめ」)。SEO/回遊目的の長文フリー
            // テキスト。改行と [表示文字](URL) 形式の内部/外部リンクに対応。
            $table->text('summary_text')->nullable()->after('features_text');
        });
    }

    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->dropColumn('summary_text');
        });
    }
};
