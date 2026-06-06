<?php

namespace App\Http\Controllers;

use App\Http\Resources\ArticleResource;
use App\Http\Resources\ArticleSummaryResource;
use App\Models\Article;
use App\Support\PaginatorWithResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

class PublicArticleController extends Controller
{
    /**
     * Public list of published articles, paginated.
     *
     * Returns BFF view: paginator (flat) + categories chip list.
     *
     * @response array{
     *   articles: array{
     *     data: ArticleSummaryResource[],
     *     current_page: int,
     *     last_page: int,
     *     per_page: int,
     *     total: int
     *   },
     *   categories: string[]
     * }
     */
    public function index(Request $request): JsonResponse
    {
        $query = Article::published();

        if ($category = $request->input('category')) {
            $query->where('category', $category);
        }

        // C2: 大テーマ（夜の始め方 / エリア別比較 / 地方から上京 / Q&A）で絞り込み。
        if ($section = $request->input('section')) {
            $query->where('section', $section);
        }

        if ($tag = $request->input('tag')) {
            $query->whereJsonContains('tags', $tag);
        }

        if ($search = $request->input('q')) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'ilike', "%{$search}%")
                  ->orWhere('excerpt', 'ilike', "%{$search}%");
            });
        }

        /** @var LengthAwarePaginator $articles */
        $articles = $query->orderByDesc('published_at')
            ->paginate($request->input('per_page', 12), [
                'id', 'slug', 'title', 'excerpt', 'thumbnail_url',
                'category', 'section', 'tags', 'published_at',
            ]);

        // Distinct categories for filter chips
        $categories = Article::published()
            ->whereNotNull('category')
            ->distinct()
            ->orderBy('category')
            ->pluck('category');

        return response()->json([
            'articles' => PaginatorWithResource::map($articles, ArticleSummaryResource::class),
            'categories' => $categories,
            // C2: 上段ナビ（固定4テーマ）。
            'sections' => Article::SECTIONS,
        ]);
    }

    /**
     * Public detail by slug.
     *
     * @response array{article: ArticleResource, related: ArticleSummaryResource[]}
     */
    public function show(string $slug): JsonResponse
    {
        $article = Article::published()->where('slug', $slug)->first();
        if (!$article) {
            abort(404);
        }

        // 関連コラム: 同じ大テーマ(section)を優先、無ければ category。
        $related = Article::published()
            ->where('id', '!=', $article->id)
            ->when(
                $article->section,
                fn ($q) => $q->where('section', $article->section),
                fn ($q) => $q->when($article->category, fn ($q2) => $q2->where('category', $article->category)),
            )
            ->orderByDesc('published_at')
            ->limit(3)
            ->get(['id', 'slug', 'title', 'excerpt', 'thumbnail_url', 'category', 'section', 'published_at']);

        // C4: 「この記事で紹介した店舗」を解決して article に attach。
        $article->related_stores = $article->relatedStoreSummaries();

        return response()->json([
            'article' => (new ArticleResource($article))->resolve(),
            'related' => ArticleSummaryResource::collection($related)->resolve(),
        ]);
    }
}
