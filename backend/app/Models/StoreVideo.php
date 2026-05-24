<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StoreVideo extends Model
{
    protected $fillable = [
        'store_id',
        'video_url',
        'label',
        'description',
        'poster_url',
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
