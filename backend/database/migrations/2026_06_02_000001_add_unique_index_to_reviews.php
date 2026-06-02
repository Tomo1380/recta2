<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * 口コミ重複投稿の競合状態 (TOCTOU) 対策。
 *
 * PublicReviewController::store は exists() チェック → create() の 2 段で
 * 重複を防いでいたが、同一ユーザーの並行リクエストで両方が check を通過し
 * 二重投稿が成立しうる。DB 側に「削除済み以外で (user_id, store_id) は一意」
 * の部分ユニークインデックスを張り、最終的な整合性を DB で保証する。
 * (status='deleted' は除外するので、削除後の再投稿は許可される)
 */
return new class extends Migration {
    public function up(): void
    {
        // 既存データに (user_id, store_id) の重複アクティブ口コミがあると
        // ユニークインデックス作成が失敗する。最も古い 1 件を残し、残りを
        // status='deleted' にしてから index を張る (本番でも既存口コミがあれば安全)。
        DB::statement(
            "UPDATE reviews SET status = 'deleted'
             WHERE id IN (
                 SELECT id FROM (
                     SELECT id, ROW_NUMBER() OVER (
                         PARTITION BY user_id, store_id ORDER BY id
                     ) AS rn
                     FROM reviews WHERE status <> 'deleted'
                 ) dup WHERE dup.rn > 1
             )"
        );

        DB::statement(
            "CREATE UNIQUE INDEX reviews_user_store_active_unique
             ON reviews (user_id, store_id)
             WHERE status <> 'deleted'"
        );
    }

    public function down(): void
    {
        Schema::table('reviews', function () {
            DB::statement('DROP INDEX IF EXISTS reviews_user_store_active_unique');
        });
    }
};
