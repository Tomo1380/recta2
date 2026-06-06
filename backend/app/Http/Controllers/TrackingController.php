<?php

namespace App\Http\Controllers;

use App\Http\Requests\Tracking\TrackLineClickRequest;
use App\Http\Requests\Tracking\TrackPageViewRequest;
use App\Models\TrackingLink;
use App\Services\Analytics\TrackingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * 公開アクセス解析エンドポイント（認証なし）。
 *
 *  POST /api/track/pv         : PV ビーコン
 *  POST /api/track/line-click : LINE 追加クリックビーコン（サイト内CTA）
 *  GET  /r/{code}             : 計測リンクのリダイレクト（アフィリエイト/SNS）
 *
 * ビーコンは navigator.sendBeacon で送られるため 204 No Content を返す。
 */
class TrackingController extends Controller
{
    public function __construct(
        private readonly TrackingService $tracking
    ) {}

    public function pageView(TrackPageViewRequest $request): Response
    {
        $this->tracking->recordPageView($request, $request->validated());

        return response()->noContent();
    }

    public function lineClick(TrackLineClickRequest $request): Response
    {
        $this->tracking->recordLineClick($request, $request->validated());

        return response()->noContent();
    }

    /**
     * 計測リンク経由のリダイレクト。クリックを記録して destination_url へ 302。
     * 無効 / 未知の code は LINE 公式アカウントの友だち追加URLへフォールバック。
     */
    public function redirect(Request $request, string $code): RedirectResponse
    {
        $link = TrackingLink::where('code', $code)->where('is_active', true)->first();

        if ($link) {
            $this->tracking->recordLineClick($request, [
                'source' => 'affiliate',
                'page_type' => $request->query('p'),
            ], $link);

            return redirect()->away($link->destination_url);
        }

        $basicId = config('services.line.official_account_id') ?: '@043uxuen';

        return redirect()->away('https://line.me/R/ti/p/' . $basicId);
    }
}
