<?php

namespace App\Console\Commands;

use App\Models\Area;
use App\Models\Store;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class BackfillStoreSlugs extends Command
{
    protected $signature = 'stores:backfill-slugs {--force : 既存 slug も上書きする}';

    protected $description = '既存店舗の slug を「店舗名-エリア」のローマ字化で生成・保存する';

    public function handle(): int
    {
        $force = $this->option('force');
        $count = 0;
        $skipped = 0;

        Store::query()
            ->when(!$force, fn ($q) => $q->whereNull('slug'))
            ->chunkById(100, function ($stores) use (&$count, &$skipped) {
                foreach ($stores as $store) {
                    $slug = $this->buildSlug($store);
                    if ($slug === null) {
                        $skipped++;
                        $this->warn("Skip id={$store->id} name=\"{$store->name}\" (slug build failed)");
                        continue;
                    }
                    $unique = $this->ensureUnique($slug, $store->id);
                    $store->slug = $unique;
                    $store->save();
                    $count++;
                    $this->line("  id={$store->id} → {$unique}");
                }
            });

        $this->info("Backfilled {$count} stores, skipped {$skipped}.");
        return self::SUCCESS;
    }

    /**
     * 「店舗名-エリア」を slug 化する。
     *
     * Str::slug は kanji/hiragana を多くは空文字に潰すので、結果が空なら null を返し
     * 呼び出し側で `shop-{id}` フォールバックさせる。
     * 数値オンリーは ID URL と衝突するので禁止。
     */
    private function buildSlug(Store $store): ?string
    {
        $namePart = Str::slug((string) $store->name, '-');
        // エリアは kanji なので、Area マスタから slug を引いてくる。
        // ヒットしなければ空にして name 部分のみで slug を作る。
        $areaPart = $this->resolveAreaSlug((string) $store->area);

        $combined = trim(implode('-', array_filter([$namePart, $areaPart])), '-');

        if ($combined === '') {
            return 'shop-' . $store->id;
        }

        // 数値オンリー禁止: prefix で衝突回避
        if (preg_match('/^\d+$/', $combined)) {
            $combined = 'shop-' . $combined;
        }

        // 長さ制限 (160)
        $combined = Str::limit($combined, 150, '');
        return $combined !== '' ? $combined : 'shop-' . $store->id;
    }

    /** @var array<string, string|null> */
    private array $areaSlugCache = [];

    private function resolveAreaSlug(string $name): ?string
    {
        if ($name === '') return null;
        if (array_key_exists($name, $this->areaSlugCache)) {
            return $this->areaSlugCache[$name];
        }
        $slug = Area::where('name', $name)->value('slug');
        return $this->areaSlugCache[$name] = $slug;
    }

    /**
     * 同じ slug が他店舗で使われていたら末尾に -2, -3 ... と連番を付ける。
     */
    private function ensureUnique(string $slug, int $selfId): string
    {
        $candidate = $slug;
        $suffix = 2;
        while (
            Store::where('slug', $candidate)
                ->where('id', '!=', $selfId)
                ->exists()
        ) {
            $candidate = $slug . '-' . $suffix;
            $suffix++;
        }
        return $candidate;
    }
}
