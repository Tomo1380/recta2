<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Area;
use App\Models\Category;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AreaCategoryController extends Controller
{
    public function areas(): JsonResponse
    {
        $areas = Area::orderBy('sort_order')->get();

        $areas->each(function ($area) {
            $area->shop_count = Store::where('area', $area->name)->count();
        });

        return response()->json($areas);
    }

    public function storeArea(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:255|unique:areas',
            'tier' => 'in:gold,standard',
            'visible' => 'boolean',
            'sort_order' => 'integer',
        ]);

        $area = Area::create($validated);

        return response()->json($area, 201);
    }

    public function updateArea(Request $request, Area $area): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'string|max:255',
            'slug' => 'string|max:255|unique:areas,slug,' . $area->id,
            'tier' => 'in:gold,standard',
            'visible' => 'boolean',
            'sort_order' => 'integer',
        ]);

        $area->update($validated);

        return response()->json($area);
    }

    public function destroyArea(Area $area): JsonResponse
    {
        $area->delete();

        return response()->json(null, 204);
    }

    public function categories(): JsonResponse
    {
        $categories = Category::orderBy('sort_order')->get();

        $categories->each(function ($category) {
            $category->shop_count = Store::where('category', $category->name)->count();
        });

        return response()->json($categories);
    }

    public function storeCategory(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:255|unique:categories',
            'color' => 'string|max:7',
            'visible' => 'boolean',
            'sort_order' => 'integer',
        ]);

        $category = Category::create($validated);

        return response()->json($category, 201);
    }

    public function updateCategory(Request $request, Category $category): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'string|max:255',
            'slug' => 'string|max:255|unique:categories,slug,' . $category->id,
            'color' => 'string|max:7',
            'visible' => 'boolean',
            'sort_order' => 'integer',
        ]);

        $category->update($validated);

        return response()->json($category);
    }

    public function destroyCategory(Category $category): JsonResponse
    {
        $category->delete();

        return response()->json(null, 204);
    }

    public function reorderAreas(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer|exists:areas,id',
        ]);

        foreach ($validated['ids'] as $index => $id) {
            Area::where('id', $id)->update(['sort_order' => $index]);
        }

        return response()->json(['message' => 'OK']);
    }

    public function reorderCategories(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer|exists:categories,id',
        ]);

        foreach ($validated['ids'] as $index => $id) {
            Category::where('id', $id)->update(['sort_order' => $index]);
        }

        return response()->json(['message' => 'OK']);
    }
}
