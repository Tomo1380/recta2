<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            // 店舗設備の写真 (トイレ / 更衣室 / 店内セット場所 など)。
            // 女性が気にする「働く環境」を可視化するためのギャラリー。
            // 形式: [{ image_url: string, caption: string }]
            $table->jsonb('facility_photos')->nullable()->after('images');
        });
    }

    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->dropColumn('facility_photos');
        });
    }
};
