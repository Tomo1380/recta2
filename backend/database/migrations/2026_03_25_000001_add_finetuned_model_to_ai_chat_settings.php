<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_chat_settings', function (Blueprint $table) {
            $table->string('openai_finetuned_model')->nullable()->after('tone');
        });
    }

    public function down(): void
    {
        Schema::table('ai_chat_settings', function (Blueprint $table) {
            $table->dropColumn('openai_finetuned_model');
        });
    }
};
