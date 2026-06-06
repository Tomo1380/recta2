<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * アクセス解析基盤（FB 2026-06-05 / docs/backlog/2026-06-05-feedback.md A 案件）。
 *
 *  page_views    : ページ閲覧 (PV) ログ。店舗 / コラム / エリア LP 等に target を紐付け、
 *                  ランキング (店舗別・エリア別・コラム別 PV TOP100) の元データになる。
 *  tracking_links: 共有可能な計測リンク。アフィリエイトURL・店舗別 LINE 導線・SNS キャンペーン。
 *                  destination_url へ /r/{code} 経由でリダイレクトしつつクリックを記録する。
 *  link_clicks   : LINE 追加 (intent) クリックログ。/r/{code} リダイレクト経由と、
 *                  サイト内 CTA ビーコン (line.ts) の両方がここに溜まる。
 *                  CV率 = LINE追加クリック ÷ PV の分子。
 *
 *  注: LINE 公式アカウント友だち追加「実績」(line_friends / webhook follow) は LINE 仕様上
 *  ブラウザ経路と紐付かないため、ここでは扱わない。実績は line_friends の全体トレンドで見る。
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('page_views', function (Blueprint $table) {
            $table->id();
            // 匿名クライアント識別子 (cookie recta_aid)。ユニーク訪問の概算に使う。
            $table->string('session_id')->nullable()->index();
            // home / store / column / area_landing / category_landing / store_list / other
            $table->string('page_type')->index();
            $table->foreignId('store_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('article_id')->nullable()->constrained()->nullOnDelete();
            $table->string('area')->nullable()->index();
            $table->string('path', 1024)->nullable();
            $table->string('referrer', 1024)->nullable();
            $table->string('ip_hash', 64)->nullable()->index();
            $table->string('user_agent', 512)->nullable();
            // created_at のみ (更新されない append-only ログ)
            $table->timestamp('created_at')->nullable()->index();
        });

        Schema::create('tracking_links', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('label');
            // store / area / column / standalone (SNS直リンク等)
            $table->string('target_type')->index();
            $table->foreignId('store_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('article_id')->nullable()->constrained()->nullOnDelete();
            $table->string('area')->nullable();
            // リダイレクト先 (通常は LINE 公式アカウント友だち追加URL)
            $table->text('destination_url');
            $table->foreignId('created_by')->nullable()->constrained('admin_users')->nullOnDelete();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('link_clicks', function (Blueprint $table) {
            $table->id();
            // /r/{code} 経由なら埋まる。サイト内 CTA ビーコンは null。
            $table->foreignId('tracking_link_id')->nullable()->constrained()->nullOnDelete();
            // LineCtaSource (例 store-detail:bottom-card) または affiliate 等
            $table->string('source')->nullable()->index();
            $table->string('page_type')->nullable();
            $table->foreignId('store_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('article_id')->nullable()->constrained()->nullOnDelete();
            $table->string('area')->nullable()->index();
            $table->string('session_id')->nullable()->index();
            $table->string('ip_hash', 64)->nullable()->index();
            $table->string('referrer', 1024)->nullable();
            $table->string('user_agent', 512)->nullable();
            $table->timestamp('created_at')->nullable()->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('link_clicks');
        Schema::dropIfExists('tracking_links');
        Schema::dropIfExists('page_views');
    }
};
