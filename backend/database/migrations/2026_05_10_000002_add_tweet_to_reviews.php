<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->string('tweet_id', 32)->nullable()->after('body');
            $table->string('tweet_author_screen_name', 64)->nullable()->after('tweet_id');
        });
    }

    public function down(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->dropColumn(['tweet_id', 'tweet_author_screen_name']);
        });
    }
};
