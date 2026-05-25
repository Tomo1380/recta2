<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 求職者ユーザー（LINEログインで入ってくる側）。
 *
 * カラム構成は LINE Login OAuth 取得情報 + プロフィール入力 + 設定フラグ。
 * use_line_avatar はデフォルト false で、口コミ表示時に LINE 画像を出すか
 * 名前イニシャルアバターを出すかをユーザーが選べる。
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();

            // LINE OAuth で取得する情報
            $table->string('line_user_id')->unique();
            $table->string('line_display_name');
            $table->string('line_picture_url')->nullable();
            $table->boolean('use_line_avatar')->default(false);
            $table->string('line_access_token')->nullable();
            $table->string('line_refresh_token')->nullable();
            $table->timestamp('line_token_expires_at')->nullable();

            // プロフィール（マイページで本人が入力）
            $table->string('nickname')->nullable();
            $table->integer('age')->nullable();
            $table->string('preferred_area')->nullable();
            $table->string('preferred_category')->nullable();
            $table->string('experience')->nullable();
            $table->text('bio')->nullable();

            // 運営側管理
            $table->text('admin_notes')->nullable();
            $table->enum('status', ['active', 'suspended'])->default('active');
            $table->timestamp('last_login_at')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
