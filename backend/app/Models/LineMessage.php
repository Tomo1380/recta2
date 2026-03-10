<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LineMessage extends Model
{
    protected $fillable = [
        'line_user_id',
        'user_id',
        'direction',
        'message_type',
        'content',
        'line_message_id',
        'read_at',
    ];

    protected $casts = [
        'read_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function lineFriend(): BelongsTo
    {
        return $this->belongsTo(LineFriend::class, 'line_user_id', 'line_user_id');
    }
}
