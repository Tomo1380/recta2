<?php

namespace App\Http\Resources;

use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Store 用 API Resource。
 *
 * Phase 1-5 で StoreApiTransformer を置き換えるために作成。フロントが既に
 * 期待している「JSONB を flat にバラした」shape (hourly_min, business_hours,
 * dress_code_description など) を Resource 側で組み立てる。
 *
 * - JSONB raw columns (schedule, wage, compensation 等) も併存させる。
 * - average_rating / reviews_count / reviews は controller 側で
 *   `additional()` か with([...]) で渡すか、Resource の when()
 *   ($store->reviews_count や relationLoaded で判定) で出す。
 *
 * @mixin Store
 */
class StoreResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $base = $this->resource->toArray();

        $schedule     = $this->pickArray('schedule');
        $wage         = $this->pickArray('wage');
        $compensation = $this->pickArray('compensation');
        $guarantee    = $this->pickArray('guarantee');
        $interview    = $this->pickArray('interview');
        $dressCode    = $this->pickArray('dress_code');

        $regular = $wage['regular'] ?? [];
        $trial   = $wage['trial'] ?? [];
        $payroll = $wage['payroll'] ?? [];

        $videos = $this->projectVideos();
        $staffPhotos = $this->projectStaffPhotos();

        $flat = [
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
            // 体入時給は最低/最高の2枠で公開。旧データ (avg_hourly=平均 /
            // hourly=単一値) は最低=avg, 最高=hourly にフォールバックして
            // 既存データを表示できるようにする (移行 migration なしの想定)。
            'trial_hourly_min' => $trial['hourly_min'] ?? $trial['avg_hourly'] ?? null,
            'trial_hourly_max' => $trial['hourly_max'] ?? $trial['hourly']     ?? null,
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

            // dress_code flat
            'dress_code_description' => $dressCode['description'] ?? null,
            'dress_code_detail' => $dressCode ?: null,

            // videos / staff_photos
            'videos' => $videos,
            'video_url' => $videos[0]['video_url'] ?? null,
            'staff_photos' => $staffPhotos,

            // SEO: 運営入力があればそれを優先、なければ自動生成 (検索結果用
            // description タグに直接入る想定)。フロント側で再生成しなくて
            // 済むよう resolved 結果も meta フィールドとして同梱する。
            //   - seo_meta_description: 運営入力の生値 (null 可)
            //   - meta_description: 表示用 (常に文字列)
            'meta_description' => self::resolveMetaDescription($this->resource, $regular, $trial),
        ];

        $merged = array_merge($base, $flat);

        // 旧 dress_code カラムは string だった。新スキーマでは object。
        // フロントは dress_code を文字列として render する箇所が残るので
        // description だけに coerce する。
        if (isset($merged['dress_code']) && is_array($merged['dress_code'])) {
            $merged['dress_code'] = $merged['dress_code']['description'] ?? null;
        }

        // 任意の追加フィールド（reviews_count / average_rating / reviews）。
        // controller で withCount / load して、merge で渡せるようにする。
        if (isset($this->resource->reviews_count)) {
            $merged['reviews_count'] = (int) $this->resource->reviews_count;
        }
        if (method_exists($this->resource, 'averageRating')) {
            $merged['average_rating'] = round($this->resource->averageRating(), 1);
        }
        if ($this->resource->relationLoaded('reviews')) {
            $merged['reviews'] = $this->resource->reviews;
        }

        return $merged;
    }

    private function pickArray(string $key): array
    {
        $val = $this->resource->{$key} ?? null;
        return is_array($val) ? $val : [];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function projectVideos(): array
    {
        if ($this->resource->relationLoaded('videos')) {
            return collect($this->resource->getRelation('videos'))
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
        return [];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function projectStaffPhotos(): array
    {
        if ($this->resource->relationLoaded('staffPhotos')) {
            return collect($this->resource->getRelation('staffPhotos'))
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
        return [];
    }

    /**
     * 運営入力 (seo_meta_description) 優先。未入力なら
     * 「【エリア】のカテゴリ・店名。時給◯◯円〜、体入可。features_text 先頭60字」
     * の形で自動生成する。140 字以内を目安に丸める。
     *
     * @param  array<string, mixed>  $regular
     * @param  array<string, mixed>  $trial
     */
    private static function resolveMetaDescription(Store $store, array $regular, array $trial): string
    {
        $manual = trim((string) ($store->seo_meta_description ?? ''));
        if ($manual !== '') {
            return mb_substr($manual, 0, 200);
        }

        $parts = [];
        $area = trim((string) ($store->area ?? ''));
        $category = trim((string) ($store->category ?? ''));
        $name = trim((string) ($store->name ?? ''));
        $head = '';
        if ($area !== '' || $category !== '') {
            $head .= ($area !== '' ? "【{$area}】" : '') . ($category !== '' ? "の{$category}" : '');
        }
        if ($name !== '') {
            $head .= ($head !== '' ? '・' : '') . $name;
        }
        if ($head !== '') {
            $parts[] = $head . '。';
        }

        $hourlyMin = $regular['min'] ?? null;
        $hourlyMax = $regular['max'] ?? null;
        if ($hourlyMin || $hourlyMax) {
            $lo = $hourlyMin ? number_format((int) $hourlyMin) . '円' : '';
            $hi = $hourlyMax ? number_format((int) $hourlyMax) . '円' : '';
            $parts[] = '時給' . ($lo !== '' && $hi !== '' ? "{$lo}〜{$hi}" : $lo . $hi) . '。';
        }

        $trialHourly = $trial['hourly_min'] ?? $trial['avg_hourly'] ?? null;
        if ($trialHourly) {
            $parts[] = '体入時給' . number_format((int) $trialHourly) . '円〜。';
        }

        $features = trim((string) ($store->features_text ?? $store->description ?? ''));
        if ($features !== '') {
            $clip = mb_substr($features, 0, 80);
            $parts[] = preg_replace('/\s+/u', ' ', $clip);
        }

        $out = mb_substr(implode('', $parts), 0, 140);
        return $out !== '' ? $out : ($name !== '' ? $name : 'recta');
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
     * @param  array<string, mixed>  $interview
     * @return array<string, mixed>|null
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
