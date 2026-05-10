<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Whether to display the user's LINE profile picture as their
            // public avatar (on reviews etc). Defaults to false so that
            // people who don't want their LINE icon shown publicly aren't
            // surprised. Falls back to a name-initial avatar.
            $table->boolean('use_line_avatar')->default(false)->after('line_picture_url');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('use_line_avatar');
        });
    }
};
