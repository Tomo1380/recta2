<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * 「1店舗1口コミ」制限の撤廃 (2026-06-12 FB)。
 *
 * 同一ユーザーが同じ店舗に複数回口コミを投稿できるようにするため、
 * 2026_06_02_000001 で張った部分ユニークインデックスを削除する。
 * アプリ側の重複チェック (PublicReviewController) も同時に撤去済み。
 */
return new class extends Migration {
    public function up(): void
    {
        DB::statement('DROP INDEX IF EXISTS reviews_user_store_active_unique');
    }

    public function down(): void
    {
        // 復元時に重複アクティブ口コミがあると作成に失敗するので、
        // 元マイグレーションと同じく最古の 1 件を残して deleted に落とす。
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
};
