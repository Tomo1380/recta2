<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StoreController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Store::query();

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('area', 'ilike', "%{$search}%")
                  ->orWhere('nearest_station', 'ilike', "%{$search}%");
            });
        }

        if ($area = $request->input('area')) {
            $query->where('area', $area);
        }

        if ($category = $request->input('category')) {
            $query->where('category', $category);
        }

        if ($status = $request->input('publish_status')) {
            $query->where('publish_status', $status);
        }

        $stores = $query->withCount(['reviews' => fn ($q) => $q->where('status', 'published')])
            ->orderBy('updated_at', 'desc')
            ->paginate($request->input('per_page', 20));

        return response()->json($stores);
    }

    public function show(Store $store): JsonResponse
    {
        $store->loadCount(['reviews' => fn ($q) => $q->where('status', 'published')]);

        return response()->json($store);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'area' => 'required|string|max:255',
            'category' => 'required|string|max:255',
            'publish_status' => 'in:published,unpublished,draft',
        ]);

        $store = Store::create($request->all());

        return response()->json($store, 201);
    }

    public function update(Request $request, Store $store): JsonResponse
    {
        $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'area' => 'sometimes|required|string|max:255',
            'category' => 'sometimes|required|string|max:255',
        ]);

        $store->update($request->all());

        return response()->json($store);
    }

    public function destroy(Store $store): JsonResponse
    {
        $store->delete();

        return response()->json(null, 204);
    }
}
