<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 口コミ。LINE ログイン済みユーザーが store に対して 1〜5 の rating と body を投稿。
 *
 * tweet_id / tweet_author_screen_name は X (旧 Twitter) ポストを口コミとして
 * 取り込んだ場合に元ツイートへのリンク・著者名を持つ。
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('store_id')->constrained()->onDelete('cascade');
            $table->integer('rating'); // 1-5
            $table->text('body');
            $table->string('tweet_id', 32)->nullable();
            $table->string('tweet_author_screen_name', 64)->nullable();
            $table->enum('status', ['published', 'unpublished', 'deleted'])->default('published');
            $table->timestamps();

            $table->index(['store_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reviews');
    }
};
