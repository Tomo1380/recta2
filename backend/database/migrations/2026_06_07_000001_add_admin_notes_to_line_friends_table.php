<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 管理メモ admin_notes を line_friends に追加 (2026-06-07 FB)。
 *
 * 人物 (line_user_id) を主エンティティとして扱うため、表示名 (admin_name) と
 * 同じく管理メモも友だち側に持たせ、LINEログイン未連携の相手にも書けるようにする。
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('line_friends', function (Blueprint $table) {
            $table->text('admin_notes')->nullable()->after('admin_name');
        });
    }

    public function down(): void
    {
        Schema::table('line_friends', function (Blueprint $table) {
            $table->dropColumn('admin_notes');
        });
    }
};
