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
                'category', 'tags', 'published_at',
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

        $related = Article::published()
            ->where('id', '!=', $article->id)
            ->when($article->category, fn ($q) => $q->where('category', $article->category))
            ->orderByDesc('published_at')
            ->limit(3)
            ->get(['id', 'slug', 'title', 'excerpt', 'thumbnail_url', 'category', 'published_at']);

        return response()->json([
            'article' => (new ArticleResource($article))->resolve(),
            'related' => ArticleSummaryResource::collection($related)->resolve(),
        ]);
    }
}
