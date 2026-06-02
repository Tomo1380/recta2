<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 未ログイン IP 単位の利用上限集計 (UsageLimitGuard) は
 * `where('ip_address', $ip)->whereDate('created_at', ...)` を毎チャットで実行するが、
 * ai_chat_logs には (ip_address, created_at) の複合インデックスが無く、行数増加で
 * フルスキャンになる。利用者が多い想定なのでインデックスを追加する。
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('ai_chat_logs', function (Blueprint $table) {
            $table->index(['ip_address', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('ai_chat_logs', function (Blueprint $table) {
            $table->dropIndex(['ip_address', 'created_at']);
        });
    }
};
