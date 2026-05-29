<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Replace the flat `suggest_buttons` string[] with a 2-tier
 * `suggest_categories` structure that the AI chat panel renders as
 * (L1 category tabs → L2 chips).
 *
 *   suggest_categories := [
 *     { id: string, label: string, sub: string, chips: string[] },
 *     ...
 *   ]
 *
 * 旧 suggest_buttons は本リリース前のため破壊的に drop する。
 * Seeder / FormRequest / Controller / フロントは新 shape のみ扱う。
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('ai_chat_settings', function (Blueprint $table) {
            $table->jsonb('suggest_categories')->nullable()->after('openai_finetuned_model');
            $table->dropColumn('suggest_buttons');
        });
    }

    public function down(): void
    {
        Schema::table('ai_chat_settings', function (Blueprint $table) {
            $table->jsonb('suggest_buttons')->nullable()->after('openai_finetuned_model');
            $table->dropColumn('suggest_categories');
        });
    }
};
