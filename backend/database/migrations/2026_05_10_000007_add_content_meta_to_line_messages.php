<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('line_messages', function (Blueprint $table) {
            $table->jsonb('content_meta')->nullable()->after('content');
        });
    }

    public function down(): void
    {
        Schema::table('line_messages', function (Blueprint $table) {
            $table->dropColumn('content_meta');
        });
    }
};
