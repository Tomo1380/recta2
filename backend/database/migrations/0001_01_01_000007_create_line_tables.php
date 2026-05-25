<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * LINE Messaging API 連携テーブル。
 *
 *  line_friends  : 友だち追加した LINE アカウント。user_id は LINE Login で
 *                  紐付けされたら埋まる（友だち追加だけして Login していない
 *                  ケースもあるので nullable）
 *  line_messages : 1:1 トーク履歴。inbound/outbound 両方向。
 *                  content_meta は店舗カード等のリッチコンテンツ JSON、
 *                  read_at は運営側が既読を付けた時刻。
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('line_friends', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('line_user_id')->index();
            $table->string('display_name')->nullable();
            $table->string('picture_url')->nullable();
            $table->timestamp('followed_at')->nullable();
            $table->timestamp('unfollowed_at')->nullable();
            $table->boolean('is_following')->default(true);
            $table->timestamps();

            $table->unique('line_user_id');
        });

        Schema::create('line_messages', function (Blueprint $table) {
            $table->id();
            $table->string('line_user_id')->index();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('direction', ['inbound', 'outbound']);
            $table->string('message_type')->default('text');
            $table->text('content');
            $table->jsonb('content_meta')->nullable();
            $table->string('line_message_id')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('line_messages');
        Schema::dropIfExists('line_friends');
    }
};
