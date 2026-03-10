<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Consultation;
use App\Models\PickupShop;
use App\Models\SiteSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContentController extends Controller
{
    public function pickupShops(): JsonResponse
    {
        $pickupShops = PickupShop::with(['store' => function ($query) {
            $query->select('id', 'name', 'area', 'category');
        }])->orderBy('sort_order')->get();

        $pickupShops->each(function ($pickupShop) {
            if ($pickupShop->store) {
                $pickupShop->store->average_rating = $pickupShop->store->averageRating();
            }
        });

        return response()->json($pickupShops);
    }

    public function storePickupShop(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'store_id' => 'required|exists:stores,id',
            'sort_order' => 'integer',
            'is_pr' => 'boolean',
            'visible' => 'boolean',
        ]);

        $pickupShop = PickupShop::create($validated);

        return response()->json($pickupShop, 201);
    }

    public function updatePickupShop(Request $request, PickupShop $pickupShop): JsonResponse
    {
        $validated = $request->validate([
            'store_id' => 'exists:stores,id',
            'sort_order' => 'integer',
            'is_pr' => 'boolean',
            'visible' => 'boolean',
        ]);

        $pickupShop->update($validated);

        return response()->json($pickupShop);
    }

    public function destroyPickupShop(PickupShop $pickupShop): JsonResponse
    {
        $pickupShop->delete();

        return response()->json(null, 204);
    }

    public function reorderPickupShops(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer|exists:pickup_shops,id',
        ]);

        foreach ($validated['ids'] as $index => $id) {
            PickupShop::where('id', $id)->update(['sort_order' => $index]);
        }

        return response()->json(['message' => 'OK']);
    }

    public function consultations(): JsonResponse
    {
        $consultations = Consultation::orderBy('sort_order')->get();

        return response()->json($consultations);
    }

    public function storeConsultation(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'question' => 'required|string',
            'tag' => 'string|max:100',
            'count' => 'integer',
            'visible' => 'boolean',
            'sort_order' => 'integer',
        ]);

        $consultation = Consultation::create($validated);

        return response()->json($consultation, 201);
    }

    public function updateConsultation(Request $request, Consultation $consultation): JsonResponse
    {
        $validated = $request->validate([
            'question' => 'string',
            'tag' => 'string|max:100',
            'count' => 'integer',
            'visible' => 'boolean',
            'sort_order' => 'integer',
        ]);

        $consultation->update($validated);

        return response()->json($consultation);
    }

    public function destroyConsultation(Consultation $consultation): JsonResponse
    {
        $consultation->delete();

        return response()->json(null, 204);
    }

    public function bannerSettings(): JsonResponse
    {
        $keys = ['hero_tagline', 'hero_subtitle', 'hero_badge', 'hero_ai_label'];

        $settings = SiteSetting::whereIn('key', $keys)->pluck('value', 'key');

        $result = [];
        foreach ($keys as $key) {
            $result[$key] = $settings[$key] ?? null;
        }

        return response()->json($result);
    }

    public function updateBannerSettings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'hero_tagline' => 'nullable|string',
            'hero_subtitle' => 'nullable|string',
            'hero_badge' => 'nullable|string',
            'hero_ai_label' => 'nullable|string',
        ]);

        foreach ($validated as $key => $value) {
            SiteSetting::updateOrCreate(
                ['key' => $key],
                ['value' => $value],
            );
        }

        return response()->json($validated);
    }
}
