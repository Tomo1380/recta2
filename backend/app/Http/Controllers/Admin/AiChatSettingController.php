<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AiChatLimit;
use App\Models\AiChatLog;
use App\Models\AiChatSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AiChatSettingController extends Controller
{
    public function index(): JsonResponse
    {
        $settings = AiChatSetting::all();

        return response()->json($settings);
    }

    public function update(Request $request, AiChatSetting $aiChatSetting): JsonResponse
    {
        $request->validate([
            'enabled' => 'sometimes|boolean',
            'system_prompt' => 'sometimes|nullable|string',
            'tone' => 'sometimes|in:casual,formal,friendly',
            'suggest_buttons' => 'sometimes|nullable|array',
        ]);

        $aiChatSetting->update($request->only(['enabled', 'system_prompt', 'tone', 'suggest_buttons']));

        return response()->json($aiChatSetting);
    }

    public function stats(Request $request): JsonResponse
    {
        $days = $request->input('days', 30);

        $dailyStats = AiChatLog::select(
                DB::raw("DATE(created_at) as date"),
                DB::raw('COUNT(*) as count'),
                DB::raw('SUM(input_tokens + output_tokens) as total_tokens')
            )
            ->where('created_at', '>=', now()->subDays($days))
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $topUsers = AiChatLog::select('user_id', DB::raw('COUNT(*) as count'))
            ->whereNotNull('user_id')
            ->where('created_at', '>=', now()->subDays($days))
            ->groupBy('user_id')
            ->orderByDesc('count')
            ->limit(10)
            ->with('user:id,line_display_name')
            ->get();

        $monthlyTotal = AiChatLog::where('created_at', '>=', now()->startOfMonth())->count();
        $monthlyTokens = AiChatLog::where('created_at', '>=', now()->startOfMonth())
            ->sum(DB::raw('input_tokens + output_tokens'));

        // Mode comparison stats
        $modeStats = AiChatLog::select(
                'mode',
                DB::raw('COUNT(*) as count'),
                DB::raw('SUM(input_tokens) as total_input_tokens'),
                DB::raw('SUM(output_tokens) as total_output_tokens'),
                DB::raw('SUM(input_tokens + output_tokens) as total_tokens'),
                DB::raw('AVG(input_tokens + output_tokens) as avg_tokens'),
            )
            ->where('created_at', '>=', now()->subDays($days))
            ->groupBy('mode')
            ->get();

        $modeDailyStats = AiChatLog::select(
                DB::raw("DATE(created_at) as date"),
                'mode',
                DB::raw('COUNT(*) as count'),
                DB::raw('SUM(input_tokens + output_tokens) as total_tokens'),
                DB::raw('AVG(input_tokens + output_tokens) as avg_tokens'),
            )
            ->where('created_at', '>=', now()->subDays($days))
            ->groupBy('date', 'mode')
            ->orderBy('date')
            ->get();

        return response()->json([
            'daily_stats' => $dailyStats,
            'top_users' => $topUsers,
            'monthly_total' => $monthlyTotal,
            'monthly_tokens' => $monthlyTokens,
            'mode_stats' => $modeStats,
            'mode_daily_stats' => $modeDailyStats,
        ]);
    }

    public function limits(): JsonResponse
    {
        return response()->json(AiChatLimit::current());
    }

    public function updateLimits(Request $request): JsonResponse
    {
        $request->validate([
            'user_daily_limit' => 'sometimes|integer|min:1',
            'user_monthly_limit' => 'sometimes|integer|min:1',
            'ip_daily_limit' => 'sometimes|integer|min:1',
            'global_daily_limit' => 'sometimes|integer|min:1',
            'limit_reached_message' => 'sometimes|string|max:500',
        ]);

        $limits = AiChatLimit::current();
        $limits->update($request->only([
            'user_daily_limit',
            'user_monthly_limit',
            'ip_daily_limit',
            'global_daily_limit',
            'limit_reached_message',
        ]));

        return response()->json($limits);
    }
}
