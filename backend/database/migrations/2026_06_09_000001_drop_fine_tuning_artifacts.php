<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Fine-tuned モードの廃止に伴うクリーンアップ。
 *
 * AI チャットは Gemini agent モード (Function Calling) 一本に統一したため、
 * fine-tuning 用の教師データテーブルと OpenAI fine-tuned model 設定カラムを
 * 削除する。ai_chat_logs.mode は過去ログの履歴として残す (常に 'agent')。
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('fine_tuning_qa');

        if (Schema::hasColumn('ai_chat_settings', 'openai_finetuned_model')) {
            Schema::table('ai_chat_settings', function (Blueprint $table) {
                $table->dropColumn('openai_finetuned_model');
            });
        }
    }

    public function down(): void
    {
        if (!Schema::hasColumn('ai_chat_settings', 'openai_finetuned_model')) {
            Schema::table('ai_chat_settings', function (Blueprint $table) {
                $table->string('openai_finetuned_model')->nullable();
            });
        }

        if (!Schema::hasTable('fine_tuning_qa')) {
            Schema::create('fine_tuning_qa', function (Blueprint $table) {
                $table->id();
                $table->string('category')->nullable();
                $table->text('question');
                $table->text('answer');
                $table->json('tags')->nullable();
                $table->string('source')->nullable();
                $table->string('status')->default('active');
                $table->timestamps();
            });
        }
    }
};
