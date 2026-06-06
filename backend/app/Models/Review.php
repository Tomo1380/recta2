<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Review extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'store_id',
        'rating',
        'body',
        'tweet_id',
        'tweet_author_screen_name',
        'status',
        // 管理者運用フィールド (FB B)
        'author_name',
        'is_featured',
        'store_reply',
        'store_reply_at',
    ];

    protected $casts = [
        'is_featured' => 'boolean',
        'store_reply_at' => 'datetime',
    ];

    /**
     * 表示名: 管理者入力の author_name を優先し、なければ実ユーザーの
     * nickname / line_display_name、それも無ければ匿名。
     */
    public function displayAuthorName(): string
    {
        return $this->author_name
            ?: $this->user?->nickname
            ?: $this->user?->line_display_name
            ?: '匿名ユーザー';
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
}
