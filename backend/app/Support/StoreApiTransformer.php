<?php

namespace App\Support;

use App\Models\Store;

/**
 * Maps a Store model (new JSONB schema) to API response shapes that the
 * frontend expects. The frontend `frontend/app/lib/types.ts` and the
 * existing components still consume the legacy flat field names
 * (hourly_min, hourly_max, business_hours, opening_time, etc.), so this
 * transformer flattens the JSONB fields back into those names while also
 * exposing the raw JSONB for any new UI that wants it.
 */
class StoreApiTransformer
{
    /**
     * Convert a Store to a public API array with all backwards-compatible
     * flat fields plus the raw JSONB columns.
     *
     * @param  Store|array  $store
     * @return array
     */
    public static function toPublicArray($store): array
    {
        $base = $store instanceof Store ? $store->toArray() : (array) $store;

        // ── Videos: project store_videos rows into a plain array, ordered
        //    by display_order, so the frontend can render multiple videos
        //    with their own label / description text between them.
        $videos = self::projectVideos($store, $base);

        // ── Staff photos: 在籍女性ギャラリー
        $staffPhotos = self::projectStaffPhotos($store, $base);

        // Pull JSONB structures (already cast to array by the model)
        $schedule     = self::pickArray($base, 'schedule');
        $wage         = self::pickArray($base, 'wage');
        $compensation = self::pickArray($base, 'compensation');
        $guarantee    = self::pickArray($base, 'guarantee');
        $interview    = self::pickArray($base, 'interview');
        $castProfile  = self::pickArray($base, 'cast_profile');
        $dressCode    = self::pickArray($base, 'dress_code');

        $regular = $wage['regular'] ?? [];
        $trial   = $wage['trial'] ?? [];
        $payroll = $wage['payroll'] ?? [];

        // Flattened legacy compatibility fields
        $compat = [
            // schedule
            'business_hours'  => $schedule['hours_text'] ?? null,
            'opening_time'    => $schedule['open']       ?? null,
            'closing_time'    => $schedule['close']      ?? null,
            'holidays'        => $schedule['holidays']   ?? null,
            'shift_info'      => $schedule['shift_info'] ?? null,

            // wage
            'hourly_min'      => isset($regular['min']) ? (int) $regular['min'] : null,
            'hourly_max'      => isset($regular['max']) ? (int) $regular['max'] : null,
            'unit_wage_type'  => self::wageUnitToLabel($regular['unit'] ?? null),
            'daily_estimate'  => $wage['daily_estimate'] ?? null,
            'trial_hourly'    => $trial['hourly']     ?? null,
            'trial_avg_hourly'=> $trial['avg_hourly'] ?? null,
            'payroll_system_type'        => $payroll['type']        ?? null,
            'payroll_system_description' => $payroll['description'] ?? null,

            // compensation
            'back_items'    => $compensation['back']  ?? null,
            'fee_items'     => $compensation['fees']  ?? null,
            'salary_notes'  => $compensation['notes'] ?? null,

            // guarantee
            'guarantee_period'  => $guarantee['period']  ?? null,
            'guarantee_details' => $guarantee['details'] ?? null,
            'norma_info'        => $guarantee['norma']   ?? null,
            'same_day_trial'    => (bool) ($guarantee['same_day_trial'] ?? false),

            // interview
            'interview_hours' => self::buildHoursText($interview['start'] ?? null, $interview['end'] ?? null),
            'interview_start' => $interview['start'] ?? null,
            'interview_end'   => $interview['end']   ?? null,
            'interview_info'  => self::interviewInfoLegacy($interview),
            'recruitment_standards' => $interview['recruitment_standards'] ?? null,

            // cast_profile
            'gal_point'    => $castProfile['gal']    ?? null,
            'loose_point'  => $castProfile['loose']  ?? null,
            'age_point'    => $castProfile['age']    ?? null,
            'waiwai_point' => $castProfile['waiwai'] ?? null,
            'cute_point'   => $castProfile['cute']   ?? null,

            // dress_code: legacy was a string, expose .description as the canonical string
            'dress_code_description' => $dressCode['description'] ?? null,
            // Object form for the new Dress code section (OK / NG examples)
            'dress_code_detail' => $dressCode ?: null,

            // videos: ordered list of {url, label, description, poster_url}
            'videos' => $videos,
            // legacy single-video fallback: keep `video_url` populated from the
            // first video so any frontend that hasn't moved to `videos[]` yet
            // still renders something.
            'video_url' => $videos[0]['video_url'] ?? null,

            // staff_photos: ordered list of {image_url, caption, instagram_url, staff_type, display_order}
            'staff_photos' => $staffPhotos,
        ];

        // Merge: base columns (which already include JSONB raw values) + flattened
        // compat. Compat does not overwrite raw JSONB columns since their keys differ.
        $merged = array_merge($base, $compat);

        // The legacy `dress_code` column was a string. The new schema stores it
        // as an object. The frontend still has components that render `dress_code`
        // directly; coerce it to the description string so React doesn't choke
        // on rendering an object as a child.
        if (isset($merged['dress_code']) && is_array($merged['dress_code'])) {
            $merged['dress_code'] = $merged['dress_code']['description'] ?? null;
        }

        return $merged;
    }

    /**
     * Admin variant — same as public for now, but kept as a separate method
     * so admin-only fields (e.g. unpublished metadata) can be added later
     * without touching public callers.
     */
    public static function toAdminArray($store): array
    {
        return self::toPublicArray($store);
    }

    /**
     * Compact card shape used by AI chat tool results / pickup lists.
     */
    public static function toCardArray($store): array
    {
        $full = self::toPublicArray($store);

        return [
            'id'              => $full['id'] ?? null,
            'name'            => $full['name'] ?? null,
            'area'            => $full['area'] ?? null,
            'category'        => $full['category'] ?? null,
            'nearest_station' => $full['nearest_station'] ?? null,
            'hourly_min'      => $full['hourly_min'] ?? null,
            'hourly_max'      => $full['hourly_max'] ?? null,
            'feature_tags'    => $full['feature_tags'] ?? [],
            'description'     => $full['description'] ?? null,
            'images'          => $full['images'] ?? [],
        ];
    }

    /**
     * Normalize store_videos into the public array shape.
     *
     * Accepts either a Store model (we use its relation) or a raw array
     * (e.g. produced by toArray() at a higher layer that already eager-loaded
     * `videos`).
     *
     * @return array<int, array{video_url:string,label:?string,description:?string,poster_url:?string,display_order:int}>
     */
    private static function projectVideos($store, array $base): array
    {
        // Prefer the eager-loaded relation collection when we have a Store
        // model, since toArray() on Store doesn't auto-include relations.
        if ($store instanceof Store && $store->relationLoaded('videos')) {
            $rows = $store->getRelation('videos');
            return collect($rows)
                ->sortBy('display_order')
                ->values()
                ->map(fn ($v) => [
                    'video_url' => (string) $v->video_url,
                    'label' => $v->label,
                    'description' => $v->description,
                    'poster_url' => $v->poster_url,
                    'display_order' => (int) $v->display_order,
                ])
                ->all();
        }

        $raw = $base['videos'] ?? null;
        if (!is_array($raw)) {
            return [];
        }
        return collect($raw)
            ->sortBy(fn ($v) => $v['display_order'] ?? 0)
            ->values()
            ->map(fn ($v) => [
                'video_url' => (string) ($v['video_url'] ?? ''),
                'label' => $v['label'] ?? null,
                'description' => $v['description'] ?? null,
                'poster_url' => $v['poster_url'] ?? null,
                'display_order' => (int) ($v['display_order'] ?? 0),
            ])
            ->filter(fn ($v) => $v['video_url'] !== '')
            ->values()
            ->all();
    }

    /**
     * Normalize store_staff_photos into the public array shape.
     *
     * @return array<int, array{image_url:string,caption:?string,instagram_url:?string,staff_type:?string,display_order:int}>
     */
    private static function projectStaffPhotos($store, array $base): array
    {
        if ($store instanceof Store && $store->relationLoaded('staffPhotos')) {
            $rows = $store->getRelation('staffPhotos');
            return collect($rows)
                ->sortBy('display_order')
                ->values()
                ->map(fn ($p) => [
                    'image_url' => (string) $p->image_url,
                    'caption' => $p->caption,
                    'instagram_url' => $p->instagram_url,
                    'staff_type' => $p->staff_type,
                    'display_order' => (int) $p->display_order,
                ])
                ->all();
        }

        $raw = $base['staff_photos'] ?? null;
        if (!is_array($raw)) {
            return [];
        }
        return collect($raw)
            ->sortBy(fn ($p) => $p['display_order'] ?? 0)
            ->values()
            ->map(fn ($p) => [
                'image_url' => (string) ($p['image_url'] ?? ''),
                'caption' => $p['caption'] ?? null,
                'instagram_url' => $p['instagram_url'] ?? null,
                'staff_type' => $p['staff_type'] ?? null,
                'display_order' => (int) ($p['display_order'] ?? 0),
            ])
            ->filter(fn ($p) => $p['image_url'] !== '')
            ->values()
            ->all();
    }

    private static function pickArray(array $base, string $key): array
    {
        $val = $base[$key] ?? null;
        return is_array($val) ? $val : [];
    }

    private static function wageUnitToLabel(?string $unit): ?string
    {
        if (!$unit) return null;
        return $unit === 'day' ? '日給' : '時給';
    }

    private static function buildHoursText(?string $start, ?string $end): ?string
    {
        if (!$start && !$end) return null;
        return ($start ?? '') . '〜' . ($end ?? '');
    }

    /**
     * Reconstruct the legacy interview_info shape used by the frontend
     * detail page. Frontend expects an object with dress_advice, tips,
     * dress_code, criteria, dialog. We keep the interview JSONB intact
     * separately and project these subfields as `interview_info`.
     */
    private static function interviewInfoLegacy(array $interview): ?array
    {
        $keys = ['dress_advice', 'tips', 'dress_code', 'criteria', 'dialog'];
        $out = [];
        foreach ($keys as $k) {
            if (array_key_exists($k, $interview)) {
                $out[$k] = $interview[$k];
            }
        }
        return $out ?: null;
    }
}
