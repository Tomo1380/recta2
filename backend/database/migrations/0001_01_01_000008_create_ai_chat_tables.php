<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * AI チャット周りのテーブル一式。
 *
 *  ai_chat_settings : ページ別 (top/list/detail) のシステムプロンプトと
 *                     サジェストチップ。openai_finetuned_model は将来の
 *                     fine-tune モデルに切り替える時の参照名。
 *  ai_chat_limits   : 利用制限（user/IP/global 各単位の上限値）。1 行運用。
 *  ai_chat_logs     : チャット履歴。mode は agent/finetuned の切替を記録。
 *  fine_tuning_qa   : fine-tuning 用の Q&A 教師データ。
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('ai_chat_settings', function (Blueprint $table) {
            $table->id();
            $table->enum('page_type', ['top', 'list', 'detail'])->unique();
            $table->boolean('enabled')->default(true);
            $table->text('system_prompt')->nullable();
            $table->enum('tone', ['casual', 'formal', 'friendly'])->default('friendly');
            $table->string('openai_finetuned_model')->nullable();
            $table->jsonb('suggest_buttons')->nullable();
            $table->timestamps();
        });

        Schema::create('ai_chat_limits', function (Blueprint $table) {
            $table->id();
            $table->integer('user_daily_limit')->default(50);
            $table->integer('user_monthly_limit')->default(500);
            $table->integer('ip_daily_limit')->default(10);
            $table->integer('global_daily_limit')->default(10000);
            $table->text('limit_reached_message')->default('本日のチャット上限に達しました。明日またご利用ください。');
            $table->timestamps();
        });

        Schema::create('ai_chat_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $table->string('ip_address', 45)->nullable();
            $table->enum('page_type', ['top', 'list', 'detail']);
            $table->text('user_message');
            $table->text('ai_response');
            $table->integer('input_tokens')->default(0);
            $table->integer('output_tokens')->default(0);
            $table->string('mode', 20)->default('agent');
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['created_at']);
            $table->index('mode');
        });

        Schema::create('fine_tuning_qa', function (Blueprint $table) {
            $table->id();
            $table->string('category')->nullable();
            $table->text('question');
            $table->text('answer');
            $table->jsonb('tags')->nullable();
            $table->string('source')->nullable();
            $table->string('status', 16)->default('active');
            $table->timestamps();

            $table->index('status');
            $table->index('category');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fine_tuning_qa');
        Schema::dropIfExists('ai_chat_logs');
        Schema::dropIfExists('ai_chat_limits');
        Schema::dropIfExists('ai_chat_settings');
    }
};
