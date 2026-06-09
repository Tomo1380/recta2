<?php

namespace App\Console\Commands;

use App\Models\AiChatLog;
use Illuminate\Console\Command;

/**
 * AI チャットログの保持期間管理 (PII 最小化)。
 *
 * ai_chat_logs は user_message / ai_response / ip_address / line_user_id を保持し、
 * フリーテキストに個人情報 (居住地・年齢・経済状況など) が含まれうる。LINE ID と
 * 突合可能な PII を無期限に持たないよう、保持日数を過ぎたログを削除する。
 *
 * 既定 180 日。--days で上書き、--dry-run で件数確認のみ。
 * スケジューラ (routes/console.php) で日次実行する。
 */
class PruneAiChatLogs extends Command
{
    protected $signature = 'ai-chat:prune-logs {--days= : 保持日数 (既定: config ai_chat.log_retention_days)} {--dry-run : 削除せず件数のみ表示}';

    protected $description = '保持期間を過ぎた AI チャットログを削除する (PII 最小化)';

    public function handle(): int
    {
        $days = (int) ($this->option('days') ?? config('ai_chat.log_retention_days', 180));
        if ($days < 1) {
            $this->error('保持日数は 1 以上で指定してください。');
            return self::FAILURE;
        }

        $cutoff = now()->subDays($days);
        $query = AiChatLog::where('created_at', '<', $cutoff);
        $count = $query->count();

        if ($this->option('dry-run')) {
            $this->info("[dry-run] {$cutoff->toDateTimeString()} より前のログ {$count} 件が削除対象です。");
            return self::SUCCESS;
        }

        $deleted = 0;
        $query->orderBy('id')->chunkById(1000, function ($logs) use (&$deleted) {
            $ids = $logs->pluck('id');
            $deleted += AiChatLog::whereIn('id', $ids)->delete();
        });

        $this->info("AI チャットログ {$deleted} 件を削除しました (保持 {$days} 日)。");
        return self::SUCCESS;
    }
}
