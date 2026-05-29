<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UploadStoreImageRequest;
use App\Http\Resources\StoreResource;
use App\Models\Store;
use App\Services\GeocodingService;
use App\Services\Store\StoreImageService;
use App\Support\PaginatorWithResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class StoreController extends Controller
{
    public function __construct(
        private StoreImageService $images,
    ) {}

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

        return response()->json(PaginatorWithResource::map($stores, StoreResource::class));
    }

    public function show(Store $store): JsonResponse
    {
        // videos / staffPhotos を eager load しないと
        // ShopEdit が「動画なし」表示になり、保存時に syncVideos() で全消失する。
        $store
            ->load(['videos', 'staffPhotos'])
            ->loadCount(['reviews' => fn ($q) => $q->where('status', 'published')]);

        return response()->json((new StoreResource($store))->resolve());
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
            'priority' => 'nullable|integer|between:-1000,1000',
            // slug: lowercase / digit / hyphen のみ。store 自身を除いて unique。
            'slug' => ['nullable', 'string', 'max:160', 'regex:/^[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?$/'],
            'seo_meta_description' => 'nullable|string|max:500',

            // JSONB columns (free-form arrays)
            'schedule' => 'nullable|array',
            // wage は freeform array だが、金額キーは number 強制 (string で
            // 「1,500円」が混入すると比較ページ等で計算が破綻する)。
            'wage' => 'nullable|array',
            'wage.regular.min' => 'nullable|integer|min:0',
            'wage.regular.max' => 'nullable|integer|min:0',
            'wage.regular.unit' => 'nullable|string|in:hour,day',
            'wage.trial.hourly_min' => 'nullable|integer|min:0',
            'wage.trial.hourly_max' => 'nullable|integer|min:0',
            'wage.trial.days' => 'nullable|integer|min:0',
            'wage.daily_estimate_min' => 'nullable|integer|min:0',
            'wage.daily_estimate_max' => 'nullable|integer|min:0',
            // compensation.back / fees は {label, value:int, unit:'yen'|'percent'|'free'} 構造。
            'compensation' => 'nullable|array',
            'compensation.back' => 'nullable|array',
            'compensation.back.*.label' => 'required_with:compensation.back|string|max:60',
            'compensation.back.*.value' => 'nullable|integer|min:0',
            'compensation.back.*.unit' => 'nullable|string|in:yen,percent,free',
            'compensation.fees' => 'nullable|array',
            'compensation.fees.*.label' => 'required_with:compensation.fees|string|max:60',
            'compensation.fees.*.value' => 'nullable|integer|min:0',
            'compensation.fees.*.unit' => 'nullable|string|in:yen,percent,free',
            'compensation.fees.*.per_day' => 'nullable|boolean',
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
            // のみ許容する (`url` だと javascript: や data: も通すブラウザがあるため)。
            // NOTE: Laravel は rule を文字列で書くと `|` で分割するので、regex の中に
            // alternation の `|` を含めると pattern が壊れる ("No ending delimiter '#' found")。
            // regex ルールは必ず array 形式で書く。
            'videos' => 'nullable|array',
            'videos.*.video_url' => ['required_with:videos', 'string', 'max:500', 'regex:#^(https?://|/storage/)#'],
            'videos.*.label' => 'nullable|string|max:100',
            'videos.*.description' => 'nullable|string',
            'videos.*.poster_url' => ['nullable', 'string', 'max:500', 'regex:#^(https?://|/storage/)#'],

            // store_staff_photos の同期。videos と同じ全置換方式。
            'staff_photos' => 'nullable|array',
            'staff_photos.*.image_url' => ['required_with:staff_photos', 'string', 'max:500', 'regex:#^(https?://|/storage/)#'],
            'staff_photos.*.caption' => 'nullable|string|max:255',
            'staff_photos.*.instagram_url' => ['nullable', 'string', 'max:500', 'regex:#^https?://(www\.)?instagram\.com/#i'],
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
            'priority',
            'slug',
            'seo_meta_description',
        ];
    }

    public function store(Request $request): JsonResponse
    {
        // 旧 admin UI / API 直叩きが legacy `video_url` 単一フィールドを送る互換シナリオ。
        // `videos` が未指定でも `video_url` があれば 1 本の動画として bridge する。
        // （Sprint 3-A 以降のフロントは `videos[]` で送るので、新規呼び出しでは経由しない）
        $this->images->bridgeLegacyVideoUrl($request);

        $request->validate($this->storeValidationRules());

        // Store 本体作成と videos / staff_photos 同期はアトミックに行う。
        // 途中で例外が出たら全部ロールバックして、孤児レコードや
        // videos 全消失（delete 後 createMany 失敗）を防ぐ。
        $store = DB::transaction(function () use ($request) {
            $data = $this->normalizeIncomingPayload($request->only(array_merge($this->fillableFields(), $this->legacyCompatibilityFields())));
            $store = Store::create($data);

            if ($request->has('videos')) {
                $this->images->syncVideos($store, $request->input('videos', []));
            }
            if ($request->has('staff_photos')) {
                $this->images->syncStaffPhotos($store, $request->input('staff_photos', []));
            }

            return $store;
        });

        return response()->json((new StoreResource($store->load(['videos', 'staffPhotos'])))->resolve(), 201);
    }

    public function update(Request $request, Store $store): JsonResponse
    {
        // Legacy `video_url` 互換は store() と同じく入口で bridge する。
        $this->images->bridgeLegacyVideoUrl($request);

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
                $this->images->syncVideos($store, $request->input('videos', []));
            }
            if ($request->has('staff_photos')) {
                $this->images->syncStaffPhotos($store, $request->input('staff_photos', []));
            }
        });

        return response()->json((new StoreResource($store->fresh()->load(['videos', 'staffPhotos'])))->resolve());
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

    public function uploadImage(UploadStoreImageRequest $request, Store $store): JsonResponse
    {
        return response()->json(
            $this->images->uploadImage($store, $request->file('image')),
            201,
        );
    }

    public function deleteImage(Store $store, int $index): JsonResponse
    {
        $result = $this->images->deleteImage($store, $index);

        if ($result === null) {
            return response()->json(['message' => 'Image not found'], 404);
        }

        return response()->json($result);
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
            'trial_avg_hourly', 'trial_hourly', // 旧キー (deprecated)
            'trial_hourly_min', 'trial_hourly_max',
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
            // 体入タイプ: 'same_day' | 'normal' | 'none'。
            'same_day_trial' => 'nullable|string|in:same_day,normal,none',
            // 旧キー (deprecated, 互換受け入れのみ)
            'trial_avg_hourly' => 'nullable|string|max:255',
            'trial_hourly' => 'nullable|string|max:255',
            // 新キー (体入時給の最低/最高)
            'trial_hourly_min' => 'nullable|string|max:255',
            'trial_hourly_max' => 'nullable|string|max:255',
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
        // 新キー優先で書き込み。旧キーが来た場合は最低=avg, 最高=hourly に
        // フォールバックして保存する (フロント旧版互換)。
        if (array_key_exists('trial_hourly_min', $legacy)) $trial['hourly_min'] = $legacy['trial_hourly_min'];
        if (array_key_exists('trial_hourly_max', $legacy)) $trial['hourly_max'] = $legacy['trial_hourly_max'];
        if (!array_key_exists('trial_hourly_min', $legacy) && array_key_exists('trial_avg_hourly', $legacy)) {
            $trial['hourly_min'] = $legacy['trial_avg_hourly'];
        }
        if (!array_key_exists('trial_hourly_max', $legacy) && array_key_exists('trial_hourly', $legacy)) {
            $trial['hourly_max'] = $legacy['trial_hourly'];
        }
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
        if (array_key_exists('same_day_trial', $legacy)) {
            // 体入タイプ: 'same_day' | 'normal' | 'none'。それ以外は 'none' に倒す。
            $raw = $legacy['same_day_trial'];
            $guarantee['same_day_trial'] = in_array($raw, ['same_day', 'normal', 'none'], true)
                ? $raw : 'none';
        }
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
