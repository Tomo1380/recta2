<?php

namespace Tests\Feature;

use App\Models\AdminUser;
use App\Models\Article;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Phase 0 snapshot: admin コラム記事 CRUD のレスポンス shape を固定する。
 * Phase 1 で API 契約を整理する際に意図せず壊れたかを検知するため、
 * 値ベースではなく shape ベースで assert する。
 */
class AdminArticleTest extends TestCase
{
    use RefreshDatabase;

    private AdminUser $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = AdminUser::create([
            'name' => 'Admin',
            'email' => 'admin@test.com',
            'password' => 'password',
            'role' => 'super_admin',
            'status' => 'active',
        ]);
    }

    private function createArticle(array $overrides = []): Article
    {
        static $counter = 0;
        $counter++;
        return Article::create(array_merge([
            'slug' => "article-{$counter}",
            'title' => "Article {$counter}",
            'excerpt' => 'Excerpt',
            'body' => ['type' => 'doc', 'content' => []],
            'body_html' => '<p>body</p>',
            'category' => 'お役立ち',
            'tags' => ['初心者', 'キャバクラ'],
            'status' => 'published',
            'published_at' => now()->subDay(),
        ], $overrides));
    }

    public function test_admin_can_list_articles_with_paginator_flat_shape(): void
    {
        $this->createArticle();
        $this->createArticle(['status' => 'draft', 'published_at' => null]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/articles');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'current_page',
                'last_page',
                'per_page',
                'total',
                'data' => [
                    '*' => [
                        'id', 'slug', 'title', 'excerpt', 'body', 'body_html',
                        'thumbnail_url', 'category', 'tags', 'status',
                        'published_at', 'created_at', 'updated_at',
                    ],
                ],
            ]);

        $this->assertEquals(2, $response->json('total'));
    }

    public function test_admin_can_show_article(): void
    {
        $article = $this->createArticle();

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/admin/articles/{$article->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'id', 'slug', 'title', 'excerpt', 'body', 'body_html',
                'thumbnail_url', 'category', 'tags', 'status',
                'published_at', 'created_at', 'updated_at',
            ])
            ->assertJsonPath('id', $article->id);
    }

    public function test_admin_can_create_article(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/articles', [
                'title' => '新しい記事',
                'excerpt' => '抜粋',
                'body' => ['type' => 'doc', 'content' => []],
                'body_html' => '<p>body</p>',
                'category' => 'お役立ち',
                'tags' => ['夜職'],
                'status' => 'draft',
            ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'id', 'slug', 'title', 'status', 'created_at',
            ])
            ->assertJsonPath('title', '新しい記事')
            ->assertJsonPath('status', 'draft');
    }

    public function test_admin_can_update_article(): void
    {
        $article = $this->createArticle(['status' => 'draft']);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/admin/articles/{$article->id}", [
                'title' => '更新後のタイトル',
                'status' => 'published',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('title', '更新後のタイトル')
            ->assertJsonPath('status', 'published');
    }

    public function test_admin_can_delete_article(): void
    {
        $article = $this->createArticle();

        $response = $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/admin/articles/{$article->id}");

        $response->assertStatus(204);
        $this->assertDatabaseMissing('articles', ['id' => $article->id]);
    }

    public function test_article_list_requires_authentication(): void
    {
        $this->getJson('/api/admin/articles')->assertStatus(401);
    }
}
