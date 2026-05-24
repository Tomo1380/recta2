<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StoreStaffPhoto extends Model
{
    protected $fillable = [
        'store_id',
        'image_url',
        'caption',
        'instagram_url',
        'staff_type',
        'display_order',
    ];

    protected $casts = [
        'display_order' => 'integer',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
}
