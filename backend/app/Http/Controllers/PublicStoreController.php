<?php

namespace App\Http\Controllers;

use App\Models\Store;
use App\Models\Area;
use App\Models\Category;
use App\Models\PickupShop;
use App\Models\Consultation;
use App\Models\Review;
use App\Models\SiteSetting;
use App\Http\Resources\AreaResource;
use App\Http\Resources\CategoryResource;
use App\Http\Resources\StoreResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class PublicStoreController extends Controller
{
    /**
     * Store listing with filters, search, sort, pagination.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Store::where('publish_status', 'published');

        if ($area = $request->input('area')) {
            // Support both slug (from frontend selects) and name
            $areaName = Area::where('slug', $area)->value('name') ?? $area;
            $query->where('area', $areaName);
        }

        if ($category = $request->input('category')) {
            // Support both slug (from frontend selects) and name.
            // BUG-E14: 旧 slug `cabaret` を新 slug `cabaclub` へ正規化する後方互換。
            // 旧 URL (`?category=cabaret`) が共有・ブックマークされていても拾える。
            $aliasedCategory = $category === 'cabaret' ? 'cabaclub' : $category;
            $categoryName = Category::where('slug', $aliasedCategory)->value('name') ?? $category;
            $query->where('category', $categoryName);
        }

        if ($search = $request->input('q')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('area', 'ilike', "%{$search}%")
                  ->orWhere('description', 'ilike', "%{$search}%")
                  ->orWhere('nearest_station', 'ilike', "%{$search}%");
            });
        }

        if ($tags = $request->input('tags')) {
            $tagList = is_array($tags) ? $tags : explode(',', $tags);
            foreach ($tagList as $tag) {
                $query->whereJsonContains('feature_tags', trim($tag));
            }
        }

        // コラムの「条件で探す / 働き方で探す」チップ用: いずれかのタグに一致 (OR)。
        // 表記ゆれ（日払いあり / 全額日払い / 体入全額日払い 等）を 1 チップで束ねる。
        if ($anyTags = $request->input('any_tags')) {
            $anyList = is_array($anyTags) ? $anyTags : explode(',', $anyTags);
            $query->where(function ($q) use ($anyList) {
                foreach ($anyList as $tag) {
                    $tag = trim($tag);
                    if ($tag !== '') {
                        $q->orWhereJsonContains('feature_tags', $tag);
                    }
                }
            });
        }

        if ($minWage = $request->input('min_hourly')) {
            // 通常時給は廃止。時給フィルタは体入時給 (wage.trial) 基準。新キー
            // hourly_min を優先し旧キー avg_hourly にフォールバック。単位付き文字列も
            // 数値化して比較 (Postgres)。
            $trialMinExpr = "NULLIF(regexp_replace(COALESCE(wage->'trial'->>'hourly_min', wage->'trial'->>'avg_hourly', ''), '[^0-9]', '', 'g'), '')::numeric";
            $query->whereRaw("{$trialMinExpr} >= ?", [(int) $minWage]);
        }

        // reviews_count は popular/newest 問わず一覧の評価表示で要るので、
        // switch の外で一度だけ呼ぶ。switch 内でも withCount すると重複 SELECT
        // で空が返るバグになっていた (BUG-E02)。
        // average_rating も withAvg で同時に sub-select し、StoreResource が
        // 店舗ごとに averageRating() を呼ぶ N+1 を防ぐ。
        $query->withCount(['reviews' => fn ($q) => $q->where('status', 'published')])
            ->withAvg(['reviews as reviews_avg_rating' => fn ($q) => $q->where('status', 'published')], 'rating');

        // 体入確約フラグでの絞り込み。フロントの「体入確約」タブ (BUG-E09)
        // が `sort=experience_guaranteed` を投げるが、これは並び替えではなく
        // 絞り込み。「体入確約」リボンを出している店舗を抽出。
        // デフォルトは表示優先度順 (運営が priority を上げた店舗を上位に)。
        $sort = $request->input('sort', 'priority');
        if ($sort === 'experience_guaranteed') {
            $query->where('guarantee->same_day_trial', 'same_day');
        }

        switch ($sort) {
            // 通常時給は廃止。並び替えは体入時給 (wage.trial) 基準。新キー
            // hourly_min/max を優先し旧キー avg_hourly/hourly にフォールバック。
            case 'hourly_desc':
                $driver = $query->getConnection()->getDriverName();
                $query->orderByRaw($driver === 'pgsql'
                    ? "nullif(regexp_replace(coalesce(wage->'trial'->>'hourly_max', wage->'trial'->>'hourly', wage->'trial'->>'hourly_min', wage->'trial'->>'avg_hourly',''),'[^0-9]','','g'),'')::int desc nulls last"
                    : "CAST(COALESCE(json_extract(wage, '$.trial.hourly_max'), json_extract(wage, '$.trial.hourly'), json_extract(wage, '$.trial.hourly_min'), json_extract(wage, '$.trial.avg_hourly')) AS INTEGER) desc");
                break;
            case 'hourly_asc':
                $driver = $query->getConnection()->getDriverName();
                $query->orderByRaw($driver === 'pgsql'
                    ? "nullif(regexp_replace(coalesce(wage->'trial'->>'hourly_min', wage->'trial'->>'avg_hourly',''),'[^0-9]','','g'),'')::int asc nulls last"
                    : "CAST(COALESCE(json_extract(wage, '$.trial.hourly_min'), json_extract(wage, '$.trial.avg_hourly')) AS INTEGER) asc");
                break;
            case 'popular':
                // フロントのタブラベルは「評価順」。平均評価の高い順に並べ、
                // 同率は口コミ数の多い順。レビューが無い店舗は最下段へ送る。
                // NOTE: withCount('reviews') が `reviews_count` を sub-select で
                // 作るので、orderByDesc('reviews_count') を素で書くと Laravel が
                // また同名の sub-select を追加して PostgreSQL が
                // "ORDER BY reviews_count is ambiguous" を返す。order の式も
                // raw で同じ sub-select を直接書いて衝突を避ける。
                $avgSql = "(select avg(rating) from reviews where reviews.store_id = stores.id and reviews.status = 'published')";
                $countSql = "(select count(*) from reviews where reviews.store_id = stores.id and reviews.status = 'published')";
                $query->orderByRaw("$avgSql desc nulls last")
                      ->orderByRaw("$countSql desc");
                break;
            case 'newest':
                $query->orderByDesc('created_at');
                break;
            case 'priority':
            default:
                // 表示優先度順 (priority desc)、同値内は新しい順。
                // 「おすすめ順」「表示優先」のフロントタブとは同じ実装。
                $query->orderByDesc('priority')->orderByDesc('created_at');
        }

        $stores = $query->withCount(['reviews' => fn ($q) => $q->where('status', 'published')])
            ->paginate($request->input('per_page', 20));

        return response()->json(\App\Support\PaginatorWithResource::map($stores, StoreResource::class));
    }

    /**
     * Store detail.
     *
     * URL param は slug または ID。数値オンリーなら ID として fallback で引く。
     * 旧 ID URL からのアクセスを許容しつつ、新規流入は slug ベースに統一する。
     */
    public function show(string $slugOrId): JsonResponse
    {
        $store = Store::where('slug', $slugOrId)
            ->orWhere(function ($q) use ($slugOrId) {
                if (preg_match('/^\d+$/', $slugOrId)) {
                    $q->where('id', (int) $slugOrId);
                }
            })
            ->firstOrFail();

        if ($store->publish_status !== 'published') {
            abort(404);
        }

        $store->loadCount(['reviews' => fn($q) => $q->where('status', 'published')]);

        // Load published reviews with user info
        $store->load(['reviews' => function ($q) {
            $q->where('status', 'published')
              ->with('user:id,line_display_name,line_picture_url,use_line_avatar,nickname')
              ->orderByDesc('created_at')
              ->limit(10);
        }]);

        // videos / staffPhotos を eager load → Resource が projectVideos/projectStaffPhotos で取り出す
        $store->load(['videos', 'staffPhotos']);

        // AIチャット初期メッセージ用の紹介文を必要なら生成 (素材未変更ならキャッシュ即返却)。
        // 失敗・キー未設定でも例外は飲み込まれ、フロントは従来 fallback で表示する。
        app(\App\Services\AiChat\StoreIntroSummarizer::class)->intro($store);

        $storePayload = (new StoreResource($store))->resolve();

        // Related stores (same area, same category)
        $related = Store::where('publish_status', 'published')
            ->where('id', '!=', $store->id)
            ->where(function ($q) use ($store) {
                $q->where('area', $store->area)
                  ->orWhere('category', $store->category);
            })
            ->withCount(['reviews' => fn($q) => $q->where('status', 'published')])
            ->withAvg(['reviews as reviews_avg_rating' => fn ($q) => $q->where('status', 'published')], 'rating')
            ->limit(6)
            ->get();

        // 関連コラム (回遊動線): この店のエリア / 業種を tags に持つ公開記事。
        // 「渋谷のキャバを見た → 渋谷 / キャバクラの読み物」へ送客する。
        $relatedColumns = \App\Models\Article::published()
            ->where(function ($q) use ($store) {
                if ($store->area) {
                    $q->orWhereJsonContains('tags', $store->area);
                }
                if ($store->category) {
                    $q->orWhereJsonContains('tags', $store->category);
                }
            })
            ->orderByDesc('published_at')
            ->limit(3)
            ->get(['id', 'slug', 'title', 'excerpt', 'thumbnail_url', 'category', 'section', 'published_at']);

        return response()->json([
            'store' => $storePayload,
            'related' => StoreResource::collection($related)->resolve(),
            'related_columns' => $relatedColumns,
        ]);
    }

    /**
     * Visible areas list.
     */
    public function areas(): AnonymousResourceCollection
    {
        $areas = Area::where('visible', true)
            ->orderBy('sort_order')
            ->get();

        return AreaResource::collection($areas);
    }

    /**
     * Visible categories list.
     */
    public function categories(): AnonymousResourceCollection
    {
        $categories = Category::where('visible', true)
            ->orderBy('sort_order')
            ->get();

        return CategoryResource::collection($categories);
    }

    /**
     * Homepage data: banner, pickup shops, consultations.
     */
    public function home(): JsonResponse
    {
        // Banner settings
        $bannerKeys = ['hero_tagline', 'hero_subtitle', 'hero_badge', 'hero_ai_label', 'hero_image_url'];
        $banner = [];
        foreach ($bannerKeys as $key) {
            $setting = SiteSetting::where('key', $key)->first();
            $banner[$key] = $setting?->value ?? '';
        }

        // Pickup shops with store data
        $pickups = PickupShop::where('visible', true)
            // reviews_count / average_rating を store ごとに都度クエリせず eager-load。
            ->with(['store' => fn ($q) => $q
                ->withCount(['reviews' => fn ($r) => $r->where('status', 'published')])
                ->withAvg(['reviews as reviews_avg_rating' => fn ($r) => $r->where('status', 'published')], 'rating')])
            ->orderBy('sort_order')
            ->get()
            ->filter(fn($p) => $p->store && $p->store->publish_status === 'published')
            ->map(function ($pickup) {
                $store = $pickup->store;
                $full = (new StoreResource($store))->resolve();
                return [
                    'id' => $store->id,
                    'name' => $store->name,
                    'area' => $store->area,
                    'category' => $store->category,
                    // 通常時給は廃止。給与は体入時給 (trial_hourly_*) に一本化。
                    'trial_hourly_min' => $full['trial_hourly_min'] ?? null,
                    'trial_hourly_max' => $full['trial_hourly_max'] ?? null,
                    'feature_tags' => $store->feature_tags,
                    'images' => $store->images,
                    'reviews_count' => (int) ($store->reviews_count ?? 0),
                    'average_rating' => round((float) ($store->reviews_avg_rating ?? 0), 1),
                ];
            })
            ->values();

        // Consultations
        $consultations = Consultation::where('visible', true)
            ->orderBy('sort_order')
            ->get(['id', 'question', 'answer', 'tag', 'count']);

        // Live store counts per area / category (only published rows).
        // Returned as { name => count } so the frontend can drop the
        // hardcoded fallback dictionary entirely.
        $publishedStores = Store::where('publish_status', 'published');
        $areaCounts = (clone $publishedStores)
            ->select('area', \DB::raw('count(*) as c'))
            ->groupBy('area')
            ->pluck('c', 'area');
        $categoryCounts = (clone $publishedStores)
            ->select('category', \DB::raw('count(*) as c'))
            ->groupBy('category')
            ->pluck('c', 'category');

        // Areas for quick navigation。
        // 公開店舗が 0 件のエリアはトップに出すと空振り (クリックしても
        // 遷移先が空) になるため除外する。
        $areas = Area::where('visible', true)
            ->orderBy('sort_order')
            ->get(['id', 'name', 'slug'])
            ->map(function ($a) use ($areaCounts) {
                $a->store_count = (int) ($areaCounts[$a->name] ?? 0);
                return $a;
            })
            ->filter(fn ($a) => $a->store_count > 0)
            ->values();

        // Categories
        $categories = Category::where('visible', true)
            ->orderBy('sort_order')
            ->get(['id', 'name', 'slug', 'image_url'])
            ->map(function ($c) use ($categoryCounts) {
                $c->store_count = (int) ($categoryCounts[$c->name] ?? 0);
                return $c;
            });

        // Recent reviews — replaces the hardcoded REVIEWS dictionary
        // on the top page. Only published reviews from published stores.
        $recentReviews = Review::with([
                'user:id,line_display_name,line_picture_url,use_line_avatar,nickname',
                // images はトップの「新着クチコミ」カードでサムネ表示用に必要。
                'store:id,name,area,category,images',
            ])
            ->where('reviews.status', 'published')
            ->whereHas('store', fn ($q) => $q->where('publish_status', 'published'))
            ->orderByDesc('created_at')
            ->limit(8)
            ->get()
            ->map(function ($r) {
                // images は string[] か [{url, order}] の両方が来うる (旧/新)。
                // 1 枚目を URL 文字列で取り出す。
                $imageUrl = null;
                $images = is_array($r->store?->images) ? $r->store->images : [];
                if (!empty($images)) {
                    $first = $images[0];
                    if (is_string($first)) {
                        $imageUrl = $first;
                    } elseif (is_array($first)) {
                        $imageUrl = $first['url'] ?? null;
                    }
                }
                return [
                'id' => $r->id,
                'rating' => $r->rating,
                'body' => $r->body,
                'tweet_id' => $r->tweet_id,
                'tweet_author_screen_name' => $r->tweet_author_screen_name,
                'created_at' => $r->created_at,
                'store' => $r->store ? [
                    'id' => $r->store->id,
                    'name' => $r->store->name,
                    'area' => $r->store->area,
                    'category' => $r->store->category,
                    'image_url' => $imageUrl,
                ] : null,
                'user' => $r->user ? [
                    'line_display_name' => $r->user->line_display_name,
                    'line_picture_url' => $r->user->line_picture_url,
                    'use_line_avatar' => (bool) $r->user->use_line_avatar,
                    'nickname' => $r->user->nickname,
                ] : null,
                ];
            })
            ->values();

        return response()->json([
            'banner' => $banner,
            'pickup_shops' => $pickups,
            'consultations' => $consultations,
            'areas' => $areas,
            'categories' => $categories,
            'recent_reviews' => $recentReviews,
        ]);
    }
}
