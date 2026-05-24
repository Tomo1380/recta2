<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Services\GeocodingService;
use App\Support\StoreApiTransformer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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

        // Transform each store to include backward-compatible flattened fields
        $stores->getCollection()->transform(function ($store) {
            return StoreApiTransformer::toAdminArray($store);
        });

        return response()->json($stores);
    }

    public function show(Store $store): JsonResponse
    {
        // videos / staffPhotos を eager load しないと
        // ShopEdit が「動画なし」表示になり、保存時に syncVideos() で全消失する。
        $store
            ->load(['videos', 'staffPhotos'])
            ->loadCount(['reviews' => fn ($q) => $q->where('status', 'published')]);

        return response()->json(StoreApiTransformer::toAdminArray($store));
    }

    private function storeValidationRules(bool $isUpdate = false): array
    {
        $prefix = $isUpdate ? 'sometimes|' : '';

        return [
            // Top-level scalar columns
            'name' => $prefix . 'required|string|max:255',
            'area' => $prefix . 'required|string|max:255',
            'category' => $prefix . 'required|string|max:255',
            'address' => 'nullable|string|max:255',
            'lat' => 'nullable|numeric|between:-90,90',
            'lng' => 'nullable|numeric|between:-180,180',
            'nearest_station' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:255',
            'website_url' => 'nullable|string|max:2048',
            'description' => 'nullable|string',
            'features_text' => 'nullable|string',
            'recent_hires_summary' => 'nullable|string|max:255',
            'transfer_description' => 'nullable|string',
            'transfer_km' => 'nullable|string|max:50',
            'champagne_description' => 'nullable|string',
            'experience_guaranteed' => 'nullable|boolean',
            'publish_status' => 'nullable|in:published,unpublished,draft',

            // JSONB columns (free-form arrays)
            'schedule' => 'nullable|array',
            'wage' => 'nullable|array',
            'compensation' => 'nullable|array',
            'guarantee' => 'nullable|array',
            'interview' => 'nullable|array',
            'feature_tags' => 'nullable|array',
            'feature_tags.*' => 'string',
            'images' => 'nullable|array',
            'analysis' => 'nullable|array',
            'required_documents' => 'nullable|array',
            'recent_hires' => 'nullable|array',
            'qa' => 'nullable|array',
            'qa.*.question' => 'required|string',
            'qa.*.answer' => 'required|string',
            'staff_comment' => 'nullable|array',
            'champagne_prices' => 'nullable|array',
            'transfer_zones' => 'nullable|array',
            'transfer_zones.*.label' => 'nullable|string|max:60',
            'transfer_zones.*.radius_km' => 'nullable',
            'transfer_zones.*.fee' => 'nullable',
            'transfer_zones.*.color' => 'nullable|string|max:30',
            'dress_code' => 'nullable|array',
            'set_fee' => 'nullable|array',
            'recta_episodes' => 'nullable|array',
            'related_store_ids' => 'nullable|array',
            'related_store_ids.*' => 'integer',

            // store_videos の同期に使うペイロード。配列で受け取り、
            // controller 側で順序・差分を解決して store_videos テーブルに反映する。
            //
            // URL は `url` validation ではなく regex で「http(s) もしくは内部 storage パス」
            // のみ許容する。`url` だと `javascript:` や `data:` も通すブラウザがあるため。
            'videos' => 'nullable|array',
            'videos.*.video_url' => 'required_with:videos|string|max:500|regex:#^(https?://|/storage/)#',
            'videos.*.label' => 'nullable|string|max:100',
            'videos.*.description' => 'nullable|string',
            'videos.*.poster_url' => 'nullable|string|max:500|regex:#^(https?://|/storage/)#',

            // store_staff_photos の同期。videos と同じ全置換方式。
            'staff_photos' => 'nullable|array',
            'staff_photos.*.image_url' => 'required_with:staff_photos|string|max:500|regex:#^(https?://|/storage/)#',
            'staff_photos.*.caption' => 'nullable|string|max:255',
            'staff_photos.*.instagram_url' => 'nullable|string|max:500|regex:#^https?://(www\.)?instagram\.com/#i',
            'staff_photos.*.staff_type' => 'nullable|string|max:50',
        ];
    }

    private function fillableFields(): array
    {
        return [
            'name', 'area', 'address', 'lat', 'lng', 'nearest_station', 'category',
            'phone', 'website_url',
            'schedule',
            'wage', 'compensation', 'guarantee', 'interview',
            'feature_tags', 'description', 'features_text',
            'images',
            'analysis', 'required_documents',
            'recent_hires', 'recent_hires_summary',
            'qa', 'staff_comment',
            'champagne_prices', 'champagne_description',
            'transfer_description', 'transfer_km', 'transfer_zones',
            'dress_code', 'set_fee',
            'recta_episodes', 'related_store_ids',
            'experience_guaranteed', 'publish_status',
        ];
    }

    public function store(Request $request): JsonResponse
    {
        // 旧 admin UI / API 直叩きが legacy `video_url` 単一フィールドを送る互換シナリオ。
        // `videos` が未指定でも `video_url` があれば 1 本の動画として bridge する。
        // （Sprint 3-A 以降のフロントは `videos[]` で送るので、新規呼び出しでは経由しない）
        $this->bridgeLegacyVideoUrl($request);

        $request->validate($this->storeValidationRules());

        // Store 本体作成と videos / staff_photos 同期はアトミックに行う。
        // 途中で例外が出たら全部ロールバックして、孤児レコードや
        // videos 全消失（delete 後 createMany 失敗）を防ぐ。
        $store = DB::transaction(function () use ($request) {
            $data = $this->normalizeIncomingPayload($request->only(array_merge($this->fillableFields(), $this->legacyCompatibilityFields())));
            $store = Store::create($data);

            if ($request->has('videos')) {
                $this->syncVideos($store, $request->input('videos', []));
            }
            if ($request->has('staff_photos')) {
                $this->syncStaffPhotos($store, $request->input('staff_photos', []));
            }

            return $store;
        });

        return response()->json(StoreApiTransformer::toAdminArray($store->load(['videos', 'staffPhotos'])), 201);
    }

    public function update(Request $request, Store $store): JsonResponse
    {
        // Legacy `video_url` 互換は store() と同じく入口で bridge する。
        $this->bridgeLegacyVideoUrl($request);

        // Allow either new JSONB fields or legacy flat fields (for transitional admin UI compat)
        $rules = $this->storeValidationRules(isUpdate: true);
        $request->validate($rules + $this->legacyCompatibilityValidationRules());

        $data = $this->normalizeIncomingPayload(
            $request->only(array_merge($this->fillableFields(), $this->legacyCompatibilityFields()))
        );

        // Merge wage/schedule/etc. with any existing JSONB so partial updates don't wipe siblings
        if (isset($data['wage']) && is_array($store->wage)) {
            $data['wage'] = array_replace_recursive($store->wage, $data['wage']);
        }
        if (isset($data['schedule']) && is_array($store->schedule)) {
            $data['schedule'] = array_replace_recursive($store->schedule, $data['schedule']);
        }
        if (isset($data['guarantee']) && is_array($store->guarantee)) {
            $data['guarantee'] = array_replace_recursive($store->guarantee, $data['guarantee']);
        }
        if (isset($data['interview']) && is_array($store->interview)) {
            $data['interview'] = array_replace_recursive($store->interview, $data['interview']);
        }
        if (isset($data['compensation']) && is_array($store->compensation)) {
            $data['compensation'] = array_replace_recursive($store->compensation, $data['compensation']);
        }

        // update 本体と sync* をアトミックに（途中失敗で部分反映を残さない）
        DB::transaction(function () use ($store, $data, $request) {
            $store->update($data);

            if ($request->has('videos')) {
                $this->syncVideos($store, $request->input('videos', []));
            }
            if ($request->has('staff_photos')) {
                $this->syncStaffPhotos($store, $request->input('staff_photos', []));
            }
        });

        return response()->json(StoreApiTransformer::toAdminArray($store->fresh()->load(['videos', 'staffPhotos'])));
    }

    /**
     * 受け取った videos 配列で store_videos を全置換する。
     *
     * 既存実装の `images` カラムと同じく、管理画面では並び順込みでフルリストを
     * 送るシンプルな同期方式を採る（差分計算より UI が分かりやすい）。
     *
     * @param  array<int, array{video_url:string,label?:?string,description?:?string,poster_url?:?string}>  $videos
     */
    private function syncVideos(Store $store, array $videos): void
    {
        $store->videos()->delete();

        $records = [];
        foreach (array_values($videos) as $i => $row) {
            if (!isset($row['video_url']) || $row['video_url'] === '') {
                continue;
            }
            $records[] = [
                'video_url' => (string) $row['video_url'],
                'label' => $row['label'] ?? null,
                'description' => $row['description'] ?? null,
                'poster_url' => $row['poster_url'] ?? null,
                'display_order' => $i,
            ];
        }
        if (!empty($records)) {
            $store->videos()->createMany($records);
        }
    }

    /**
     * 旧 admin UI / API 直叩き互換: `video_url` が単独で送られて `videos`
     * が無い場合のみ、`videos: [{ video_url, label: '店舗紹介動画' }]` に
     * リライトする。`videos` が明示的に送られていればそちらを優先（破壊しない）。
     *
     * 新フロントは `videos[]` のみ送るのでこの分岐は経由しない。
     */
    private function bridgeLegacyVideoUrl(Request $request): void
    {
        if ($request->has('videos')) {
            return; // 既に新形式
        }
        $legacy = $request->input('video_url');
        if (!is_string($legacy) || $legacy === '') {
            return;
        }
        $request->merge([
            'videos' => [[
                'video_url' => $legacy,
                'label' => '店舗紹介動画',
            ]],
        ]);
    }

    /**
     * 受け取った staff_photos 配列で store_staff_photos を全置換する。
     * 同期方式は syncVideos と同じ（差分計算より UI が分かりやすい全置換）。
     *
     * @param  array<int, array{image_url:string,caption?:?string,instagram_url?:?string,staff_type?:?string}>  $photos
     */
    private function syncStaffPhotos(Store $store, array $photos): void
    {
        $store->staffPhotos()->delete();

        $records = [];
        foreach (array_values($photos) as $i => $row) {
            if (!isset($row['image_url']) || $row['image_url'] === '') {
                continue;
            }
            $records[] = [
                'image_url' => (string) $row['image_url'],
                'caption' => $row['caption'] ?? null,
                'instagram_url' => $row['instagram_url'] ?? null,
                'staff_type' => $row['staff_type'] ?? null,
                'display_order' => $i,
            ];
        }
        if (!empty($records)) {
            $store->staffPhotos()->createMany($records);
        }
    }

    /**
     * Admin-only: convert an address to lat/lng via Google Geocoding.
     * Used by the ShopEdit「住所から緯度経度を取得」button — the editor reviews
     * the result on the map preview before committing it with the rest of the
     * form payload.
     */
    public function geocode(Request $request, GeocodingService $geo): JsonResponse
    {
        $validated = $request->validate([
            'address' => 'required|string|max:255',
        ]);

        $result = $geo->geocode($validated['address']);

        if (!$result) {
            return response()->json([
                'message' => '緯度経度を取得できませんでした。住所を確認してください。',
            ], 422);
        }

        return response()->json($result);
    }

    public function destroy(Store $store): JsonResponse
    {
        // Delete associated images from storage
        if ($store->images) {
            foreach ($store->images as $imageUrl) {
                $url = is_array($imageUrl) ? ($imageUrl['url'] ?? null) : $imageUrl;
                if (!$url) {
                    continue;
                }
                $path = str_replace('/storage/', 'public/', $url);
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
        $url = is_array($imageUrl) ? ($imageUrl['url'] ?? null) : $imageUrl;

        if ($url) {
            // Delete from storage
            $path = str_replace('/storage/', 'public/', $url);
            Storage::delete($path);
        }

        // Remove from array
        array_splice($images, $index, 1);
        $store->update(['images' => array_values($images)]);

        return response()->json([
            'images' => array_values($images),
        ]);
    }

    // -----------------------------------------------------------------------
    // Legacy compatibility (transitional)
    // -----------------------------------------------------------------------

    /**
     * Legacy flat-field names that the old admin UI may still send.
     * Accepted on input and merged into the new JSONB structures.
     */
    private function legacyCompatibilityFields(): array
    {
        return [
            'business_hours', 'opening_time', 'closing_time', 'holidays', 'shift_info',
            'hourly_min', 'hourly_max', 'daily_estimate',
            'back_items', 'fee_items', 'salary_notes',
            'guarantee_period', 'guarantee_details', 'norma_info', 'same_day_trial',
            'trial_avg_hourly', 'trial_hourly',
            'payroll_system_type', 'payroll_system_description',
            'interview_hours', 'interview_start', 'interview_end',
            'interview_info',
        ];
    }

    private function legacyCompatibilityValidationRules(): array
    {
        return [
            'business_hours' => 'nullable|string|max:255',
            'opening_time' => 'nullable|string|max:10',
            'closing_time' => 'nullable|string|max:10',
            'holidays' => 'nullable|string|max:255',
            'shift_info' => 'nullable|string|max:255',
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
            'same_day_trial' => 'nullable|boolean',
            'trial_avg_hourly' => 'nullable|string|max:255',
            'trial_hourly' => 'nullable|string|max:255',
            'payroll_system_type' => 'nullable|string|max:100',
            'payroll_system_description' => 'nullable|string',
            'interview_hours' => 'nullable|string|max:255',
            'interview_start' => 'nullable|string|max:10',
            'interview_end' => 'nullable|string|max:10',
            'interview_info' => 'nullable|array',
        ];
    }

    /**
     * Normalize an incoming payload that may contain either the new JSONB
     * fields or legacy flat fields. Legacy fields are folded into the
     * matching JSONB structures.
     */
    private function normalizeIncomingPayload(array $data): array
    {
        // Pop legacy fields out so they don't leak into the model
        $legacy = [];
        foreach ($this->legacyCompatibilityFields() as $f) {
            if (array_key_exists($f, $data)) {
                $legacy[$f] = $data[$f];
                unset($data[$f]);
            }
        }

        // schedule
        $schedule = $data['schedule'] ?? [];
        if (array_key_exists('opening_time', $legacy)) $schedule['open'] = $legacy['opening_time'];
        if (array_key_exists('closing_time', $legacy)) $schedule['close'] = $legacy['closing_time'];
        if (array_key_exists('holidays', $legacy))     $schedule['holidays'] = $legacy['holidays'];
        if (array_key_exists('shift_info', $legacy))   $schedule['shift_info'] = $legacy['shift_info'];
        if (array_key_exists('business_hours', $legacy)) $schedule['hours_text'] = $legacy['business_hours'];
        if (!empty($schedule)) {
            $data['schedule'] = $schedule;
        }

        // wage
        $wage = $data['wage'] ?? [];
        $regular = $wage['regular'] ?? [];
        if (array_key_exists('hourly_min', $legacy)) $regular['min'] = $legacy['hourly_min'];
        if (array_key_exists('hourly_max', $legacy)) $regular['max'] = $legacy['hourly_max'];
        if (!empty($regular)) $wage['regular'] = $regular;

        $trial = $wage['trial'] ?? [];
        if (array_key_exists('trial_hourly', $legacy)) $trial['hourly'] = $legacy['trial_hourly'];
        if (array_key_exists('trial_avg_hourly', $legacy)) $trial['avg_hourly'] = $legacy['trial_avg_hourly'];
        if (!empty($trial)) $wage['trial'] = $trial;

        $payroll = $wage['payroll'] ?? [];
        if (array_key_exists('payroll_system_type', $legacy)) $payroll['type'] = $legacy['payroll_system_type'];
        if (array_key_exists('payroll_system_description', $legacy)) $payroll['description'] = $legacy['payroll_system_description'];
        if (!empty($payroll)) $wage['payroll'] = $payroll;

        if (array_key_exists('daily_estimate', $legacy)) $wage['daily_estimate'] = $legacy['daily_estimate'];
        if (!empty($wage)) {
            $data['wage'] = $wage;
        }

        // compensation
        $compensation = $data['compensation'] ?? [];
        if (array_key_exists('back_items', $legacy)) $compensation['back'] = $legacy['back_items'];
        if (array_key_exists('fee_items', $legacy))  $compensation['fees'] = $legacy['fee_items'];
        if (array_key_exists('salary_notes', $legacy)) $compensation['notes'] = $legacy['salary_notes'];
        if (!empty($compensation)) {
            $data['compensation'] = $compensation;
        }

        // guarantee
        $guarantee = $data['guarantee'] ?? [];
        if (array_key_exists('guarantee_period', $legacy)) $guarantee['period'] = $legacy['guarantee_period'];
        if (array_key_exists('guarantee_details', $legacy)) $guarantee['details'] = $legacy['guarantee_details'];
        if (array_key_exists('norma_info', $legacy)) $guarantee['norma'] = $legacy['norma_info'];
        if (array_key_exists('same_day_trial', $legacy)) $guarantee['same_day_trial'] = (bool)$legacy['same_day_trial'];
        if (!empty($guarantee)) {
            $data['guarantee'] = $guarantee;
        }

        // interview
        $interview = $data['interview'] ?? [];
        if (array_key_exists('interview_start', $legacy)) $interview['start'] = $legacy['interview_start'];
        if (array_key_exists('interview_end', $legacy))   $interview['end'] = $legacy['interview_end'];
        if (array_key_exists('interview_info', $legacy) && is_array($legacy['interview_info'])) {
            $interview = array_replace($interview, $legacy['interview_info']);
        }
        if (!empty($interview)) {
            $data['interview'] = $interview;
        }

        return $data;
    }
}
