<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * 編集系コンテンツ（コラム・相談・サイト設定・業界知識）まとめ。
 *
 *  articles            : コラム CMS。body は TipTap JSON、body_html は表示用
 *  consultations       : みんなの相談（質問 + 任意回答）
 *  site_settings       : key/value 任意設定（フッターリンク、Footer 文言など）
 *  industry_knowledges : AI チャットが参照する業界用語辞典
 *                        keywords JSONB に検索用同義語を入れて GIN で当てる
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('articles', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('title');
            $table->text('excerpt')->nullable();
            $table->jsonb('body')->nullable();
            $table->text('body_html')->nullable();
            $table->string('thumbnail_url', 2048)->nullable();
            $table->string('category')->nullable();
            $table->jsonb('tags')->nullable();
            $table->string('status', 20)->default('draft');
            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('published_at');
            $table->index('category');
        });

        Schema::create('consultations', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->text('question');
            $table->text('answer')->nullable();
            $table->string('tag', 100);
            $table->integer('count')->default(0);
            $table->boolean('visible')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('site_settings', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('key', 255)->unique();
            $table->text('value')->nullable();
            $table->timestamps();
        });

        Schema::create('industry_knowledges', function (Blueprint $table) {
            $table->id();
            $table->string('category');
            $table->string('slug')->unique();
            $table->string('title');
            $table->jsonb('keywords');
            $table->text('content');
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('CREATE INDEX idx_knowledge_keywords ON industry_knowledges USING GIN (keywords)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('industry_knowledges');
        Schema::dropIfExists('site_settings');
        Schema::dropIfExists('consultations');
        Schema::dropIfExists('articles');
    }
};
