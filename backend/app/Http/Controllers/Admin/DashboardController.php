<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AiChatLog;
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

        return response()->json([
            'stats' => $stats,
            'user_trend' => $userTrend,
            'chat_trend' => $chatTrend,
        ]);
    }
}
