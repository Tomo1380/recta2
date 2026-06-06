<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 上京ロゴ/バナーの表示可否（FB 2026-06-05 D3）。
 *
 * 東京・新地・ミナミなど「上京して働く」訴求が効くエリアの店舗だけ ON にする想定。
 * 既定は false（表示しない）。
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->boolean('show_relocate_badge')->default(false)->after('experience_guaranteed');
        });
    }

    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->dropColumn('show_relocate_badge');
        });
    }
};
