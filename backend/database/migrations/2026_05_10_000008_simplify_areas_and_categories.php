<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Drop the unused tier/color metadata that the user-facing pages don't
     * actually consume, and add image_url to categories so the top page
     * category cards stop relying on a hardcoded CATEGORY_IMAGES dict.
     */
    public function up(): void
    {
        Schema::table('areas', function (Blueprint $table) {
            $table->dropColumn('tier');
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->dropColumn('color');
            $table->string('image_url', 500)->nullable()->after('slug');
        });
    }

    public function down(): void
    {
        Schema::table('areas', function (Blueprint $table) {
            $table->enum('tier', ['gold', 'standard'])->default('standard');
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->dropColumn('image_url');
            $table->string('color', 7)->default('#6366f1');
        });
    }
};
