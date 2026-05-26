<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * BUG-E14: 「キャバクラ」カテゴリのスラッグを cabaret → cabaclub に統一する。
 * `cabaret` は英語で「キャバレー」を指すため業態名と乖離しており、
 * `cabaclub` (Article slug の cabaclub-vs-lounge 等で既に使用) に合わせる。
 */
return new class extends Migration {
    public function up(): void
    {
        DB::table('categories')
            ->where('slug', 'cabaret')
            ->update(['slug' => 'cabaclub']);
    }

    public function down(): void
    {
        DB::table('categories')
            ->where('slug', 'cabaclub')
            ->update(['slug' => 'cabaret']);
    }
};
