<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * LINE 追加 (intent) クリックログ。append-only。
 * /r/{code} リダイレクト経由とサイト内 CTA ビーコン (line.ts) の両方が溜まる。
 *
 * @see \App\Services\Analytics\TrackingService::recordLineClick()
 */
class LinkClick extends Model
{
    public const UPDATED_AT = null; // append-only

    protected $fillable = [
        'tracking_link_id',
        'source',
        'page_type',
        'store_id',
        'article_id',
        'area',
        'session_id',
        'ip_hash',
        'referrer',
        'user_agent',
    ];

    public function trackingLink(): BelongsTo
    {
        return $this->belongsTo(TrackingLink::class);
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function article(): BelongsTo
    {
        return $this->belongsTo(Article::class);
    }
}
