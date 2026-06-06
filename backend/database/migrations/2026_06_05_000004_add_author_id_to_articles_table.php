<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * コラムの作成者（FB 2026-06-05 C1: 一覧に「作成者」を表示）。
 * 作成時の管理ユーザーを記録する。既存記事は null（不明）。
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('articles', function (Blueprint $table) {
            $table->foreignId('author_id')->nullable()->after('status')
                ->constrained('admin_users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('articles', function (Blueprint $table) {
            $table->dropConstrainedForeignId('author_id');
        });
    }
};
