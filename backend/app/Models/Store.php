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
        'business_hours', 'holidays', 'phone', 'website_url',
        'hourly_min', 'hourly_max', 'daily_estimate',
        'back_items', 'fee_items', 'salary_notes',
        'guarantee_period', 'guarantee_details', 'norma_info',
        'trial_avg_hourly', 'trial_hourly', 'interview_hours', 'same_day_trial',
        'feature_tags', 'description', 'features_text',
        'images', 'video_url',
        'analysis', 'interview_info', 'required_documents',
        'schedule', 'recent_hires', 'recent_hires_summary',
        'popular_features', 'champagne_images', 'transport_images',
        'after_spots', 'companion_spots', 'qa', 'staff_comment',
        'publish_status',
    ];

    protected $casts = [
        'back_items' => 'array',
        'fee_items' => 'array',
        'feature_tags' => 'array',
        'images' => 'array',
        'analysis' => 'array',
        'interview_info' => 'array',
        'required_documents' => 'array',
        'schedule' => 'array',
        'recent_hires' => 'array',
        'popular_features' => 'array',
        'champagne_images' => 'array',
        'transport_images' => 'array',
        'after_spots' => 'array',
        'companion_spots' => 'array',
        'qa' => 'array',
        'staff_comment' => 'array',
        'same_day_trial' => 'boolean',
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
