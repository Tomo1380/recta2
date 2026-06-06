<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * 共有可能な計測リンク（アフィリエイト / 店舗別LINE導線 / SNSキャンペーン）。
 * 公開URL は `/r/{code}` で、クリックを記録しつつ destination_url へ 302 する。
 *
 * @see \App\Services\Analytics\TrackingLinkService
 */
class TrackingLink extends Model
{
    public const TARGET_STORE = 'store';
    public const TARGET_AREA = 'area';
    public const TARGET_COLUMN = 'column';
    public const TARGET_STANDALONE = 'standalone';

    protected $fillable = [
        'code',
        'label',
        'target_type',
        'store_id',
        'article_id',
        'area',
        'destination_url',
        'created_by',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function article(): BelongsTo
    {
        return $this->belongsTo(Article::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(AdminUser::class, 'created_by');
    }

    public function clicks(): HasMany
    {
        return $this->hasMany(LinkClick::class);
    }
}
