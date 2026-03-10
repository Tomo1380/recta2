<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiChatLimit extends Model
{
    protected $fillable = [
        'user_daily_limit',
        'user_monthly_limit',
        'ip_daily_limit',
        'global_daily_limit',
        'limit_reached_message',
    ];

    /**
     * Get the singleton limits row, creating with defaults if absent.
     */
    public static function current(): self
    {
        return static::firstOrCreate([], [
            'user_daily_limit' => 50,
            'user_monthly_limit' => 500,
            'ip_daily_limit' => 10,
            'global_daily_limit' => 10000,
            'limit_reached_message' => '本日のチャット上限に達しました。明日またご利用ください。',
        ]);
    }
}
