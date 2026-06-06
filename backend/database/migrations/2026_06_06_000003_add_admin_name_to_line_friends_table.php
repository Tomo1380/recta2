<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 管理画面上の表示名 admin_name を line_friends に追加 (2026-06-06 FB)。
 *
 * display_name は LINE 本来の表示名 (プロフィール取得 or LINE ログイン由来) を保持し、
 * admin_name は運営が分かりやすいように付ける別名。一覧では admin_name 優先で表示し、
 * 詳細では元の LINE 名 (display_name) も確認できるようにする。
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('line_friends', function (Blueprint $table) {
            $table->string('admin_name')->nullable()->after('display_name');
        });
    }

    public function down(): void
    {
        Schema::table('line_friends', function (Blueprint $table) {
            $table->dropColumn('admin_name');
        });
    }
};
