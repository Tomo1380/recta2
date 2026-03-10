<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ページ別AIチャット設定
        Schema::create('ai_chat_settings', function (Blueprint $table) {
            $table->id();
            $table->enum('page_type', ['top', 'list', 'detail'])->unique();
            $table->boolean('enabled')->default(true);
            $table->text('system_prompt')->nullable();
            $table->enum('tone', ['casual', 'formal', 'friendly'])->default('friendly');
            $table->jsonb('suggest_buttons')->nullable(); // ["条件で探したい", "私の適正時給診断"]
            $table->timestamps();
        });

        // 利用制限設定
        Schema::create('ai_chat_limits', function (Blueprint $table) {
            $table->id();
            $table->integer('user_daily_limit')->default(50);
            $table->integer('user_monthly_limit')->default(500);
            $table->integer('ip_daily_limit')->default(10);
            $table->integer('global_daily_limit')->default(10000);
            $table->text('limit_reached_message')->default('本日のチャット上限に達しました。明日またご利用ください。');
            $table->timestamps();
        });

        // チャットログ
        Schema::create('ai_chat_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $table->string('ip_address', 45)->nullable();
            $table->enum('page_type', ['top', 'list', 'detail']);
            $table->text('user_message');
            $table->text('ai_response');
            $table->integer('input_tokens')->default(0);
            $table->integer('output_tokens')->default(0);
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_chat_logs');
        Schema::dropIfExists('ai_chat_limits');
        Schema::dropIfExists('ai_chat_settings');
    }
};
