<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // LINEログインユーザー（求職者）
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('line_user_id')->unique();
            $table->string('line_display_name');
            $table->string('line_picture_url')->nullable();
            $table->string('nickname')->nullable();
            $table->integer('age')->nullable();
            $table->string('preferred_area')->nullable();
            $table->string('preferred_category')->nullable();
            $table->string('experience')->nullable();
            $table->enum('status', ['active', 'suspended'])->default('active');
            $table->timestamp('last_login_at')->nullable();
            $table->timestamps();
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('sessions');
    }
};
