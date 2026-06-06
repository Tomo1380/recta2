<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PickupShop extends Model
{
    protected $fillable = [
        'store_id',
        'sort_order',
        'visible',
    ];

    protected $casts = [
        'visible' => 'boolean',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
}
