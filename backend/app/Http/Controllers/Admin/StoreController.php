<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

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

    private function storeValidationRules(bool $isUpdate = false): array
    {
        $prefix = $isUpdate ? 'sometimes|' : '';

        return [
            'name' => $prefix . 'required|string|max:255',
            'area' => $prefix . 'required|string|max:255',
            'category' => $prefix . 'required|string|max:255',
            'address' => 'nullable|string|max:255',
            'nearest_station' => 'nullable|string|max:255',
            'business_hours' => 'nullable|string|max:255',
            'holidays' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:255',
            'website_url' => 'nullable|string|max:2048',
            'hourly_min' => 'nullable|integer|min:0',
            'hourly_max' => 'nullable|integer|min:0',
            'daily_estimate' => 'nullable|string|max:255',
            'back_items' => 'nullable|array',
            'back_items.*.label' => 'required|string',
            'back_items.*.amount' => 'required|string',
            'fee_items' => 'nullable|array',
            'fee_items.*.label' => 'required|string',
            'fee_items.*.amount' => 'required|string',
            'salary_notes' => 'nullable|string',
            'guarantee_period' => 'nullable|string|max:255',
            'guarantee_details' => 'nullable|string',
            'norma_info' => 'nullable|string',
            'trial_avg_hourly' => 'nullable|string|max:255',
            'trial_hourly' => 'nullable|string|max:255',
            'interview_hours' => 'nullable|string|max:255',
            'same_day_trial' => 'nullable|boolean',
            'feature_tags' => 'nullable|array',
            'feature_tags.*' => 'string',
            'description' => 'nullable|string',
            'features_text' => 'nullable|string',
            'video_url' => 'nullable|string|max:2048',
            'analysis' => 'nullable|array',
            'interview_info' => 'nullable|array',
            'required_documents' => 'nullable|array',
            'schedule' => 'nullable|array',
            'recent_hires' => 'nullable|array',
            'recent_hires_summary' => 'nullable|string|max:255',
            'popular_features' => 'nullable|array',
            'champagne_images' => 'nullable|array',
            'transport_images' => 'nullable|array',
            'after_spots' => 'nullable|array',
            'companion_spots' => 'nullable|array',
            'qa' => 'nullable|array',
            'qa.*.question' => 'required|string',
            'qa.*.answer' => 'required|string',
            'staff_comment' => 'nullable|array',
            'publish_status' => 'nullable|in:published,unpublished,draft',
        ];
    }

    private function fillableFields(): array
    {
        return [
            'name', 'area', 'address', 'nearest_station', 'category',
            'business_hours', 'holidays', 'phone', 'website_url',
            'hourly_min', 'hourly_max', 'daily_estimate',
            'back_items', 'fee_items', 'salary_notes',
            'guarantee_period', 'guarantee_details', 'norma_info',
            'trial_avg_hourly', 'trial_hourly', 'interview_hours', 'same_day_trial',
            'feature_tags', 'description', 'features_text',
            'video_url',
            'analysis', 'interview_info', 'required_documents',
            'schedule', 'recent_hires', 'recent_hires_summary',
            'popular_features', 'champagne_images', 'transport_images',
            'after_spots', 'companion_spots', 'qa', 'staff_comment',
            'publish_status',
        ];
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate($this->storeValidationRules());

        $data = $request->only($this->fillableFields());
        $store = Store::create($data);

        return response()->json($store, 201);
    }

    public function update(Request $request, Store $store): JsonResponse
    {
        $request->validate($this->storeValidationRules(isUpdate: true));

        $data = $request->only($this->fillableFields());
        $store->update($data);

        return response()->json($store);
    }

    public function destroy(Store $store): JsonResponse
    {
        // Delete associated images from storage
        if ($store->images) {
            foreach ($store->images as $imageUrl) {
                $path = str_replace('/storage/', 'public/', $imageUrl);
                Storage::delete($path);
            }
        }

        $store->delete();

        return response()->json(null, 204);
    }

    /**
     * Upload an image for a store.
     * Accepts multipart form data with an 'image' file field.
     * Stores to storage/app/public/stores/ and returns the URL.
     */
    public function uploadImage(Request $request, Store $store): JsonResponse
    {
        $request->validate([
            'image' => 'required|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        $file = $request->file('image');
        $filename = Str::uuid() . '.' . $file->getClientOriginalExtension();
        $file->storeAs('public/stores', $filename);

        $url = '/storage/stores/' . $filename;

        // Append to the store's images array
        $images = $store->images ?? [];
        $images[] = $url;
        $store->update(['images' => $images]);

        return response()->json([
            'url' => $url,
            'images' => $images,
        ], 201);
    }

    /**
     * Delete an image from a store by index.
     */
    public function deleteImage(Store $store, int $index): JsonResponse
    {
        $images = $store->images ?? [];

        if ($index < 0 || $index >= count($images)) {
            return response()->json(['message' => 'Image not found'], 404);
        }

        $imageUrl = $images[$index];

        // Delete from storage
        $path = str_replace('/storage/', 'public/', $imageUrl);
        Storage::delete($path);

        // Remove from array
        array_splice($images, $index, 1);
        $store->update(['images' => array_values($images)]);

        return response()->json([
            'images' => array_values($images),
        ]);
    }
}
