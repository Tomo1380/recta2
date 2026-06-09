<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 「採用基準が近い店舗」(管理者が手動で紐付ける回遊動線)。
 *
 * 系列店 (related_store_ids) とは別軸で、採用ハードル・客層が近い店を提示し、
 * 比較・回遊させやすくする (FB: 店舗管理③)。
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->jsonb('recruitment_similar_store_ids')->nullable()->after('related_store_ids');
        });
    }

    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->dropColumn('recruitment_similar_store_ids');
        });
    }
};
