<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Store extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'area', 'address', 'nearest_station', 'category',
        'phone', 'website_url',
        'schedule',
        'wage', 'compensation', 'guarantee', 'cast_profile', 'interview',
        'feature_tags', 'description', 'features_text',
        'images', 'video_url',
        'analysis', 'required_documents',
        'recent_hires', 'recent_hires_summary',
        'popular_features', 'qa', 'staff_comment',
        'champagne_prices', 'champagne_description',
        'transfer_description', 'transfer_km', 'transfer_map_image_url', 'transfer_zones',
        'dress_code', 'set_fee', 'salary_simulator',
        'recta_episodes', 'related_store_ids',
        'experience_guaranteed', 'publish_status',
    ];

    protected $casts = [
        'schedule' => 'array',
        'wage' => 'array',
        'compensation' => 'array',
        'guarantee' => 'array',
        'cast_profile' => 'array',
        'interview' => 'array',
        'feature_tags' => 'array',
        'images' => 'array',
        'analysis' => 'array',
        'required_documents' => 'array',
        'recent_hires' => 'array',
        'popular_features' => 'array',
        'qa' => 'array',
        'staff_comment' => 'array',
        'champagne_prices' => 'array',
        'transfer_zones' => 'array',
        'dress_code' => 'array',
        'set_fee' => 'array',
        'salary_simulator' => 'array',
        'recta_episodes' => 'array',
        'related_store_ids' => 'array',
        'experience_guaranteed' => 'boolean',
    ];

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
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
