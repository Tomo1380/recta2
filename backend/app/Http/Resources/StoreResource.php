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
            'hourly_min'      => self::toInt($regular['min'] ?? null),
            'hourly_max'      => self::toInt($regular['max'] ?? null),
            'unit_wage_type'  => self::wageUnitToLabel($regular['unit'] ?? null),
            // daily_estimate は旧 string と新 min/max の両対応。
            'daily_estimate'      => self::toInt($wage['daily_estimate'] ?? null), // 後方互換
            'daily_estimate_min'  => self::toInt($wage['daily_estimate_min'] ?? null),
            'daily_estimate_max'  => self::toInt($wage['daily_estimate_max'] ?? null),
            // 体入時給は最低/最高の2枠で公開。旧データ (avg_hourly=平均 /
            // hourly=単一値) は最低=avg, 最高=hourly にフォールバック。
            'trial_hourly_min' => self::toInt($trial['hourly_min'] ?? $trial['avg_hourly'] ?? null),
            'trial_hourly_max' => self::toInt($trial['hourly_max'] ?? $trial['hourly']     ?? null),
            'payroll_system_type'        => $payroll['type']        ?? null,
            'payroll_system_description' => $payroll['description'] ?? null,
            // 給与サイクル/給料日/日払い上限 (旧 payroll_system_type は後方互換で残置)
            'payroll_cycle'     => $payroll['cycle']        ?? null,
            'payroll_pay_day'   => $payroll['pay_day']      ?? null,
            'daily_pay_limit'   => $payroll['daily_limit']  ?? null,

            // compensation — back_items / fee_items は {label, value, unit} の new shape。
            // back_text はバックをフリーテキストで持つ新フィールド (項目別 back と併存)。
            'back_items'    => self::projectAmountItems($compensation['back']  ?? null),
            'back_text'     => $compensation['back_text'] ?? null,
            'fee_items'     => self::projectAmountItems($compensation['fees']  ?? null),
            'salary_notes'  => $compensation['notes'] ?? null,
            // 給料システム (複数選択 + 詳細備考)
            'pay_system_types' => $compensation['pay_system']['types'] ?? [],
            'pay_system_note'  => $compensation['pay_system']['note']  ?? null,

            // guarantee
            'guarantee_period'  => $guarantee['period']  ?? null,
            'guarantee_details' => $guarantee['details'] ?? null,
            'norma_info'        => $guarantee['norma']   ?? null,
            // 体入タイプ: 'same_day' | 'normal' | 'none' の 3 値。
            // 旧 boolean フィールド (same_day_trial) は廃止し、trial_type 一本へ統合。
            'trial_type'        => self::resolveTrialType($guarantee['same_day_trial'] ?? null),

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
        // average_rating は controller 側で withAvg('reviews_avg_rating') を
        // 事前ロードしていればそれを使い (N+1 回避)、無ければ method で都度計算。
        if (array_key_exists('reviews_avg_rating', $this->resource->getAttributes())) {
            $merged['average_rating'] = round((float) $this->resource->reviews_avg_rating, 1);
        } elseif (method_exists($this->resource, 'averageRating')) {
            $merged['average_rating'] = round($this->resource->averageRating(), 1);
        }
        if ($this->resource->relationLoaded('reviews')) {
            $merged['reviews'] = $this->resource->reviews;
        }

        // images JSONB は履歴的に 2 形式が混在する:
        //   - seed / 旧データ: {url, order} オブジェクト
        //   - アップロード経由 (StoreImageService): 生の URL 文字列
        // フロント (StoreDetailPage 等) は {url, order} を前提に order でソートし
        // url を描画するため、文字列のままだと店舗詳細に画像が出ない不具合になる。
        // ここで常に {url, order} に正規化して契約を一本化する。
        if (isset($merged['images']) && is_array($merged['images'])) {
            $normalized = [];
            foreach (array_values($merged['images']) as $i => $img) {
                if (is_string($img) && $img !== '') {
                    $normalized[] = ['url' => $img, 'order' => $i];
                } elseif (is_array($img) && !empty($img['url'])) {
                    $normalized[] = ['url' => $img['url'], 'order' => $img['order'] ?? $i];
                }
            }
            $merged['images'] = $normalized;
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

    /**
     * 体入タイプ guarantee.same_day_trial を 'same_day' | 'normal' | 'none' に
     * 正規化。未設定 / 想定外値はすべて 'none'。
     */
    private static function resolveTrialType(mixed $v): string
    {
        return is_string($v) && in_array($v, ['same_day', 'normal', 'none'], true)
            ? $v : 'none';
    }

    private static function wageUnitToLabel(?string $unit): ?string
    {
        if (!$unit) return null;
        return $unit === 'day' ? '日給' : '時給';
    }

    /**
     * 数値文字列 ('1,500円') / int / null を int|null に正規化。
     * フロントが Number() で受けても落ちないように。
     */
    private static function toInt(mixed $v): ?int
    {
        if ($v === null || $v === '') return null;
        if (is_int($v)) return $v;
        if (is_float($v)) return (int) $v;
        if (is_string($v)) {
            $digits = preg_replace('/[^0-9]/u', '', $v);
            if ($digits === '' || $digits === null) return null;
            return (int) $digits;
        }
        return null;
    }

    /**
     * back_items / fee_items を {label, value, unit, per_day?} に整形。
     * 旧 amount=string も拾う（NormalizeStoreNumerics が走る前の DB 用）。
     *
     * @param  mixed  $items
     * @return array<int, array<string, mixed>>|null
     */
    private static function projectAmountItems(mixed $items): ?array
    {
        if (!is_array($items)) return null;
        return array_values(array_map(function ($it) {
            if (!is_array($it)) {
                return ['label' => (string) $it, 'value' => 0, 'unit' => 'free'];
            }
            $label = (string) ($it['label'] ?? '');
            // 既に new shape
            if (isset($it['value']) && isset($it['unit'])) {
                $out = [
                    'label' => $label,
                    'value' => self::toInt($it['value']) ?? 0,
                    'unit'  => in_array($it['unit'], ['yen', 'percent', 'free'], true) ? $it['unit'] : 'yen',
                ];
                if (array_key_exists('per_day', $it)) $out['per_day'] = (bool) $it['per_day'];
                return $out;
            }
            // 旧 amount=string
            $raw = trim((string) ($it['amount'] ?? ''));
            if (str_contains($raw, '無料')) {
                return ['label' => $label, 'value' => 0, 'unit' => 'free'];
            }
            // 金額未入力 (項目名だけ)。「無料」とは区別し、value/unit を付けずに
            // 返すことで表示側は「—」になる (誤って「無料」表示しない)。
            if ($raw === '') {
                return ['label' => $label];
            }
            $hasPercent = preg_match('/([0-9.]+)\s*%/u', $raw, $pm);
            $hasYen = preg_match('/([0-9,]+)\s*円/u', $raw) || str_contains($raw, '¥')
                || str_contains($raw, '￥');
            // 「1,000円 / 10%」のような金額＋％の複合は {value,unit} 1組では
            // 表現できないため、入力文字列をそのまま保持して忠実に表示する。
            if ($hasPercent && $hasYen) {
                return ['label' => $label, 'amount' => $raw];
            }
            if ($hasPercent) {
                return ['label' => $label, 'value' => (int) round((float) $pm[1]), 'unit' => 'percent'];
            }
            if (preg_match('/([0-9,]+)/u', $raw, $m)) {
                $val = self::toInt($m[1]) ?? 0;
                $out = ['label' => $label, 'value' => $val, 'unit' => 'yen'];
                if (str_contains($raw, '/日')) $out['per_day'] = true;
                return $out;
            }
            // 数値を含まない自由記述 (例: 「応相談」) はそのまま表示。
            return ['label' => $label, 'amount' => $raw];
        }, $items));
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
        $keys = ['dress_advice', 'tips', 'dress_code', 'criteria', 'dialog', 'questions'];
        $out = [];
        foreach ($keys as $k) {
            if (array_key_exists($k, $interview)) {
                $out[$k] = $interview[$k];
            }
        }
        return $out ?: null;
    }
}
