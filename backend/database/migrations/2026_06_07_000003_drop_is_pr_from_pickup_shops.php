<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ピックアップの is_pr (PRラベル) を廃止 (2026-06-07 FB)。
 *
 * ピックアップは「運営のおすすめ」枠で有料/スポンサード枠ではないため PR 表記は不要。
 * UIに反映されていない死にフラグでもあったので列ごと削除する。
 */
return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasColumn('pickup_shops', 'is_pr')) {
            Schema::table('pickup_shops', function (Blueprint $table) {
                $table->dropColumn('is_pr');
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasColumn('pickup_shops', 'is_pr')) {
            Schema::table('pickup_shops', function (Blueprint $table) {
                $table->boolean('is_pr')->default(false);
            });
        }
    }
};
