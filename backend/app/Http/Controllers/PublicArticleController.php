<?php

namespace App\Http\Controllers;

use App\Models\Article;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicArticleController extends Controller
{
    /**
     * Public list of published articles, paginated.
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

        $articles = $query->orderByDesc('published_at')
            ->paginate($request->input('per_page', 12), [
                'id', 'slug', 'title', 'excerpt', 'thumbnail_url',
                'category', 'tags', 'published_at',
            ]);

        // Distinct categories for filter chips (cheap, just for visible articles)
        $categories = Article::published()
            ->whereNotNull('category')
            ->distinct()
            ->orderBy('category')
            ->pluck('category');

        return response()->json([
            'articles' => $articles,
            'categories' => $categories,
        ]);
    }

    /**
     * Public detail by slug.
     */
    public function show(string $slug): JsonResponse
    {
        $article = Article::published()->where('slug', $slug)->first();
        if (!$article) {
            abort(404);
        }

        // Lightweight related: same category, latest 3
        $related = Article::published()
            ->where('id', '!=', $article->id)
            ->when($article->category, fn ($q) => $q->where('category', $article->category))
            ->orderByDesc('published_at')
            ->limit(3)
            ->get(['id', 'slug', 'title', 'excerpt', 'thumbnail_url', 'category', 'published_at']);

        return response()->json([
            'article' => $article,
            'related' => $related,
        ]);
    }
}
