<?php

namespace App\Console\Commands;

use App\Models\Store;
use Illuminate\Console\Command;

/**
 * stores.wage / compensation の dirty data を正規化する。
 *
 * 旧 Seeder が「1,500円」「10%」のような string を入れていたため、
 * フロントの金額計算 (Number 化) が NaN になっていた。
 *
 *  - back_items / fees: { label, amount } string → { label, value: int, unit: 'yen'|'percent'|'free' }
 *  - wage.regular.min / max:   string「1,500円」→ int 1500
 *  - wage.trial.hourly_min/max: 旧 hourly/avg_hourly (string) も拾って int 化
 *  - daily_estimate (string)   → daily_estimate_min/max (int)
 *
 * 冪等。再実行しても安全。
 */
class NormalizeStoreNumerics extends Command
{
    protected $signature = 'stores:normalize-numerics {--dry-run : 変更内容を出力するだけで保存しない}';

    protected $description = 'stores.wage / compensation の金額系フィールドを number 化する';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $changed = 0;
        $total = 0;

        Store::query()->chunkById(100, function ($stores) use (&$changed, &$total, $dryRun) {
            foreach ($stores as $store) {
                $total++;
                $wage = $this->normalizeWage($store->wage);
                $compensation = $this->normalizeCompensation($store->compensation);

                $dirty = $wage !== $store->wage || $compensation !== $store->compensation;
                if (!$dirty) continue;

                if ($dryRun) {
                    $this->line("would update id={$store->id} name={$store->name}");
                } else {
                    $store->wage = $wage;
                    $store->compensation = $compensation;
                    $store->save();
                }
                $changed++;
            }
        });

        $this->info(($dryRun ? '[dry-run] ' : '') . "scanned {$total}, changed {$changed}");
        return self::SUCCESS;
    }

    private function normalizeWage(mixed $wage): ?array
    {
        if (!is_array($wage)) return $wage;

        if (isset($wage['regular']) && is_array($wage['regular'])) {
            $r = $wage['regular'];
            $wage['regular']['min'] = $this->toInt($r['min'] ?? null);
            $wage['regular']['max'] = $this->toInt($r['max'] ?? null);
        }

        if (isset($wage['trial']) && is_array($wage['trial'])) {
            $t = $wage['trial'];
            $min = $t['hourly_min'] ?? $t['avg_hourly'] ?? null;
            $max = $t['hourly_max'] ?? $t['hourly']     ?? null;
            $wage['trial'] = [
                'hourly_min' => $this->toInt($min),
                'hourly_max' => $this->toInt($max),
                'days'       => isset($t['days']) ? (int) $t['days'] : null,
            ];
        }

        // 旧 daily_estimate (string) → min/max に分解。失敗したら破棄。
        if (isset($wage['daily_estimate']) && is_string($wage['daily_estimate'])) {
            $text = $wage['daily_estimate'];
            if (preg_match('/([0-9,]+)\s*円?\s*[〜~-]+\s*([0-9,]+)/u', $text, $m)) {
                $wage['daily_estimate_min'] = $this->toInt($m[1]);
                $wage['daily_estimate_max'] = $this->toInt($m[2]);
            } elseif (preg_match('/([0-9,]+)/u', $text, $m)) {
                $wage['daily_estimate_min'] = $this->toInt($m[1]);
            }
            unset($wage['daily_estimate']);
        }

        return $wage;
    }

    private function normalizeCompensation(mixed $compensation): ?array
    {
        if (!is_array($compensation)) return $compensation;

        if (isset($compensation['back']) && is_array($compensation['back'])) {
            $compensation['back'] = array_values(array_map(
                fn ($item) => $this->normalizeAmountItem($item, allowPerDay: false),
                $compensation['back'],
            ));
        }
        if (isset($compensation['fees']) && is_array($compensation['fees'])) {
            $compensation['fees'] = array_values(array_map(
                fn ($item) => $this->normalizeAmountItem($item, allowPerDay: true),
                $compensation['fees'],
            ));
        }
        return $compensation;
    }

    /**
     * @param  mixed  $item
     * @return array<string, mixed>
     */
    private function normalizeAmountItem(mixed $item, bool $allowPerDay): array
    {
        if (!is_array($item)) {
            return ['label' => (string) $item, 'value' => 0, 'unit' => 'free'];
        }
        $label = (string) ($item['label'] ?? '');

        // 既に new shape ならそのまま (再実行冪等)
        if (isset($item['value']) && isset($item['unit'])) {
            $out = [
                'label' => $label,
                'value' => $this->toInt($item['value']) ?? 0,
                'unit'  => in_array($item['unit'], ['yen', 'percent', 'free'], true) ? $item['unit'] : 'yen',
            ];
            if ($allowPerDay) $out['per_day'] = (bool) ($item['per_day'] ?? false);
            return $out;
        }

        // 旧 amount: string パース
        $raw = (string) ($item['amount'] ?? '');
        if ($raw === '' || str_contains($raw, '無料')) {
            $out = ['label' => $label, 'value' => 0, 'unit' => 'free'];
        } elseif (preg_match('/([0-9.]+)\s*%/u', $raw, $m)) {
            $out = ['label' => $label, 'value' => (int) round((float) $m[1]), 'unit' => 'percent'];
        } elseif (preg_match('/([0-9,]+)/u', $raw, $m)) {
            $out = ['label' => $label, 'value' => $this->toInt($m[1]) ?? 0, 'unit' => 'yen'];
        } else {
            $out = ['label' => $label, 'value' => 0, 'unit' => 'free'];
        }
        if ($allowPerDay) $out['per_day'] = str_contains($raw, '/日');
        return $out;
    }

    private function toInt(mixed $v): ?int
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
}
