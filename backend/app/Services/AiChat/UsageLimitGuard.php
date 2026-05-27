<?php

namespace App\Services\AiChat;

use App\Models\AiChatLimit;
use App\Models\AiChatLog;

/**
 * AI チャット利用回数の上限チェック。
 *
 * Phase 2-1b で AiChatController::checkUsageLimits / checkUsageLimitsForStream
 * を切り出し。両者は同じロジックの array 形 / JsonResponse 形のラッパー
 * だったため、本 Service では配列形に統一する (controller / stream 側で
 * 必要に応じて 429 JsonResponse に包む)。
 */
class UsageLimitGuard
{
    /**
     * 利用上限超過なら理由を array で返す。OK なら null。
     *
     * @return array{message: string, limit_type: string}|null
     */
    public function check(?object $user, string $ip): ?array
    {
        $limits = AiChatLimit::current();
        $today = now()->toDateString();
        $monthStart = now()->startOfMonth();

        // 1. Global daily limit
        $globalToday = AiChatLog::whereDate('created_at', $today)->count();
        if ($globalToday >= $limits->global_daily_limit) {
            return [
                'message' => $limits->limit_reached_message,
                'limit_type' => 'global_daily',
            ];
        }

        if ($user) {
            // 2. Authenticated user daily limit
            $userToday = AiChatLog::where('user_id', $user->id)
                ->whereDate('created_at', $today)
                ->count();
            if ($userToday >= $limits->user_daily_limit) {
                return [
                    'message' => $limits->limit_reached_message,
                    'limit_type' => 'user_daily',
                ];
            }

            // 3. Authenticated user monthly limit
            $userMonth = AiChatLog::where('user_id', $user->id)
                ->where('created_at', '>=', $monthStart)
                ->count();
            if ($userMonth >= $limits->user_monthly_limit) {
                return [
                    'message' => $limits->limit_reached_message,
                    'limit_type' => 'user_monthly',
                ];
            }
        } else {
            // 4. Unauthenticated IP daily limit
            $ipToday = AiChatLog::where('ip_address', $ip)
                ->whereDate('created_at', $today)
                ->count();
            if ($ipToday >= $limits->ip_daily_limit) {
                return [
                    'message' => $limits->limit_reached_message,
                    'limit_type' => 'ip_daily',
                ];
            }
        }

        return null;
    }
}
