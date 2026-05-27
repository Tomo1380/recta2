<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreArticleRequest;
use App\Http\Requests\Admin\UpdateArticleRequest;
use App\Http\Requests\Admin\UploadArticleThumbnailRequest;
use App\Http\Resources\ArticleResource;
use App\Models\Article;
use App\Support\PaginatorWithResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ArticleController extends Controller
{
    /**
     * @response array{
     *   data: ArticleResource[],
     *   current_page: int,
     *   last_page: int,
     *   per_page: int,
     *   total: int
     * }
     */
    public function index(Request $request): JsonResponse
    {
        $query = Article::query();

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'ilike', "%{$search}%")
                  ->orWhere('excerpt', 'ilike', "%{$search}%")
                  ->orWhere('body_html', 'ilike', "%{$search}%");
            });
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($category = $request->input('category')) {
            $query->where('category', $category);
        }

        /** @var LengthAwarePaginator $articles */
        $articles = $query->orderByDesc('updated_at')
            ->paginate($request->input('per_page', 20));

        return response()->json(PaginatorWithResource::map($articles, ArticleResource::class));
    }

    public function show(Article $article): ArticleResource
    {
        return new ArticleResource($article);
    }

    public function store(StoreArticleRequest $request): ArticleResource
    {
        $data = $request->validated();

        $slug = $data['slug'] ?? null;
        if (!$slug) {
            $slug = $this->generateUniqueSlug($data['title']);
        } elseif (Article::where('slug', $slug)->exists()) {
            $slug = $this->generateUniqueSlug($slug);
        }

        $payload = array_merge($data, [
            'slug' => $slug,
            'published_at' => $this->resolvePublishedAt($data),
        ]);

        $article = Article::create($payload);
        Cache::forget('public_articles_index');
        Cache::forget('industry_knowledges');

        return new ArticleResource($article);
    }

    public function update(UpdateArticleRequest $request, Article $article): ArticleResource
    {
        $data = $request->validated();

        if (!empty($data['slug']) && $data['slug'] !== $article->slug) {
            if (Article::where('slug', $data['slug'])->where('id', '!=', $article->id)->exists()) {
                $data['slug'] = $this->generateUniqueSlug($data['slug']);
            }
        }

        if (array_key_exists('status', $data) || array_key_exists('published_at', $data)) {
            $merged = array_merge($article->only(['status', 'published_at']), $data);
            $data['published_at'] = $this->resolvePublishedAt($merged, $article->published_at);
        }

        $article->update($data);
        Cache::forget('public_articles_index');
        Cache::forget("public_article_{$article->slug}");
        Cache::forget('industry_knowledges');

        return new ArticleResource($article);
    }

    public function destroy(Article $article): JsonResponse
    {
        $slug = $article->slug;
        $article->delete();
        Cache::forget('public_articles_index');
        Cache::forget("public_article_{$slug}");
        Cache::forget('industry_knowledges');

        return response()->json(null, 204);
    }

    public function uploadThumbnail(UploadArticleThumbnailRequest $request, Article $article): JsonResponse
    {
        $path = $request->file('image')->store('articles/thumbnails', 'public');
        $url = Storage::disk('public')->url($path);

        $article->update(['thumbnail_url' => $url]);

        return response()->json([
            'thumbnail_url' => $url,
            'article' => new ArticleResource($article->fresh()),
        ]);
    }

    private function generateUniqueSlug(string $title): string
    {
        $base = Str::slug($title, '-');
        if ($base === '') {
            $base = 'article-' . Str::random(6);
        }
        $slug = $base;
        $i = 2;
        while (Article::where('slug', $slug)->exists()) {
            $slug = $base . '-' . $i++;
            if ($i > 100) {
                $slug = $base . '-' . Str::random(4);
                break;
            }
        }
        return $slug;
    }

    /**
     * If status switches to published and published_at not given, fill with now().
     * If status drafts back, keep existing value.
     */
    private function resolvePublishedAt(array $data, $existing = null)
    {
        if (array_key_exists('published_at', $data) && $data['published_at']) {
            return $data['published_at'];
        }
        $status = $data['status'] ?? null;
        if ($status === 'published') {
            return $existing ?: now();
        }
        return $existing;
    }
}
