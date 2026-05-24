<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * store_staff_photos — 在籍女性ギャラリー。
 *
 * フィードバック原文「在籍してる女性のインスタやレクタ経由入店女性の
 * 写真など掲載」。写真がないと雰囲気が分かりにくいという指摘への対応。
 *
 * カラム設計:
 * - image_url:     掲載画像URL（後で uploadImage エンドポイントを足して storage 連携）
 * - caption:       「在籍2年・指名No.1」みたいな短い紹介文（任意）
 * - instagram_url: 任意。インスタプロフへの外部リンク
 * - staff_type:    自由ラベル。「在籍」「レクタ経由入店」「OG」など UI 上のバッジ表現に使う
 * - display_order: 並び順
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('store_staff_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('image_url', 500);
            $table->string('caption', 255)->nullable();
            $table->string('instagram_url', 500)->nullable();
            $table->string('staff_type', 50)->nullable();
            $table->unsignedInteger('display_order')->default(0);
            $table->timestamps();

            $table->index(['store_id', 'display_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('store_staff_photos');
    }
};
