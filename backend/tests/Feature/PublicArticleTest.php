<?php

namespace Tests\Feature;

use App\Models\Article;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Phase 0 snapshot: 公開コラム記事 API のレスポンス shape を固定する。
 *
 * 注: 現状の PublicArticleController::index は `{articles: paginator, categories}`
 * という独自ラップ shape を返す（CLAUDE.md の flat shape 規約から逸脱）。
 * Phase 1-3 でこれを paginator flat shape に統一する際、本テストは
 * 意図的に書き換える対象になる。
 */
class PublicArticleTest extends TestCase
{
    use RefreshDatabase;

    private function createPublishedArticle(array $overrides = []): Article
    {
        static $counter = 0;
        $counter++;
        return Article::create(array_merge([
            'slug' => "public-article-{$counter}",
            'title' => "Public Article {$counter}",
            'excerpt' => 'Excerpt',
            'body' => ['type' => 'doc', 'content' => []],
            'body_html' => '<p>body</p>',
            'category' => 'お役立ち',
            'tags' => ['夜職'],
            'status' => 'published',
            'published_at' => now()->subDay(),
        ], $overrides));
    }

    public function test_can_list_published_articles_with_wrapped_shape(): void
    {
        $this->createPublishedArticle();
        $this->createPublishedArticle(['category' => '体入']);
        // draft は出ない
        $this->createPublishedArticle(['status' => 'draft', 'published_at' => null]);

        $response = $this->getJson('/api/columns');

        // 現状の shape:
        //   { articles: { data: [...], meta: {current_page, last_page, per_page, total, ...}, links: {...} },
        //     categories: [...] }
        // ※ResourceCollection::response()->getData(true) のラップが効いている。
        // Phase 1 で flat shape (`{current_page, total, data}`) に揃える対象。
        $response->assertStatus(200)
            ->assertJsonStructure([
                'articles' => [
                    'data' => [
                        '*' => [
                            'id', 'slug', 'title', 'excerpt',
                            'thumbnail_url', 'category', 'tags', 'published_at',
                        ],
                    ],
                    'meta' => [
                        'current_page', 'last_page', 'per_page', 'total',
                    ],
                    'links' => [
                        'first', 'last', 'prev', 'next',
                    ],
                ],
                'categories',
            ]);

        $this->assertEquals(2, $response->json('articles.meta.total'));
    }

    public function test_can_filter_articles_by_category(): void
    {
        $this->createPublishedArticle(['category' => 'お役立ち']);
        $this->createPublishedArticle(['category' => '体入']);

        $response = $this->getJson('/api/columns?category=' . urlencode('体入'));

        $response->assertStatus(200);
        $data = $response->json('articles.data');
        $this->assertCount(1, $data);
        $this->assertEquals('体入', $data[0]['category']);
        $this->assertEquals(1, $response->json('articles.meta.total'));
    }

    public function test_can_show_article_by_slug(): void
    {
        $article = $this->createPublishedArticle(['slug' => 'unique-slug']);

        $response = $this->getJson('/api/columns/unique-slug');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'article' => [
                    'id', 'slug', 'title', 'excerpt', 'body', 'body_html',
                    'thumbnail_url', 'category', 'tags', 'status',
                    'published_at', 'created_at', 'updated_at',
                ],
                'related',
            ])
            ->assertJsonPath('article.slug', 'unique-slug');
    }

    public function test_unpublished_article_returns_404(): void
    {
        $this->createPublishedArticle([
            'slug' => 'draft-slug',
            'status' => 'draft',
            'published_at' => null,
        ]);

        $this->getJson('/api/columns/draft-slug')->assertStatus(404);
    }
}
