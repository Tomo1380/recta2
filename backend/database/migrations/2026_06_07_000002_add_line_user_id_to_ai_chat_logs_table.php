<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * ai_chat_logs に line_user_id を持たせる (2026-06-07 FB)。
 *
 * AIチャットはこれまで user_id (LINEログイン由来) でしか人に紐づいていなかったが、
 * 「LINEトーク基準 (line_user_id)」に寄せる。ログイン時に user.line_user_id を
 * 写しておけば、ログインアカウントが変わってもチャットが人 (line_user_id) に
 * 紐づき続ける。匿名チャット (user_id なし) は引き続き紐づかない (IPのみ)。
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('ai_chat_logs', function (Blueprint $table) {
            $table->string('line_user_id')->nullable()->after('user_id')->index();
        });

        // 既存ログを user 経由でバックフィル。
        DB::statement(<<<'SQL'
            UPDATE ai_chat_logs
            SET line_user_id = users.line_user_id
            FROM users
            WHERE ai_chat_logs.user_id = users.id
              AND ai_chat_logs.line_user_id IS NULL
              AND users.line_user_id IS NOT NULL
        SQL);
    }

    public function down(): void
    {
        Schema::table('ai_chat_logs', function (Blueprint $table) {
            $table->dropColumn('line_user_id');
        });
    }
};
