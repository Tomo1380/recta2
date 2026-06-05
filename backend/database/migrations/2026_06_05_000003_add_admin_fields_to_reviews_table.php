<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * 口コミの管理者運用フィールド（FB 2026-06-05 B）。
 *
 *  author_name    : 実ユーザーに紐付かない口コミの表示名。桜口コミ(B2)・
 *                   有名キャバ嬢からの口コミ(B3) を管理者が代理入力するときに使う。
 *  is_featured    : 有名キャバ嬢など「フィーチャー口コミ」フラグ(B3)。
 *  store_reply    : 店側からの返答(B4)。管理者が店から聞いた内容を入力する。
 *  store_reply_at : 返答の入力時刻。
 *
 * あわせて user_id を nullable にする（管理者作成の口コミは実ユーザーを持たない）。
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->string('author_name')->nullable()->after('user_id');
            $table->boolean('is_featured')->default(false)->after('status');
            $table->text('store_reply')->nullable()->after('is_featured');
            $table->timestamp('store_reply_at')->nullable()->after('store_reply');
        });

        // 桜/有名嬢口コミは実ユーザーに紐付かないため NOT NULL を外す。
        // partial unique index (user_id, store_id) は NULL を distinct 扱いするので衝突しない。
        DB::statement('ALTER TABLE reviews ALTER COLUMN user_id DROP NOT NULL');
    }

    public function down(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->dropColumn(['author_name', 'is_featured', 'store_reply', 'store_reply_at']);
        });
        DB::statement('ALTER TABLE reviews ALTER COLUMN user_id SET NOT NULL');
    }
};
