<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('articles', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('title');
            $table->text('excerpt')->nullable();
            $table->jsonb('body')->nullable();        // TipTap JSON document
            $table->text('body_html')->nullable();    // Rendered HTML for public display
            $table->string('thumbnail_url', 2048)->nullable();
            $table->string('category')->nullable();   // e.g. "業界解説", "店舗特集", "上京サポート"
            $table->jsonb('tags')->nullable();        // ["キャバクラ", "ラウンジ"]
            $table->string('status', 20)->default('draft'); // draft / published
            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('published_at');
            $table->index('category');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('articles');
    }
};
