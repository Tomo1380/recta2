<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiChatLog extends Model
{
    protected $fillable = [
        'user_id',
        'line_user_id',
        'ip_address',
        'page_type',
        'user_message',
        'ai_response',
        'input_tokens',
        'output_tokens',
        'mode',
    ];

    /**
     * ログインユーザーのチャットは、その人の line_user_id を写しておく。
     * これにより AIチャットを「LINEトーク基準 (line_user_id)」で人に紐づけられる
     * (コントローラ側を一切触らず creating で自動補完)。
     */
    protected static function booted(): void
    {
        static::creating(function (AiChatLog $log) {
            if ($log->user_id && empty($log->line_user_id)) {
                $log->line_user_id = User::whereKey($log->user_id)->value('line_user_id');
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
