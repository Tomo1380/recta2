<?php

namespace App\Models;

use App\Http\Controllers\SeoController;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Cache;

class Store extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'slug', 'area', 'address', 'lat', 'lng', 'nearest_station', 'category',
        'phone', 'website_url',
        'schedule',
        'wage', 'compensation', 'guarantee', 'interview',
        'feature_tags', 'description', 'features_text',
        'images',
        'analysis', 'required_documents',
        'recent_hires', 'recent_hires_summary',
        'qa', 'staff_comment',
        'champagne_prices', 'champagne_description',
        'transfer_description', 'transfer_km', 'transfer_zones',
        'dress_code', 'set_fee',
        'recta_episodes', 'related_store_ids',
        'experience_guaranteed', 'publish_status',
        'priority',
        'seo_meta_description',
    ];

    protected $casts = [
        'schedule' => 'array',
        'wage' => 'array',
        'compensation' => 'array',
        'guarantee' => 'array',
        'interview' => 'array',
        'feature_tags' => 'array',
        'images' => 'array',
        'analysis' => 'array',
        'required_documents' => 'array',
        'recent_hires' => 'array',
        'qa' => 'array',
        'staff_comment' => 'array',
        'champagne_prices' => 'array',
        'transfer_zones' => 'array',
        'dress_code' => 'array',
        'set_fee' => 'array',
        'recta_episodes' => 'array',
        'related_store_ids' => 'array',
        'experience_guaranteed' => 'boolean',
        'lat' => 'float',
        'lng' => 'float',
    ];

    /**
     * 店舗の publish 状態や名前が変わったら sitemap キャッシュを無効化する。
     * tag-based cache（redis backend）でまとめて flush することで、新規店舗が
     * 公開された直後の検索エンジンクロールに新 URL を確実に届ける。
     */
    protected static function booted(): void
    {
        $flush = function () {
            try {
                Cache::tags([SeoController::CACHE_TAG])->flush();
            } catch (\Throwable $e) {
                // tag 非対応 driver (file / database) でもアプリは落とさない
            }
        };
        static::saved($flush);
        static::deleted($flush);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function videos(): HasMany
    {
        return $this->hasMany(StoreVideo::class)->orderBy('display_order');
    }

    public function staffPhotos(): HasMany
    {
        return $this->hasMany(StoreStaffPhoto::class)->orderBy('display_order');
    }

    public function averageRating(): float
    {
        return $this->reviews()->where('status', 'published')->avg('rating') ?? 0;
    }

    public function reviewCount(): int
    {
        return $this->reviews()->where('status', 'published')->count();
    }
}
