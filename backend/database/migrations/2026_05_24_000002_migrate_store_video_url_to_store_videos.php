<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * stores.video_url を store_videos に移行し、元カラムを廃止する。
 *
 * - 既存の `video_url` を 1 件ずつ store_videos に label="店舗紹介動画" / display_order=0 で挿入
 * - 移行が終わったら stores.video_url を drop
 *
 * down() ではカラムを戻して store_videos の中身を `video_url` に戻す（最初に登録された
 * `display_order` 最小のものを採用）。
 */
return new class extends Migration {
    public function up(): void
    {
        $now = now();

        // 既存の video_url を新テーブルへコピー。
        // chunkById() で大量データでもメモリを節約しつつ移行する。
        DB::table('stores')
            ->whereNotNull('video_url')
            ->where('video_url', '<>', '')
            ->select('id', 'video_url')
            ->orderBy('id')
            ->chunkById(200, function ($rows) use ($now) {
                $insert = [];
                foreach ($rows as $row) {
                    $insert[] = [
                        'store_id' => $row->id,
                        'video_url' => $row->video_url,
                        'label' => '店舗紹介動画',
                        'description' => null,
                        'poster_url' => null,
                        'display_order' => 0,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }
                if (!empty($insert)) {
                    DB::table('store_videos')->insert($insert);
                }
            });

        Schema::table('stores', function (Blueprint $table) {
            $table->dropColumn('video_url');
        });
    }

    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->string('video_url')->nullable()->after('images');
        });

        // display_order が最小の動画を元 video_url に戻す（1 店舗 1 動画前提）。
        //
        // Laravel の Eloquent `Builder->update()` は UPDATE table JOIN の MySQL
        // 構文を生成するため、PostgreSQL では SQL 構文エラーになる。
        // PostgreSQL は UPDATE ... FROM ... WHERE 構文なので raw SQL を直接書く。
        DB::statement(<<<'SQL'
            UPDATE stores
            SET video_url = v.video_url
            FROM store_videos v
            WHERE v.store_id = stores.id
              AND v.display_order = (
                SELECT MIN(display_order)
                FROM store_videos
                WHERE store_id = stores.id
              )
        SQL);
    }
};
