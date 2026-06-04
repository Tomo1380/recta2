<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ReorderRequest;
use App\Http\Requests\Admin\StoreConsultationRequest;
use App\Http\Requests\Admin\StorePickupShopRequest;
use App\Http\Requests\Admin\UpdateBannerSettingsRequest;
use App\Http\Requests\Admin\UpdateConsultationRequest;
use App\Http\Requests\Admin\UpdatePickupShopRequest;
use App\Http\Resources\BannerSettingsResource;
use App\Http\Resources\ConsultationResource;
use App\Http\Resources\PickupShopResource;
use App\Models\Consultation;
use App\Models\PickupShop;
use App\Models\SiteSetting;
use App\Services\Content\OgImageRenderer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ContentController extends Controller
{
    public function pickupShops(): AnonymousResourceCollection
    {
        $pickupShops = PickupShop::with(['store' => function ($query) {
            $query->select('id', 'name', 'area', 'category');
        }])->orderBy('sort_order')->get();

        $pickupShops->each(function ($pickupShop) {
            if ($pickupShop->store) {
                $pickupShop->store->average_rating = $pickupShop->store->averageRating();
            }
        });

        return PickupShopResource::collection($pickupShops);
    }

    public function storePickupShop(StorePickupShopRequest $request): PickupShopResource
    {
        $pickupShop = PickupShop::create($request->validated());
        $pickupShop->load(['store' => fn ($q) => $q->select('id', 'name', 'area', 'category')]);
        return new PickupShopResource($pickupShop);
    }

    public function updatePickupShop(UpdatePickupShopRequest $request, PickupShop $pickupShop): PickupShopResource
    {
        $pickupShop->update($request->validated());
        $pickupShop->load(['store' => fn ($q) => $q->select('id', 'name', 'area', 'category')]);
        return new PickupShopResource($pickupShop);
    }

    public function destroyPickupShop(PickupShop $pickupShop): JsonResponse
    {
        $pickupShop->delete();
        return response()->json(null, 204);
    }

    public function reorderPickupShops(ReorderRequest $request): JsonResponse
    {
        foreach ($request->validated()['ids'] as $index => $id) {
            PickupShop::where('id', $id)->update(['sort_order' => $index]);
        }
        return response()->json(['message' => 'OK']);
    }

    public function consultations(): AnonymousResourceCollection
    {
        $consultations = Consultation::orderBy('sort_order')->get();
        return ConsultationResource::collection($consultations);
    }

    public function storeConsultation(StoreConsultationRequest $request): ConsultationResource
    {
        $consultation = Consultation::create($request->validated());
        return new ConsultationResource($consultation);
    }

    public function updateConsultation(UpdateConsultationRequest $request, Consultation $consultation): ConsultationResource
    {
        $consultation->update($request->validated());
        return new ConsultationResource($consultation);
    }

    public function destroyConsultation(Consultation $consultation): JsonResponse
    {
        $consultation->delete();
        return response()->json(null, 204);
    }

    public function bannerSettings(): BannerSettingsResource
    {
        $keys = ['hero_tagline', 'hero_subtitle', 'hero_badge', 'hero_ai_label', 'hero_image_url'];
        $settings = SiteSetting::whereIn('key', $keys)->pluck('value', 'key');

        $result = [];
        foreach ($keys as $key) {
            $result[$key] = $settings[$key] ?? null;
        }

        return new BannerSettingsResource($result);
    }

    public function updateBannerSettings(
        UpdateBannerSettingsRequest $request,
        OgImageRenderer $ogRenderer,
    ): BannerSettingsResource {
        $validated = $request->validated();
        foreach ($validated as $key => $value) {
            SiteSetting::updateOrCreate(['key' => $key], ['value' => $value]);
        }

        // ヒーロー文言/背景が変わったら SNS シェア用 OG 画像を作り直す。
        // 生成失敗 (フォント無し等) で保存自体を巻き込まないよう握りつぶし、
        // 配信 endpoint 側の遅延生成にフォールバックさせる。
        try {
            $ogRenderer->regenerateHomeOgImage();
        } catch (\Throwable $e) {
            report($e);
        }

        return new BannerSettingsResource($validated);
    }
}
