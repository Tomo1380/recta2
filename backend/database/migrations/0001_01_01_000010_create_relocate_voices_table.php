<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 「上京した先輩の声」セクションのデータソース。
 *
 * relocate-support ページのカードに 1 行ずつ並ぶ短いストーリー。
 * 写真や年齢などは持たない最小構成（出身地 → 勤務地 + 本文だけ）。
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('relocate_voices', function (Blueprint $table) {
            $table->id();
            $table->string('area_from');
            $table->string('area_to');
            $table->text('body');
            $table->boolean('visible')->default(true);
            $table->integer('display_order')->default(0);
            $table->timestamps();

            $table->index(['visible', 'display_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('relocate_voices');
    }
};
