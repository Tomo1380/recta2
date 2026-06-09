<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateAiChatLimitsRequest;
use App\Http\Requests\Admin\UpdateAiChatSettingRequest;
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

    public function update(UpdateAiChatSettingRequest $request, AiChatSetting $aiChatSetting): JsonResponse
    {
        $aiChatSetting->update($request->validated());

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

        return response()->json([
            'daily_stats' => $dailyStats,
            'top_users' => $topUsers,
            'monthly_total' => $monthlyTotal,
            'monthly_tokens' => $monthlyTokens,
        ]);
    }

    /**
     * AIチャット履歴 (個別の質問/回答ログ)。page_type / 本文検索で絞り込み。
     *
     * @response array{data: array<int, mixed>, current_page: int, last_page: int, per_page: int, total: int}
     */
    public function logs(Request $request): JsonResponse
    {
        $query = AiChatLog::with('user:id,line_display_name,nickname')->latest();

        if ($pageType = $request->input('page_type')) {
            $query->where('page_type', $pageType);
        }
        if ($search = $request->input('q')) {
            $query->where(function ($q) use ($search) {
                $q->where('user_message', 'ilike', "%{$search}%")
                  ->orWhere('ai_response', 'ilike', "%{$search}%");
            });
        }

        $logs = $query->paginate($request->input('per_page', 20))->through(fn (AiChatLog $log) => [
            'id' => $log->id,
            'user_message' => $log->user_message,
            'ai_response' => $log->ai_response,
            'page_type' => $log->page_type,
            'input_tokens' => $log->input_tokens,
            'output_tokens' => $log->output_tokens,
            'total_tokens' => (int) $log->input_tokens + (int) $log->output_tokens,
            'ip_address' => $log->ip_address,
            'user_name' => $log->user?->nickname ?: $log->user?->line_display_name,
            'user_id' => $log->user_id,
            'created_at' => $log->created_at?->toIso8601String(),
        ]);

        return response()->json($logs);
    }

    public function limits(): JsonResponse
    {
        return response()->json(AiChatLimit::current());
    }

    public function updateLimits(UpdateAiChatLimitsRequest $request): JsonResponse
    {
        $limits = AiChatLimit::current();
        $limits->update($request->validated());

        return response()->json($limits);
    }
}
