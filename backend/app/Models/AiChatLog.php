<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiChatLog extends Model
{
    protected $fillable = [
        'user_id',
        'ip_address',
        'page_type',
        'user_message',
        'ai_response',
        'input_tokens',
        'output_tokens',
        'mode',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
