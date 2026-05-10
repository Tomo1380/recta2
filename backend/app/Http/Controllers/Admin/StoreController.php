<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Support\StoreApiTransformer;
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

        // Transform each store to include backward-compatible flattened fields
        $stores->getCollection()->transform(function ($store) {
            return StoreApiTransformer::toAdminArray($store);
        });

        return response()->json($stores);
    }

    public function show(Store $store): JsonResponse
    {
        $store->loadCount(['reviews' => fn ($q) => $q->where('status', 'published')]);

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
            'nearest_station' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:255',
            'website_url' => 'nullable|string|max:2048',
            'rank' => 'nullable|string|max:10',
            'video_url' => 'nullable|string|max:2048',
            'description' => 'nullable|string',
            'features_text' => 'nullable|string',
            'recent_hires_summary' => 'nullable|string|max:255',
            'transfer_description' => 'nullable|string',
            'transfer_km' => 'nullable|string|max:50',
            'transfer_map_image_url' => 'nullable|string|max:2048',
            'champagne_description' => 'nullable|string',
            'experience_guaranteed' => 'nullable|boolean',
            'publish_status' => 'nullable|in:published,unpublished,draft',

            // JSONB columns (free-form arrays)
            'schedule' => 'nullable|array',
            'wage' => 'nullable|array',
            'compensation' => 'nullable|array',
            'guarantee' => 'nullable|array',
            'cast_profile' => 'nullable|array',
            'interview' => 'nullable|array',
            'feature_tags' => 'nullable|array',
            'feature_tags.*' => 'string',
            'images' => 'nullable|array',
            'analysis' => 'nullable|array',
            'required_documents' => 'nullable|array',
            'recent_hires' => 'nullable|array',
            'popular_features' => 'nullable|array',
            'qa' => 'nullable|array',
            'qa.*.question' => 'required|string',
            'qa.*.answer' => 'required|string',
            'staff_comment' => 'nullable|array',
            'champagne_prices' => 'nullable|array',
            'transfer_zones' => 'nullable|array',
            'dress_code' => 'nullable|array',
            'set_fee' => 'nullable|array',
            'salary_simulator' => 'nullable|array',
            'recta_episodes' => 'nullable|array',
            'related_store_ids' => 'nullable|array',
        ];
    }

    private function fillableFields(): array
    {
        return [
            'name', 'area', 'address', 'nearest_station', 'category',
            'phone', 'website_url', 'rank',
            'schedule',
            'wage', 'compensation', 'guarantee', 'cast_profile', 'interview',
            'feature_tags', 'description', 'features_text',
            'images', 'video_url',
            'analysis', 'required_documents',
            'recent_hires', 'recent_hires_summary',
            'popular_features', 'qa', 'staff_comment',
            'champagne_prices', 'champagne_description',
            'transfer_description', 'transfer_km', 'transfer_map_image_url', 'transfer_zones',
            'dress_code', 'set_fee', 'salary_simulator',
            'recta_episodes', 'related_store_ids',
            'experience_guaranteed', 'publish_status',
        ];
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate($this->storeValidationRules());

        $data = $this->normalizeIncomingPayload($request->only($this->fillableFields() + $this->legacyCompatibilityFields()));
        $store = Store::create($data);

        return response()->json(StoreApiTransformer::toAdminArray($store), 201);
    }

    public function update(Request $request, Store $store): JsonResponse
    {
        // Allow either new JSONB fields or legacy flat fields (for transitional admin UI compat)
        $rules = $this->storeValidationRules(isUpdate: true);
        $request->validate($rules + $this->legacyCompatibilityValidationRules());

        $data = $this->normalizeIncomingPayload(
            $request->only($this->fillableFields() + $this->legacyCompatibilityFields())
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
        if (isset($data['cast_profile']) && is_array($store->cast_profile)) {
            $data['cast_profile'] = array_replace_recursive($store->cast_profile, $data['cast_profile']);
        }

        $store->update($data);

        return response()->json(StoreApiTransformer::toAdminArray($store->fresh()));
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
            'unit_wage_type', 'payroll_system_type', 'payroll_system_description',
            'interview_hours', 'interview_start', 'interview_end',
            'interview_info', 'recruitment_standards',
            'gal_point', 'loose_point', 'age_point', 'waiwai_point', 'cute_point',
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
            'unit_wage_type' => 'nullable|string|max:50',
            'payroll_system_type' => 'nullable|string|max:100',
            'payroll_system_description' => 'nullable|string',
            'interview_hours' => 'nullable|string|max:255',
            'interview_start' => 'nullable|string|max:10',
            'interview_end' => 'nullable|string|max:10',
            'interview_info' => 'nullable|array',
            'recruitment_standards' => 'nullable|string',
            'gal_point' => 'nullable|integer|min:0|max:100',
            'loose_point' => 'nullable|integer|min:0|max:100',
            'age_point' => 'nullable|integer|min:0|max:100',
            'waiwai_point' => 'nullable|integer|min:0|max:100',
            'cute_point' => 'nullable|integer|min:0|max:100',
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
        if (array_key_exists('unit_wage_type', $legacy)) {
            $regular['unit'] = $legacy['unit_wage_type'] === '日給' ? 'day' : 'hour';
        }
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
        if (array_key_exists('recruitment_standards', $legacy)) $interview['recruitment_standards'] = $legacy['recruitment_standards'];
        if (array_key_exists('interview_info', $legacy) && is_array($legacy['interview_info'])) {
            $interview = array_replace($interview, $legacy['interview_info']);
        }
        if (!empty($interview)) {
            $data['interview'] = $interview;
        }

        // cast_profile
        $castProfile = $data['cast_profile'] ?? [];
        foreach ([
            'gal_point' => 'gal',
            'loose_point' => 'loose',
            'age_point' => 'age',
            'waiwai_point' => 'waiwai',
            'cute_point' => 'cute',
        ] as $legacyKey => $newKey) {
            if (array_key_exists($legacyKey, $legacy)) $castProfile[$newKey] = (int)$legacy[$legacyKey];
        }
        if (!empty($castProfile)) {
            $data['cast_profile'] = $castProfile;
        }

        // dress_code: if a legacy string was sent under "dress_code", wrap as { description }
        if (isset($data['dress_code']) && is_string($data['dress_code'])) {
            $data['dress_code'] = ['description' => $data['dress_code']];
        }

        return $data;
    }
}
