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

    /** コラムTOP 上段ナビの大テーマ (C2)。 */
    public const SECTIONS = ['夜の始め方', 'エリア別比較', '地方から上京', 'Q&A'];

    protected $fillable = [
        'slug',
        'title',
        'excerpt',
        'body',
        'body_html',
        'thumbnail_url',
        'category',
        'section',
        'related_store_ids',
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
            'related_store_ids' => 'array',
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

    /**
     * 「この記事で紹介した店舗」(C4) を related_store_ids の順序のまま解決する。
     * 公開済みの店舗のみ。カード表示用の軽量サマリを返す。
     *
     * @return array<int,array<string,mixed>>
     */
    public function relatedStoreSummaries(): array
    {
        $ids = $this->related_store_ids ?? [];
        if (empty($ids)) {
            return [];
        }

        $byId = Store::whereIn('id', $ids)
            ->where('publish_status', 'published')
            ->withAvg(['reviews as reviews_avg_rating' => fn ($q) => $q->where('status', 'published')], 'rating')
            ->get(['id', 'name', 'slug', 'area', 'category', 'images', 'wage'])
            ->keyBy('id');

        return collect($ids)
            ->map(fn ($id) => $byId->get($id))
            ->filter()
            ->map(function (Store $s) {
                $first = is_array($s->images) ? ($s->images[0] ?? null) : null;
                $image = is_array($first) ? ($first['url'] ?? null) : (is_string($first) ? $first : null);

                // 体入時給 (旧データ avg_hourly / hourly もフォールバック)。横スライドの
                // 店舗カードを店舗詳細寄りにするため (FB: コラム①)。
                $wage = is_array($s->wage) ? $s->wage : [];
                $trial = $wage['trial'] ?? [];
                $toInt = fn ($v) => is_numeric($v) ? (int) $v : (is_string($v) && $v !== '' ? (int) preg_replace('/[^\d]/', '', $v) : null);

                return [
                    'id' => $s->id,
                    'name' => $s->name,
                    'slug' => $s->slug,
                    'area' => $s->area,
                    'category' => $s->category,
                    'image' => $image,
                    'trial_hourly_min' => $toInt($trial['hourly_min'] ?? $trial['avg_hourly'] ?? null),
                    'trial_hourly_max' => $toInt($trial['hourly_max'] ?? $trial['hourly'] ?? null),
                    'average_rating' => $s->reviews_avg_rating !== null ? round((float) $s->reviews_avg_rating, 1) : null,
                ];
            })
            ->values()
            ->all();
    }

    public function scopePublished($query)
    {
        return $query->where('status', 'published')
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now());
    }
}
