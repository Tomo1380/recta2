<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * areas / categories は store の絞り込みフィルタとして使われる。
 *
 * - areas      : エリア名（六本木、銀座、池袋、…）。slug は URL に出る
 * - categories : 業種カテゴリ（キャバクラ、ラウンジ、クラブ、…）。
 *                image_url はトップページのカテゴリカードに使う
 *                （以前はフロント側の CATEGORY_IMAGES ハードコード辞書だった）
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('areas', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('name', 255);
            $table->string('slug', 255)->unique();
            $table->boolean('visible')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('categories', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('name', 255);
            $table->string('slug', 255)->unique();
            $table->string('image_url', 500)->nullable();
            $table->boolean('visible')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('categories');
        Schema::dropIfExists('areas');
    }
};
