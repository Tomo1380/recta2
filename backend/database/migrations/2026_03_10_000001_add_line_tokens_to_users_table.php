<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('line_access_token')->nullable()->after('line_picture_url');
            $table->string('line_refresh_token')->nullable()->after('line_access_token');
            $table->timestamp('line_token_expires_at')->nullable()->after('line_refresh_token');
            $table->text('bio')->nullable()->after('experience');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'line_access_token',
                'line_refresh_token',
                'line_token_expires_at',
                'bio',
            ]);
        });
    }
};
