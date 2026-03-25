<?php

namespace App\Http\Controllers;

use App\Models\Store;
use App\Models\Area;
use App\Models\Category;
use App\Models\PickupShop;
use App\Models\Consultation;
use App\Models\SiteSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
            // Support both slug (from frontend selects) and name
            $categoryName = Category::where('slug', $category)->value('name') ?? $category;
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

        if ($minWage = $request->input('min_hourly')) {
            $query->where('hourly_min', '>=', (int)$minWage);
        }

        $sort = $request->input('sort', 'newest');
        switch ($sort) {
            case 'hourly_desc':
                $query->orderByDesc('hourly_max');
                break;
            case 'hourly_asc':
                $query->orderBy('hourly_min');
                break;
            case 'popular':
                $query->withCount(['reviews' => fn($q) => $q->where('status', 'published')])
                      ->orderByDesc('reviews_count');
                break;
            default: // newest
                $query->orderByDesc('created_at');
        }

        $stores = $query->withCount(['reviews' => fn($q) => $q->where('status', 'published')])
                        ->paginate($request->input('per_page', 20));

        // Add average_rating to each store
        $stores->getCollection()->transform(function ($store) {
            $store->average_rating = round($store->averageRating(), 1);
            return $store;
        });

        return response()->json($stores);
    }

    /**
     * Store detail.
     */
    public function show(Store $store): JsonResponse
    {
        if ($store->publish_status !== 'published') {
            abort(404);
        }

        $store->loadCount(['reviews' => fn($q) => $q->where('status', 'published')]);
        $store->average_rating = round($store->averageRating(), 1);

        // Load published reviews with user info
        $store->load(['reviews' => function ($q) {
            $q->where('status', 'published')
              ->with('user:id,line_display_name,line_picture_url')
              ->orderByDesc('created_at')
              ->limit(10);
        }]);

        // Related stores (same area, same category)
        $related = Store::where('publish_status', 'published')
            ->where('id', '!=', $store->id)
            ->where(function ($q) use ($store) {
                $q->where('area', $store->area)
                  ->orWhere('category', $store->category);
            })
            ->withCount(['reviews' => fn($q) => $q->where('status', 'published')])
            ->limit(6)
            ->get();

        $related->transform(function ($s) {
            $s->average_rating = round($s->averageRating(), 1);
            return $s;
        });

        return response()->json([
            'store' => $store,
            'related' => $related,
        ]);
    }

    /**
     * Visible areas list.
     */
    public function areas(): JsonResponse
    {
        $areas = Area::where('visible', true)
            ->orderBy('sort_order')
            ->get(['id', 'name', 'slug', 'tier']);

        return response()->json($areas);
    }

    /**
     * Visible categories list.
     */
    public function categories(): JsonResponse
    {
        $categories = Category::where('visible', true)
            ->orderBy('sort_order')
            ->get(['id', 'name', 'slug', 'color']);

        return response()->json($categories);
    }

    /**
     * Homepage data: banner, pickup shops, consultations.
     */
    public function home(): JsonResponse
    {
        // Banner settings
        $bannerKeys = ['hero_tagline', 'hero_subtitle', 'hero_badge', 'hero_ai_label'];
        $banner = [];
        foreach ($bannerKeys as $key) {
            $setting = SiteSetting::where('key', $key)->first();
            $banner[$key] = $setting?->value ?? '';
        }

        // Pickup shops with store data
        $pickups = PickupShop::where('visible', true)
            ->with('store')
            ->orderBy('sort_order')
            ->get()
            ->filter(fn($p) => $p->store && $p->store->publish_status === 'published')
            ->map(function ($pickup) {
                $store = $pickup->store;
                return [
                    'id' => $store->id,
                    'name' => $store->name,
                    'area' => $store->area,
                    'category' => $store->category,
                    'hourly_min' => $store->hourly_min,
                    'hourly_max' => $store->hourly_max,
                    'feature_tags' => $store->feature_tags,
                    'images' => $store->images,
                    'is_pr' => $pickup->is_pr,
                    'reviews_count' => $store->reviewCount(),
                    'average_rating' => round($store->averageRating(), 1),
                ];
            })
            ->values();

        // Consultations
        $consultations = Consultation::where('visible', true)
            ->orderBy('sort_order')
            ->get(['id', 'question', 'tag', 'count']);

        // Areas for quick navigation
        $areas = Area::where('visible', true)
            ->orderBy('sort_order')
            ->get(['id', 'name', 'slug', 'tier']);

        // Categories
        $categories = Category::where('visible', true)
            ->orderBy('sort_order')
            ->get(['id', 'name', 'slug', 'color']);

        return response()->json([
            'banner' => $banner,
            'pickup_shops' => $pickups,
            'consultations' => $consultations,
            'areas' => $areas,
            'categories' => $categories,
        ]);
    }
}
