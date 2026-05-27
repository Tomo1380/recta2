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
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AreaCategoryController extends Controller
{
    public function areas(): AnonymousResourceCollection
    {
        $areas = Area::orderBy('sort_order')->get();
        $areas->each(function ($area) {
            $area->shop_count = Store::where('area', $area->name)->count();
        });

        return AreaResource::collection($areas);
    }

    public function storeArea(StoreAreaRequest $request): AreaResource
    {
        $area = Area::create($request->validated());
        return new AreaResource($area);
    }

    public function updateArea(UpdateAreaRequest $request, Area $area): AreaResource
    {
        $area->update($request->validated());
        return new AreaResource($area);
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
            $category->shop_count = Store::where('category', $category->name)->count();
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
     * Upload an image for a category. Stored on the public disk.
     */
    public function uploadCategoryImage(UploadCategoryImageRequest $request, Category $category): CategoryResource
    {
        $path = $request->file('image')->store('categories', 'public');
        $url = \Illuminate\Support\Facades\Storage::disk('public')->url($path);

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
