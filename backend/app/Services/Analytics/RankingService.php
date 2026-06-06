<?php

namespace App\Services\Analytics;

use App\Models\Article;
use App\Models\LinkClick;
use App\Models\PageView;
use App\Models\Store;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * ダッシュボードのアクセス解析ランキング集計。
 *
 * 各ランキング行は PV / LINE追加クリック / CV率 (= クリック ÷ PV) を持つ。
 * LINE追加「実績」(line_friends) は LINE 仕様上ブラウザ経路と紐付かないため
 * ここでは扱わず、クリック (intent) を CV の分子とする。
 */
class RankingService
{
    private const LIMIT = 100;

    /**
     * 店舗別アクセスランキング TOP100。
     *
     * @return Collection<int,array<string,mixed>>
     */
    public function stores(Carbon $from, Carbon $to): Collection
    {
        $pv = $this->countBy(PageView::query(), 'store_id', $from, $to);
        $clicks = $this->countBy(LinkClick::query(), 'store_id', $from, $to);

        $ids = $pv->keys()->merge($clicks->keys())->unique();
        $names = Store::whereIn('id', $ids)->pluck('name', 'id');

        return $this->assemble($ids, $pv, $clicks, fn ($id) => [
            'id' => (int) $id,
            'name' => $names->get($id) ?? "店舗#{$id}",
        ]);
    }

    /**
     * エリア別アクセスランキング TOP100。
     *
     * @return Collection<int,array<string,mixed>>
     */
    public function areas(Carbon $from, Carbon $to): Collection
    {
        $pv = $this->countBy(PageView::query(), 'area', $from, $to);
        $clicks = $this->countBy(LinkClick::query(), 'area', $from, $to);

        $keys = $pv->keys()->merge($clicks->keys())->unique();

        return $this->assemble($keys, $pv, $clicks, fn ($area) => [
            'name' => (string) $area,
        ]);
    }

    /**
     * コラム別アクセスランキング TOP100。
     *
     * @return Collection<int,array<string,mixed>>
     */
    public function columns(Carbon $from, Carbon $to): Collection
    {
        $pv = $this->countBy(PageView::query(), 'article_id', $from, $to);
        $clicks = $this->countBy(LinkClick::query(), 'article_id', $from, $to);

        $ids = $pv->keys()->merge($clicks->keys())->unique();
        $titles = Article::whereIn('id', $ids)->pluck('title', 'id');

        return $this->assemble($ids, $pv, $clicks, fn ($id) => [
            'id' => (int) $id,
            'name' => $titles->get($id) ?? "コラム#{$id}",
        ]);
    }

    /**
     * LINE 追加クリックの経路ランキング TOP100。
     * tracking_link がある行は label、無い行は source (CTA配置) でまとめる。
     *
     * @return Collection<int,array<string,mixed>>
     */
    public function lineRoutes(Carbon $from, Carbon $to): Collection
    {
        $rows = LinkClick::query()
            ->leftJoin('tracking_links', 'link_clicks.tracking_link_id', '=', 'tracking_links.id')
            ->whereBetween('link_clicks.created_at', [$from, $to])
            ->selectRaw("COALESCE(tracking_links.label, link_clicks.source, '(計測外)') as route")
            ->selectRaw("CASE WHEN tracking_links.id IS NOT NULL THEN 'affiliate' ELSE 'cta' END as kind")
            ->selectRaw('COUNT(*) as clicks')
            ->groupBy('route', 'kind')
            ->orderByDesc('clicks')
            ->limit(self::LIMIT)
            ->get();

        return $rows->map(fn ($row) => [
            'route' => $row->route,
            'kind' => $row->kind,
            'clicks' => (int) $row->clicks,
        ])->values();
    }

    /**
     * 1 ディメンション（store/column/area）の LINE 導線クリックを画面(source)別に内訳。
     * ランキング行を展開したときのドリルダウン用（FB: 画面×店舗クロス）。
     *
     * @param  'store_id'|'article_id'|'area'  $column
     * @param  int|string  $value
     * @return Collection<int,array<string,mixed>>
     */
    public function lineSourceBreakdown(string $column, int|string $value, Carbon $from, Carbon $to): Collection
    {
        return LinkClick::query()
            ->whereBetween('created_at', [$from, $to])
            ->where($column, $value)
            ->selectRaw("COALESCE(source, '(計測外)') as source")
            ->selectRaw('COUNT(*) as clicks')
            ->groupBy('source')
            ->orderByDesc('clicks')
            ->limit(50)
            ->get()
            ->map(fn ($row) => [
                'source' => $row->source,
                'clicks' => (int) $row->clicks,
            ])
            ->values();
    }

    /**
     * 指定店舗群の PV / LINE導線クリック / CV率 を [store_id => metrics] で返す。
     * ピックアップ管理など、特定の店舗だけの指標を出したい時に使う。
     * CV率は他ランキングと同じく「クリック ÷ PV」(LINE誘導への食いつき率)。
     *
     * @param  array<int>  $storeIds
     * @return array<int,array{pv:int,line_clicks:int,cv_rate:float}>
     */
    public function storeMetrics(array $storeIds, Carbon $from, Carbon $to): array
    {
        if (empty($storeIds)) {
            return [];
        }

        $pv = PageView::query()
            ->whereBetween('created_at', [$from, $to])
            ->whereIn('store_id', $storeIds)
            ->groupBy('store_id')
            ->select('store_id', DB::raw('COUNT(*) as aggregate'))
            ->pluck('aggregate', 'store_id');

        $clicks = LinkClick::query()
            ->whereBetween('created_at', [$from, $to])
            ->whereIn('store_id', $storeIds)
            ->groupBy('store_id')
            ->select('store_id', DB::raw('COUNT(*) as aggregate'))
            ->pluck('aggregate', 'store_id');

        $out = [];
        foreach ($storeIds as $id) {
            $views = (int) ($pv[$id] ?? 0);
            $lineClicks = (int) ($clicks[$id] ?? 0);
            $out[$id] = [
                'pv' => $views,
                'line_clicks' => $lineClicks,
                'cv_rate' => $views > 0 ? round($lineClicks / $views * 100, 1) : 0.0,
            ];
        }

        return $out;
    }

    /**
     * 指定カラムで件数を数えて [key => count] のマップを返す（null / 空は除外）。
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @return Collection<int|string,int>
     */
    private function countBy($query, string $column, Carbon $from, Carbon $to): Collection
    {
        return $query
            ->whereBetween('created_at', [$from, $to])
            ->whereNotNull($column)
            ->when($column === 'area', fn ($q) => $q->where('area', '!=', ''))
            ->groupBy($column)
            ->select($column, DB::raw('COUNT(*) as aggregate'))
            ->pluck('aggregate', $column);
    }

    /**
     * PV / クリックのマップを行に組み立て、PV 降順で TOP100 を返す。
     *
     * @param  Collection<int,int|string>  $keys
     * @param  Collection<int|string,int>  $pv
     * @param  Collection<int|string,int>  $clicks
     * @param  callable(int|string):array<string,mixed>  $meta
     * @return Collection<int,array<string,mixed>>
     */
    private function assemble(Collection $keys, Collection $pv, Collection $clicks, callable $meta): Collection
    {
        return $keys
            ->map(function ($key) use ($pv, $clicks, $meta) {
                $views = (int) ($pv->get($key) ?? 0);
                $lineClicks = (int) ($clicks->get($key) ?? 0);

                return array_merge($meta($key), [
                    'pv' => $views,
                    'line_clicks' => $lineClicks,
                    'cv_rate' => $views > 0 ? round($lineClicks / $views * 100, 1) : 0.0,
                ]);
            })
            ->sortByDesc('pv')
            ->take(self::LIMIT)
            ->values();
    }
}
