<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('industry_knowledges', function (Blueprint $table) {
            $table->id();
            $table->string('category');       // 用語解説, 働き方, 手続き, 比較, マナー
            $table->string('slug')->unique();
            $table->string('title');
            $table->jsonb('keywords');         // ["ノルマ", "norma", "売上目標"]
            $table->text('content');
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('industry_knowledges');
    }
};
