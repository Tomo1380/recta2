<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ReorderRequest;
use App\Http\Requests\Admin\StoreAreaRequest;
use App\Http\Requests\Admin\StoreCategoryRequest;
use App\Http\Requests\Admin\UpdateAreaRequest;
use App\Http\Requests\Admin\UpdateCategoryRequest;
use App\Http\Requests\Admin\UploadCategoryImageRequest;
use App\Http\Resources\AreaResource;
use App\Http\Resources\CategoryResource;
use App\Models\Area;
use App\Models\Category;
use App\Models\Store;
use App\Services\GeocodingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AreaCategoryController extends Controller
{
    public function __construct(private GeocodingService $geocoding)
    {
    }

    public function areas(): AnonymousResourceCollection
    {
        $areas = Area::orderBy('sort_order')->get();
        $areas->each(function ($area) {
            // 公開店舗のみカウント (トップ /home と基準を統一)。
            $area->shop_count = Store::where('area', $area->name)
                ->where('publish_status', 'published')
                ->count();
        });

        return AreaResource::collection($areas);
    }

    public function storeArea(StoreAreaRequest $request): AreaResource
    {
        $area = Area::create($request->validated());
        // 座標が明示指定されていなければ、エリア名から裏で geocode して中心座標を
        // 自動セットする (トップのピックアップ近隣ソート用)。失敗しても作成は通す。
        if ($area->lat === null && $area->lng === null) {
            $this->geocodeArea($area);
        }
        return new AreaResource($area);
    }

    public function updateArea(UpdateAreaRequest $request, Area $area): AreaResource
    {
        $data = $request->validated();
        $nameChanged = array_key_exists('name', $data) && $data['name'] !== $area->name;
        $coordsGiven = array_key_exists('lat', $data) || array_key_exists('lng', $data);

        $area->update($data);

        // 改名されて座標の手動指定が無い場合は geocode し直す (旧座標がズレるため)。
        if ($nameChanged && !$coordsGiven) {
            $this->geocodeArea($area);
        }
        return new AreaResource($area);
    }

    /**
     * エリア名を geocode して lat/lng を保存する。Google key 未設定や geocode
     * 失敗時は GeocodingService が null を返すので、その場合は座標を触らない
     * (= 距離不明として近隣ソートで末尾に回る)。
     */
    private function geocodeArea(Area $area): void
    {
        $result = $this->geocoding->geocode($area->name);
        if ($result !== null) {
            $area->update(['lat' => $result['lat'], 'lng' => $result['lng']]);
        }
    }

    public function destroyArea(Area $area): JsonResponse
    {
        $area->delete();
        return response()->json(null, 204);
    }

    public function categories(): AnonymousResourceCollection
    {
        $categories = Category::orderBy('sort_order')->get();
        $categories->each(function ($category) {
            // 公開店舗のみカウント (トップ /home と基準を統一)。
            $category->shop_count = Store::where('category', $category->name)
                ->where('publish_status', 'published')
                ->count();
        });

        return CategoryResource::collection($categories);
    }

    public function storeCategory(StoreCategoryRequest $request): CategoryResource
    {
        $category = Category::create($request->validated());
        return new CategoryResource($category);
    }

    public function updateCategory(UpdateCategoryRequest $request, Category $category): CategoryResource
    {
        $category->update($request->validated());
        return new CategoryResource($category);
    }

    /**
     * Upload an image for a category. Stored on S3 (media bucket).
     */
    public function uploadCategoryImage(UploadCategoryImageRequest $request, Category $category): CategoryResource
    {
        $url = \App\Support\MediaStorage::upload($request->file('image'), 'categories');

        $category->update(['image_url' => $url]);

        return new CategoryResource($category);
    }

    public function destroyCategory(Category $category): JsonResponse
    {
        $category->delete();
        return response()->json(null, 204);
    }

    public function reorderAreas(ReorderRequest $request): JsonResponse
    {
        foreach ($request->validated()['ids'] as $index => $id) {
            Area::where('id', $id)->update(['sort_order' => $index]);
        }
        return response()->json(['message' => 'OK']);
    }

    public function reorderCategories(ReorderRequest $request): JsonResponse
    {
        foreach ($request->validated()['ids'] as $index => $id) {
            Category::where('id', $id)->update(['sort_order' => $index]);
        }
        return response()->json(['message' => 'OK']);
    }
}
