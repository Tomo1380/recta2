<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'nickname')) {
                $table->string('nickname')->nullable()->after('line_picture_url');
            }
            if (!Schema::hasColumn('users', 'age')) {
                $table->integer('age')->nullable()->after('nickname');
            }
            if (!Schema::hasColumn('users', 'preferred_area')) {
                $table->string('preferred_area')->nullable()->after('age');
            }
            if (!Schema::hasColumn('users', 'preferred_category')) {
                $table->string('preferred_category')->nullable()->after('preferred_area');
            }
            if (!Schema::hasColumn('users', 'experience')) {
                $table->string('experience')->nullable()->after('preferred_category');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'nickname',
                'age',
                'preferred_area',
                'preferred_category',
                'experience',
            ]);
        });
    }
};
