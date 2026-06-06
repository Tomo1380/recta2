<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 店舗詳細のAIチャット初期メッセージ用「AI紹介文」をキャッシュする列を追加。
 *
 * 旧 intro はクイックスタッツ (体入時給/営業/体入) と同じスペックを音読していて
 * 情報が丸被りしていた (2026-06-06 FB)。代わりに features_text / summary_text /
 * staff_comment などの自由入力を Gemini で要約した紹介文を出す。
 *  - ai_intro      … 生成済みの紹介文
 *  - ai_intro_hash … 素材テキストの md5。変化が無ければ再生成しない (1店舗1回課金)
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->text('ai_intro')->nullable()->after('summary_text');
            $table->string('ai_intro_hash', 32)->nullable()->after('ai_intro');
        });
    }

    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->dropColumn(['ai_intro', 'ai_intro_hash']);
        });
    }
};
