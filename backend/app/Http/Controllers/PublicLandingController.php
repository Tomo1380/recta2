<?php

namespace App\Http\Controllers;

use App\Http\Resources\StoreResource;
use App\Models\Area;
use App\Models\Category;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

/**
 * エリア × 業態の SEO 用ランディングページ向け API。
 *
 * Recta では「六本木のキャバクラ求人」「銀座のラウンジ求人」のような
 * 検索クエリの完全マッチ URL を 8 エリア × 5 業態 = 40 通り + 各単独
 * (8 + 5 = 13) で持ち、それぞれに対応する店舗一覧・平均時給・FAQ を
 * 返す。フロント側は SSR loader で取得し、動的な H1 / title / description
 * を生成する。
 *
 * キャッシュは Redis tag (SeoController::CACHE_TAG と独立) で 5 分。
 */
class PublicLandingController extends Controller
{
    private const CACHE_TTL = 300; // 5 分

    public function area(string $slug): JsonResponse
    {
        $area = Area::where('slug', $slug)->where('visible', true)->firstOrFail();

        $payload = Cache::remember(
            "landing:area:{$slug}",
            self::CACHE_TTL,
            fn () => $this->buildAreaPayload($area),
        );

        return response()->json($payload);
    }

    public function category(string $slug): JsonResponse
    {
        $category = Category::where('slug', $slug)->where('visible', true)->firstOrFail();

        $payload = Cache::remember(
            "landing:category:{$slug}",
            self::CACHE_TTL,
            fn () => $this->buildCategoryPayload($category),
        );

        return response()->json($payload);
    }

    public function areaCategory(string $areaSlug, string $categorySlug): JsonResponse
    {
        $area = Area::where('slug', $areaSlug)->where('visible', true)->firstOrFail();
        $category = Category::where('slug', $categorySlug)->where('visible', true)->firstOrFail();

        $payload = Cache::remember(
            "landing:area-cat:{$areaSlug}:{$categorySlug}",
            self::CACHE_TTL,
            fn () => $this->buildAreaCategoryPayload($area, $category),
        );

        return response()->json($payload);
    }

    /** @return array<string, mixed> */
    private function buildAreaPayload(Area $area): array
    {
        $stores = Store::where('publish_status', 'published')
            ->where('area', $area->name)
            ->orderByDesc('priority')
            ->orderByDesc('created_at')
            ->withCount(['reviews' => fn ($q) => $q->where('status', 'published')])
            ->get();

        return [
            'area' => ['name' => $area->name, 'slug' => $area->slug],
            'category' => null,
            'stores' => StoreResource::collection($stores)->resolve(),
            'stats' => $this->aggregateStats($stores),
            'related' => [
                'categories' => Category::where('visible', true)
                    ->orderBy('sort_order')
                    ->get(['name', 'slug'])
                    ->toArray(),
            ],
        ];
    }

    /** @return array<string, mixed> */
    private function buildCategoryPayload(Category $category): array
    {
        $stores = Store::where('publish_status', 'published')
            ->where('category', $category->name)
            ->orderByDesc('priority')
            ->orderByDesc('created_at')
            ->withCount(['reviews' => fn ($q) => $q->where('status', 'published')])
            ->get();

        return [
            'area' => null,
            'category' => ['name' => $category->name, 'slug' => $category->slug],
            'stores' => StoreResource::collection($stores)->resolve(),
            'stats' => $this->aggregateStats($stores),
            'related' => [
                'areas' => Area::where('visible', true)
                    ->orderBy('sort_order')
                    ->get(['name', 'slug'])
                    ->toArray(),
            ],
        ];
    }

    /** @return array<string, mixed> */
    private function buildAreaCategoryPayload(Area $area, Category $category): array
    {
        $stores = Store::where('publish_status', 'published')
            ->where('area', $area->name)
            ->where('category', $category->name)
            ->orderByDesc('priority')
            ->orderByDesc('created_at')
            ->withCount(['reviews' => fn ($q) => $q->where('status', 'published')])
            ->get();

        return [
            'area' => ['name' => $area->name, 'slug' => $area->slug],
            'category' => ['name' => $category->name, 'slug' => $category->slug],
            'stores' => StoreResource::collection($stores)->resolve(),
            'stats' => $this->aggregateStats($stores),
            'related' => [
                'areas' => Area::where('visible', true)
                    ->where('slug', '!=', $area->slug)
                    ->orderBy('sort_order')
                    ->get(['name', 'slug'])
                    ->toArray(),
                'categories' => Category::where('visible', true)
                    ->where('slug', '!=', $category->slug)
                    ->orderBy('sort_order')
                    ->get(['name', 'slug'])
                    ->toArray(),
            ],
        ];
    }

    /**
     * @param  iterable<Store>  $stores
     * @return array{count:int, hourly_min:int|null, hourly_max:int|null, avg_hourly_min:int|null}
     */
    private function aggregateStats(iterable $stores): array
    {
        $mins = [];
        $maxs = [];
        $count = 0;
        // 通常時給は廃止。集計は体入時給 (wage.trial) ベース。新キー hourly_min/max を
        // 優先し旧キー avg_hourly/hourly にフォールバック。単位付き文字列も数値化する。
        $parse = static function ($v): ?int {
            if ($v === null || $v === '') return null;
            $n = (int) preg_replace('/[^\d]/', '', (string) $v);
            return $n > 0 ? $n : null;
        };
        foreach ($stores as $store) {
            $count++;
            $trial = $store->wage['trial'] ?? null;
            if (is_array($trial)) {
                $min = $parse($trial['hourly_min'] ?? $trial['avg_hourly'] ?? null);
                $max = $parse($trial['hourly_max'] ?? $trial['hourly'] ?? null);
                if ($min !== null) $mins[] = $min;
                if ($max !== null) $maxs[] = $max;
            }
        }

        return [
            'count' => $count,
            'hourly_min' => empty($mins) ? null : min($mins),
            'hourly_max' => empty($maxs) ? null : max($maxs),
            'avg_hourly_min' => empty($mins) ? null : (int) round(array_sum($mins) / count($mins)),
        ];
    }
}
