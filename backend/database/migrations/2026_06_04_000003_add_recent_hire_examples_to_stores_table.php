<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            // 採用例 (例「20歳 未経験 → 時給5,000円スタート」)。旧来は recent_hires
            // の各月に紐付いていたが、月単位で持つ必然性がないためセクション単位の
            // フリーテキスト配列に変更。string[] を jsonb で保持。
            $table->jsonb('recent_hire_examples')->nullable()->after('recent_hires_summary');
        });
    }

    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->dropColumn('recent_hire_examples');
        });
    }
};
