<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreArticleRequest;
use App\Http\Requests\Admin\UpdateArticleRequest;
use App\Http\Requests\Admin\UploadArticleThumbnailRequest;
use App\Http\Resources\ArticleResource;
use App\Models\Article;
use App\Models\SiteSetting;
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
        $articles = $query->with('creator:id,name')
            ->orderByDesc('updated_at')
            ->paginate($request->input('per_page', 20));

        // C1: このページの記事の PV / LINE導線クリック数をまとめて集計して各記事に付与。
        $ids = collect($articles->items())->pluck('id');
        if ($ids->isNotEmpty()) {
            $pv = \App\Models\PageView::whereIn('article_id', $ids)
                ->selectRaw('article_id, COUNT(*) as c')->groupBy('article_id')->pluck('c', 'article_id');
            $clicks = \App\Models\LinkClick::whereIn('article_id', $ids)
                ->selectRaw('article_id, COUNT(*) as c')->groupBy('article_id')->pluck('c', 'article_id');

            foreach ($articles->items() as $article) {
                $article->pv_count = (int) ($pv[$article->id] ?? 0);
                $article->line_clicks_count = (int) ($clicks[$article->id] ?? 0);
            }
        }

        return response()->json(PaginatorWithResource::map($articles, ArticleResource::class));
    }

    public function show(Article $article): ArticleResource
    {
        // C4: 編集画面で「関連店舗」ピッカーの初期値を名前付きで表示するため解決。
        $article->related_stores = $article->relatedStoreSummaries();

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
            // C1: 作成者を記録（一覧の「作成者」表示用）。
            'author_id' => $request->user()?->id,
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

    /**
     * コラムの分類（大テーマ section / カテゴリ category）一覧 + 各値の記事使用数。
     * 管理 UI と編集画面の候補に使う。
     *
     * @response array{
     *   sections: array<int, array{name: string, article_count: int}>,
     *   categories: array<int, array{name: string, article_count: int}>
     * }
     */
    public function taxonomies(): JsonResponse
    {
        return response()->json([
            'sections' => $this->taxonomyWithCounts('section', Article::sectionList()),
            'categories' => $this->taxonomyWithCounts('category', Article::categoryList()),
        ]);
    }

    /**
     * 分類リストを保存（並び順そのまま）。sections / categories のうち送られた方だけ更新。
     *
     * 削除は「選択肢から外す」だけで既存記事の値は保持する（非破壊）。外した値を使う
     * 記事はナビ/候補に出なくなるだけで、記事自体は壊れない。
     */
    public function updateTaxonomies(Request $request): JsonResponse
    {
        $data = $request->validate([
            'sections' => 'sometimes|array|max:30',
            'sections.*' => 'required|string|max:50',
            'categories' => 'sometimes|array|max:30',
            'categories.*' => 'required|string|max:50',
        ]);

        if (array_key_exists('sections', $data)) {
            $this->saveTaxonomy('column_sections', $data['sections']);
        }
        if (array_key_exists('categories', $data)) {
            $this->saveTaxonomy('column_categories', $data['categories']);
        }
        Cache::forget('public_articles_index');

        return $this->taxonomies();
    }

    /**
     * @param  array<int, string>  $names
     * @return array<int, array{name: string, article_count: int}>
     */
    private function taxonomyWithCounts(string $column, array $names): array
    {
        $counts = Article::whereIn($column, $names)
            ->selectRaw("{$column} as v, count(*) as c")
            ->groupBy($column)
            ->pluck('c', 'v');

        return collect($names)->map(fn ($n) => [
            'name' => $n,
            'article_count' => (int) ($counts[$n] ?? 0),
        ])->values()->all();
    }

    /**
     * trim + 重複・空除去して SiteSetting に JSON 保存（順序維持）。
     *
     * @param  array<int, string>  $names
     */
    private function saveTaxonomy(string $key, array $names): void
    {
        $list = [];
        foreach ($names as $n) {
            $n = trim($n);
            if ($n !== '' && !in_array($n, $list, true)) {
                $list[] = $n;
            }
        }
        SiteSetting::updateOrCreate(['key' => $key], ['value' => json_encode($list, JSON_UNESCAPED_UNICODE)]);
    }

    public function uploadThumbnail(UploadArticleThumbnailRequest $request, Article $article): JsonResponse
    {
        $url = \App\Support\MediaStorage::upload($request->file('image'), 'articles/thumbnails');

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
