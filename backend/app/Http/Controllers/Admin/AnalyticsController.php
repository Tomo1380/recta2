<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AnalyticsBreakdownRequest;
use App\Models\LineFriend;
use App\Models\LinkClick;
use App\Models\PageView;
use App\Services\Analytics\RankingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * 管理画面アクセス解析（FB 2026-06-05 A2/A3）。
 *
 * 店舗 / エリア / コラム別のアクセスランキング（PV・LINE追加クリック・CV率）と
 * LINE 追加クリックの経路ランキングを返す。期間は days クエリ（既定30日）。
 */
class AnalyticsController extends Controller
{
    private const ALLOWED_DAYS = [7, 30, 90, 365];

    public function __construct(
        private readonly RankingService $rankings
    ) {}

    public function overview(Request $request): JsonResponse
    {
        $days = (int) $request->query('days', 30);
        if (!in_array($days, self::ALLOWED_DAYS, true)) {
            $days = 30;
        }

        $to = now();
        $from = $to->copy()->subDays($days - 1)->startOfDay();

        $pv = PageView::whereBetween('created_at', [$from, $to])->count();
        $clicks = LinkClick::whereBetween('created_at', [$from, $to])->count();

        $lineFriendsTotal = LineFriend::where('is_following', true)->count();
        $lineFriendsInRange = LineFriend::whereBetween('created_at', [$from, $to])->count();

        return response()->json([
            'range' => [
                'days' => $days,
                'from' => $from->toIso8601String(),
                'to' => $to->toIso8601String(),
            ],
            'summary' => [
                'pv' => $pv,
                'line_clicks' => $clicks,
                'cv_rate' => $pv > 0 ? round($clicks / $pv * 100, 1) : 0.0,
                // LINE 公式アカウント友だち追加「実績」(line_friends)。
                // LINE 仕様上、経路別には割れないため全体値のみ。
                'line_friends_total' => $lineFriendsTotal,
                'line_friends_in_range' => $lineFriendsInRange,
            ],
            'stores' => $this->rankings->stores($from, $to),
            'areas' => $this->rankings->areas($from, $to),
            'columns' => $this->rankings->columns($from, $to),
            'line_routes' => $this->rankings->lineRoutes($from, $to),
        ]);
    }

    /**
     * ランキング行のドリルダウン: 1 店舗/コラム/エリアの LINE 導線を画面別に内訳。
     */
    public function breakdown(AnalyticsBreakdownRequest $request): JsonResponse
    {
        $type = $request->validated()['type'];
        $key = $request->validated()['key'];

        $days = (int) ($request->validated()['days'] ?? 30);
        if (!in_array($days, self::ALLOWED_DAYS, true)) {
            $days = 30;
        }

        $to = now();
        $from = $to->copy()->subDays($days - 1)->startOfDay();

        $column = match ($type) {
            'store' => 'store_id',
            'column' => 'article_id',
            'area' => 'area',
        };
        // store / column は数値 ID、area は文字列。
        $value = $type === 'area' ? $key : (int) $key;

        return response()->json([
            'type' => $type,
            'key' => $key,
            'rows' => $this->rankings->lineSourceBreakdown($column, $value, $from, $to),
        ]);
    }
}
