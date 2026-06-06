<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AiChatLog;
use App\Models\Article;
use App\Models\FineTuningQa;
use App\Models\LineFriend;
use App\Models\LineMessage;
use App\Models\Review;
use App\Models\Store;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon as SupportCarbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * Admin dashboard summary.
     *
     * Provides KPI cards, 30-day time series, distribution charts and
     * recent activity for the night-work matching platform.
     */
    public function index(): JsonResponse
    {
        $now = now();
        $today = $now->copy()->startOfDay();
        $thirtyDaysAgo = $now->copy()->subDays(29)->startOfDay(); // inclusive 30-day window
        $previousWindowStart = $now->copy()->subDays(59)->startOfDay();
        $previousWindowEnd = $thirtyDaysAgo->copy()->subSecond();

        // ----------------------------------------------------------------
        // KPI cards
        // ----------------------------------------------------------------
        $publishedStoresNow = Store::where('publish_status', 'published')->count();
        $publishedStores30dAgo = Store::where('publish_status', 'published')
            ->where('created_at', '<', $thirtyDaysAgo)
            ->count();
        $publishedStoresDelta = $publishedStoresNow - $publishedStores30dAgo;

        $activeUsers30d = User::where('status', 'active')
            ->where('last_login_at', '>=', $thirtyDaysAgo)
            ->count();
        $activeUsersPrev = User::where('status', 'active')
            ->whereBetween('last_login_at', [$previousWindowStart, $previousWindowEnd])
            ->count();
        $activeUsersDelta = $activeUsers30d - $activeUsersPrev;

        $lineFriendsNow = LineFriend::where('is_following', true)->count();
        $lineFriends30dAgo = LineFriend::where('is_following', true)
            ->where('created_at', '<', $thirtyDaysAgo)
            ->count();
        $lineFriendsDelta = $lineFriendsNow - $lineFriends30dAgo;

        $reviewsToday = Review::where('status', 'published')
            ->where('created_at', '>=', $today)
            ->count();
        $reviewsYesterday = Review::where('status', 'published')
            ->whereBetween('created_at', [
                $today->copy()->subDay(),
                $today->copy()->subSecond(),
            ])
            ->count();

        $chatToday = AiChatLog::where('created_at', '>=', $today)->count();
        $chatTokensToday = (int) AiChatLog::where('created_at', '>=', $today)
            ->sum(DB::raw('COALESCE(input_tokens, 0) + COALESCE(output_tokens, 0)'));
        $chatAvgTokensToday = $chatToday > 0
            ? (int) round($chatTokensToday / $chatToday)
            : 0;

        $kpis = [
            'published_stores' => [
                'value' => $publishedStoresNow,
                'delta_30d' => $publishedStoresDelta,
            ],
            'active_users_30d' => [
                'value' => $activeUsers30d,
                'delta_vs_prev' => $activeUsersDelta,
            ],
            'line_friends' => [
                'value' => $lineFriendsNow,
                'delta_30d' => $lineFriendsDelta,
            ],
            'reviews_today' => [
                'value' => $reviewsToday,
                'delta_vs_yesterday' => $reviewsToday - $reviewsYesterday,
            ],
            'chat_today' => [
                'value' => $chatToday,
                'avg_tokens' => $chatAvgTokensToday,
            ],
        ];

        // ----------------------------------------------------------------
        // 30-day time series: AI chat usage by mode
        // ----------------------------------------------------------------
        $chatByDay = AiChatLog::select(
                DB::raw('DATE(created_at) as date'),
                'mode',
                DB::raw('COUNT(*) as count')
            )
            ->where('created_at', '>=', $thirtyDaysAgo)
            ->groupBy(DB::raw('DATE(created_at)'), 'mode')
            ->get();

        $chatTrend = $this->fillDailySeries($thirtyDaysAgo, $now, function (string $date) use ($chatByDay) {
            $forDate = $chatByDay->filter(
                fn ($row) => SupportCarbon::parse($row->date)->toDateString() === $date
            );

            return [
                'date' => $date,
                'agent' => (int) ($forDate->firstWhere('mode', 'agent')->count ?? 0),
                'finetuned' => (int) ($forDate->firstWhere('mode', 'finetuned')->count ?? 0),
                'total' => (int) $forDate->sum('count'),
            ];
        });

        // ----------------------------------------------------------------
        // 30-day time series: new LINE friend follows
        // ----------------------------------------------------------------
        $lineFriendByDay = LineFriend::select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('COUNT(*) as count')
            )
            ->where('created_at', '>=', $thirtyDaysAgo)
            ->groupBy(DB::raw('DATE(created_at)'))
            ->get()
            ->keyBy(fn ($row) => SupportCarbon::parse($row->date)->toDateString());

        $lineFriendTrend = $this->fillDailySeries($thirtyDaysAgo, $now, function (string $date) use ($lineFriendByDay) {
            return [
                'date' => $date,
                'count' => (int) ($lineFriendByDay->get($date)->count ?? 0),
            ];
        });

        // ----------------------------------------------------------------
        // Recent reviews
        // ----------------------------------------------------------------
        $recentReviews = Review::with(['user:id,line_display_name,nickname', 'store:id,name'])
            ->orderByDesc('created_at')
            ->limit(10)
            ->get()
            ->map(function (Review $review) {
                $userName = $review->user?->nickname
                    ?: $review->user?->line_display_name
                    ?: '匿名ユーザー';

                return [
                    'id' => $review->id,
                    'rating' => (int) $review->rating,
                    'body' => mb_substr((string) $review->body, 0, 80),
                    'status' => $review->status,
                    'created_at' => optional($review->created_at)->toIso8601String(),
                    'user_name' => $userName,
                    'store_id' => $review->store_id,
                    'store_name' => $review->store?->name,
                ];
            })
            ->values();

        // ----------------------------------------------------------------
        // Recent inbound LINE messages
        // ----------------------------------------------------------------
        $recentInbound = LineMessage::with(['user:id,line_display_name,nickname'])
            ->where('direction', 'inbound')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        // 管理用の別名 (admin_name) 優先、無ければ LINE 名 (display_name)。
        $friendNamesByLineId = LineFriend::whereIn(
                'line_user_id',
                $recentInbound->pluck('line_user_id')->unique()->values()
            )
            ->get(['line_user_id', 'admin_name', 'display_name'])
            ->mapWithKeys(fn ($f) => [$f->line_user_id => ($f->admin_name ?: $f->display_name)]);

        $recentMessages = $recentInbound->map(function (LineMessage $msg) use ($friendNamesByLineId) {
            $name = $msg->user?->nickname
                ?: $msg->user?->line_display_name
                ?: $friendNamesByLineId->get($msg->line_user_id)
                ?: 'Unknown';

            return [
                'id' => $msg->id,
                'user_id' => $msg->user_id,
                'line_user_id' => $msg->line_user_id,
                'name' => $name,
                'avatar' => mb_substr($name, 0, 1),
                'message' => mb_substr((string) $msg->content, 0, 100),
                'created_at' => optional($msg->created_at)->toIso8601String(),
                'unread' => is_null($msg->read_at),
            ];
        })->values();

        // ----------------------------------------------------------------
        // Recent AI chat conversations
        // ----------------------------------------------------------------
        $recentChats = AiChatLog::with(['user:id,line_display_name,nickname'])
            ->orderByDesc('created_at')
            ->limit(10)
            ->get()
            ->map(function (AiChatLog $log) {
                $name = $log->user?->nickname
                    ?: $log->user?->line_display_name
                    ?: '匿名';

                return [
                    'id' => $log->id,
                    'mode' => $log->mode,
                    'page_type' => $log->page_type,
                    'user_message' => mb_substr((string) $log->user_message, 0, 80),
                    'total_tokens' => (int) (($log->input_tokens ?? 0) + ($log->output_tokens ?? 0)),
                    'created_at' => optional($log->created_at)->toIso8601String(),
                    'user_name' => $name,
                ];
            })
            ->values();

        // ----------------------------------------------------------------
        // Secondary stats
        // ----------------------------------------------------------------
        $secondary = [
            'unread_messages' => LineMessage::where('direction', 'inbound')
                ->whereNull('read_at')
                ->count(),
            'pending_reviews' => Review::where('status', 'unpublished')->count(),
            'published_articles' => Article::where('status', 'published')->count(),
            'fine_tuning_qa_active' => FineTuningQa::where('status', FineTuningQa::STATUS_ACTIVE)->count(),
        ];

        return response()->json([
            'generated_at' => $now->toIso8601String(),
            'kpis' => $kpis,
            'chat_trend' => $chatTrend,
            'line_friend_trend' => $lineFriendTrend,
            'recent_reviews' => $recentReviews,
            'recent_messages' => $recentMessages,
            'recent_chats' => $recentChats,
            'secondary' => $secondary,
        ]);
    }

    /**
     * Build a continuous day-by-day series across [start, end] (inclusive),
     * using $rowFactory(string $date) to materialise each point.
     *
     * @return Collection<int,array<string,mixed>>
     */
    private function fillDailySeries(Carbon $start, Carbon $end, callable $rowFactory): Collection
    {
        $points = collect();
        $cursor = $start->copy()->startOfDay();
        $stop = $end->copy()->startOfDay();

        while ($cursor->lte($stop)) {
            $points->push($rowFactory($cursor->toDateString()));
            $cursor->addDay();
        }

        return $points;
    }
}
