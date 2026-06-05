<?php

namespace App\Models;

use App\Http\Controllers\SeoController;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Cache;

class Article extends Model
{
    use HasFactory;

    /**
     * 公開状態の変更を sitemap キャッシュに即時反映する。
     * Store::booted() と同じ理由：新規記事公開直後の検索エンジンクロール
     * に新 URL を届けるため。
     */
    protected static function booted(): void
    {
        $flush = function () {
            try {
                Cache::tags([SeoController::CACHE_TAG])->flush();
            } catch (\Throwable $e) {
                // tag 非対応 driver でもアプリは落とさない
            }
        };
        static::saved($flush);
        static::deleted($flush);
    }

    protected $fillable = [
        'slug',
        'title',
        'excerpt',
        'body',
        'body_html',
        'thumbnail_url',
        'category',
        'tags',
        'status',
        'published_at',
        'author_id',
    ];

    protected function casts(): array
    {
        return [
            'body' => 'array',
            'tags' => 'array',
            'published_at' => 'datetime',
        ];
    }

    /**
     * Plain-text version of body, for AI knowledge search.
     */
    public function getBodyPlainTextAttribute(): string
    {
        if (!$this->body_html) {
            return '';
        }
        return trim(preg_replace('/\s+/u', ' ', strip_tags($this->body_html)));
    }

    /**
     * 本文の文字数（C1: 一覧で「文字数」を表示）。body_html からタグを除いて数える。
     */
    public function getCharCountAttribute(): int
    {
        return mb_strlen($this->body_plain_text);
    }

    /** 作成者（管理ユーザー）。 */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(AdminUser::class, 'author_id');
    }

    public function scopePublished($query)
    {
        return $query->where('status', 'published')
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now());
    }
}
