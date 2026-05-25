<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * PostgreSQL 拡張を最初に有効化しておく。後続のマイグレーションで
 * GIN trigram index を `stores.name` / `description` / `features_text` 等に
 * 張るために pg_trgm が必須。SQLite テスト環境では何もしない。
 *
 * - pg_trgm  : ILIKE 検索を GIN trigram index で加速
 * - unaccent : ローマ字/ベトナム語混じり検索をアクセント無視で当てる
 */
return new class extends Migration {
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm');
        DB::statement('CREATE EXTENSION IF NOT EXISTS unaccent');
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('DROP EXTENSION IF EXISTS unaccent');
        DB::statement('DROP EXTENSION IF EXISTS pg_trgm');
    }
};
