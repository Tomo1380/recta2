<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * store_videos テーブル新設。
 *
 * 「ナイトワーク店舗の動画は将来 2〜3 本構成になりたい」という要件
 * （店内ツアー / インタビュー / スタッフ紹介を分割して間に説明を挟む）に
 * 対応するため、stores.video_url の単一文字列カラムを置き換える。
 *
 * - label / description は管理画面で自由入力（enum にせず将来カテゴリ追加で詰まないように）
 * - display_order で並べ替え可能
 * - 既存 stores.video_url のデータ移行は別マイグレーションで行う
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('store_videos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('video_url', 500);
            $table->string('label', 100)->nullable();
            $table->text('description')->nullable();
            $table->string('poster_url', 500)->nullable();
            $table->unsignedInteger('display_order')->default(0);
            $table->timestamps();

            // 店舗詳細ページで毎回 store_id でフィルタ + display_order でソートするので
            // 複合インデックスを最初から張る。
            $table->index(['store_id', 'display_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('store_videos');
    }
};
