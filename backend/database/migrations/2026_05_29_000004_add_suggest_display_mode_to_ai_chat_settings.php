<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add `suggest_display_mode` to ai_chat_settings.
 *
 *   off          : サジェスト UI を一切出さない
 *   chips_only   : L1 カテゴリタブを隠し、L2 チップだけフラットに並べる
 *   categorized  : (現状) L1 タブ → L2 チップの 2 段構成
 *
 * 既存の `suggest_categories` データ構造はそのまま流用する。chips_only モード
 * では、各カテゴリの chips をフラットに展開して 1 列で並べる (label/sub は
 * 表示しないだけで保持はする)。
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('ai_chat_settings', function (Blueprint $table) {
            $table->string('suggest_display_mode', 16)
                ->default('categorized')
                ->after('suggest_categories');
        });
    }

    public function down(): void
    {
        Schema::table('ai_chat_settings', function (Blueprint $table) {
            $table->dropColumn('suggest_display_mode');
        });
    }
};
