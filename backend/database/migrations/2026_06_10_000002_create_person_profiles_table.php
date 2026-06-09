<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 人物 (line_user_id 単位) の CRM 属性。
 *
 * トーク有無 (LineFriend) / ログイン有無 (User) に依存せず、line_user_id を
 * 普遍キーにして「流入種別・気になるエリア・入店進捗・上京希望」を保持する。
 * これにより一斉送信のセグメント (未入店×エリア / 上京希望) や進捗別トークの
 * 土台になる (FB: ユーザー管理 ①⑦)。
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('person_profiles', function (Blueprint $table) {
            $table->id();
            $table->string('line_user_id')->unique();
            // 入店進捗: none/consulting/trial_scheduled/trial_done/joined/passed
            $table->string('placement_status', 32)->default('none')->index();
            // 気になるエリア (自由記述)
            $table->string('interested_area')->nullable();
            // 上京希望フラグ (上京診断・上京者向け一斉送信のセグメント用)
            $table->boolean('wants_relocation')->default(false)->index();
            // 流入種別 (どこ経由か。当面は手動記入。将来は流入元URLから自動補完)
            $table->string('referral_source')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('person_profiles');
    }
};
