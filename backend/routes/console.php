<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// AI チャットログの PII を保持期間で削除する (既定 180 日)。日次実行。
Schedule::command('ai-chat:prune-logs')->dailyAt('04:00');
