<?php

namespace Tests\Feature;

use App\Models\Article;
use App\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * コラム刷新（FB 2026-06-05 C2-C4）のテスト。
 * section ナビ / 大テーマ絞り込み / 関連店舗の回遊 / 店舗 any_tags フィルタ。
 */
class ColumnRedesignTest extends TestCase
{
    use RefreshDatabase;

    private function publishedArticle(array $attrs = []): Article
    {
        return Article::create(array_merge([
            'slug' => 'a-' . uniqid(),
            'title' => 'テスト記事',
            'body_html' => '<p>本文</p>',
            'status' => 'published',
            'published_at' => now()->subDay(),
        ], $attrs));
    }

    public function test_index_returns_section_nav(): void
    {
        $this->getJson('/api/columns')
            ->assertStatus(200)
            ->assertJsonPath('sections', ['夜の始め方', 'エリア別比較', '地方から上京', 'Q&A']);
    }

    public function test_index_filters_by_section(): void
    {
        $this->publishedArticle(['section' => 'エリア別比較', 'title' => '比較記事']);
        $this->publishedArticle(['section' => 'Q&A', 'title' => 'QA記事']);

        $res = $this->getJson('/api/columns?section=' . urlencode('エリア別比較'));
        $res->assertStatus(200)->assertJsonPath('articles.total', 1);
    }

    public function test_show_resolves_related_stores(): void
    {
        $store = Store::create([
            'name' => '紹介店舗', 'area' => '六本木', 'category' => 'ラウンジ',
            'publish_status' => 'published',
        ]);
        $article = $this->publishedArticle(['related_store_ids' => [$store->id]]);

        $res = $this->getJson("/api/columns/{$article->slug}");
        $res->assertStatus(200)
            ->assertJsonPath('article.related_stores.0.id', $store->id)
            ->assertJsonPath('article.related_stores.0.name', '紹介店舗')
            ->assertJsonPath('article.related_stores.0.area', '六本木');
    }

    public function test_store_any_tags_or_filter(): void
    {
        Store::create([
            'name' => 'A', 'area' => '渋谷', 'category' => 'キャバクラ',
            'publish_status' => 'published', 'feature_tags' => ['日払いあり'],
        ]);
        Store::create([
            'name' => 'B', 'area' => '渋谷', 'category' => 'キャバクラ',
            'publish_status' => 'published', 'feature_tags' => ['全額日払い'],
        ]);
        Store::create([
            'name' => 'C', 'area' => '渋谷', 'category' => 'キャバクラ',
            'publish_status' => 'published', 'feature_tags' => ['ノルマなし'],
        ]);

        // 日払いの表記ゆれ2種を OR で束ねると A・B の 2 件が一致。
        $res = $this->getJson('/api/stores?any_tags=' . urlencode('日払いあり,全額日払い'));
        $res->assertStatus(200)->assertJsonPath('total', 2);
    }
}
