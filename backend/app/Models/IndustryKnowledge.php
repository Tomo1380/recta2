<?php

namespace App\Models;

use App\Http\Controllers\SeoController;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class IndustryKnowledge extends Model
{
    protected $table = 'industry_knowledges';

    protected $fillable = [
        'category',
        'slug',
        'title',
        'keywords',
        'content',
        'sort_order',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'keywords' => 'array',
            'is_active' => 'boolean',
        ];
    }

    /**
     * 公開状態や slug が変わったら sitemap キャッシュと glossary キャッシュを
     * 無効化する。SeoController::CACHE_TAG と兼用で flush。
     */
    protected static function booted(): void
    {
        $flush = function (IndustryKnowledge $entry): void {
            try {
                Cache::tags([SeoController::CACHE_TAG])->flush();
            } catch (\Throwable $e) {
                // tag 非対応 driver でも落とさない
            }
            Cache::forget('glossary:index');
            Cache::forget("glossary:show:{$entry->slug}");
        };
        static::saved($flush);
        static::deleted($flush);
    }
}
