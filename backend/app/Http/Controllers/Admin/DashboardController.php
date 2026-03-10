<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AiChatLog;
use App\Models\LineFriend;
use App\Models\LineMessage;
use App\Models\Review;
use App\Models\Store;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(): JsonResponse
    {
        $stats = [
            'user_count' => User::count(),
            'store_count' => Store::where('publish_status', 'published')->count(),
            'review_count' => Review::where('status', 'published')->count(),
            'today_chat_count' => AiChatLog::whereDate('created_at', today())->count(),
        ];

        // 直近6ヶ月のユーザー登録推移
        $userTrend = User::select(
                DB::raw("TO_CHAR(created_at, 'YYYY-MM') as month"),
                DB::raw('COUNT(*) as count')
            )
            ->where('created_at', '>=', now()->subMonths(6))
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        // 直近7日のチャット利用数
        $chatTrend = AiChatLog::select(
                DB::raw("DATE(created_at) as date"),
                DB::raw('COUNT(*) as count')
            )
            ->where('created_at', '>=', now()->subDays(7))
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // LINE stats
        $friendsAddedThisMonth = LineFriend::where('created_at', '>=', now()->startOfMonth())->count();
        $lineStats = [
            'friends' => LineFriend::count(),
            'friends_change' => '+' . $friendsAddedThisMonth,
            'today_added' => LineFriend::whereDate('created_at', today())->count(),
            'unread_messages' => LineMessage::where('direction', 'inbound')
                ->whereNull('read_at')
                ->count(),
        ];

        // Recent messages: latest message per line_user_id, joined with line_friends
        $latestMessageIds = LineMessage::select(DB::raw('MAX(id) as id'))
            ->groupBy('line_user_id')
            ->pluck('id');

        $recentMessages = LineMessage::whereIn('line_messages.id', $latestMessageIds)
            ->leftJoin('line_friends', 'line_messages.line_user_id', '=', 'line_friends.line_user_id')
            ->select([
                'line_friends.id as friend_id',
                'line_friends.user_id',
                'line_friends.display_name',
                'line_messages.content',
                'line_messages.created_at',
                'line_messages.read_at',
                'line_messages.direction',
            ])
            ->orderByDesc('line_messages.created_at')
            ->limit(5)
            ->get()
            ->map(function ($msg) {
                $name = $msg->display_name ?? 'Unknown';
                return [
                    'id' => $msg->friend_id,
                    'user_id' => $msg->user_id,
                    'name' => $name,
                    'avatar' => mb_substr($name, 0, 1),
                    'message' => $msg->content,
                    'time' => \Carbon\Carbon::parse($msg->created_at)->format('H:i'),
                    'unread' => $msg->direction === 'inbound' && is_null($msg->read_at),
                ];
            });

        // Activity logs: recent admin actions
        $activities = collect();

        // New users
        $newUsers = User::orderByDesc('created_at')
            ->limit(6)
            ->get()
            ->map(function ($user) {
                return [
                    'time' => $user->created_at->format('H:i'),
                    'sort_time' => $user->created_at,
                    'user' => 'システム',
                    'action' => '新規ユーザー「' . ($user->line_display_name ?? 'ID:' . $user->id) . '」が登録',
                    'type' => 'create',
                ];
            });
        $activities = $activities->merge($newUsers);

        // Updated stores
        $updatedStores = Store::where('updated_at', '!=', DB::raw('created_at'))
            ->orderByDesc('updated_at')
            ->limit(6)
            ->get()
            ->map(function ($store) {
                return [
                    'time' => $store->updated_at->format('H:i'),
                    'sort_time' => $store->updated_at,
                    'user' => 'システム',
                    'action' => '店舗「' . $store->name . '」を更新',
                    'type' => 'update',
                ];
            });
        $activities = $activities->merge($updatedStores);

        // Approved reviews
        $approvedReviews = Review::where('status', 'published')
            ->orderByDesc('updated_at')
            ->limit(6)
            ->get()
            ->map(function ($review) {
                return [
                    'time' => $review->updated_at->format('H:i'),
                    'sort_time' => $review->updated_at,
                    'user' => 'システム',
                    'action' => '口コミ #' . $review->id . ' を承認',
                    'type' => 'approve',
                ];
            });
        $activities = $activities->merge($approvedReviews);

        $activityLogs = $activities
            ->sortByDesc('sort_time')
            ->take(6)
            ->map(function ($item) {
                unset($item['sort_time']);
                return $item;
            })
            ->values();

        return response()->json([
            'stats' => $stats,
            'user_trend' => $userTrend,
            'chat_trend' => $chatTrend,
            'line_stats' => $lineStats,
            'recent_messages' => $recentMessages,
            'activity_logs' => $activityLogs,
        ]);
    }
}
