<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * ページ閲覧 (PV) ログ。append-only。
 *
 * @see \App\Services\Analytics\TrackingService::recordPageView()
 */
class PageView extends Model
{
    public const UPDATED_AT = null; // append-only: updated_at を持たない

    protected $fillable = [
        'session_id',
        'page_type',
        'store_id',
        'article_id',
        'area',
        'path',
        'referrer',
        'ip_hash',
        'user_agent',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function article(): BelongsTo
    {
        return $this->belongsTo(Article::class);
    }
}
