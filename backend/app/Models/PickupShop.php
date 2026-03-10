<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PickupShop extends Model
{
    protected $fillable = [
        'store_id',
        'sort_order',
        'is_pr',
        'visible',
    ];

    protected $casts = [
        'is_pr' => 'boolean',
        'visible' => 'boolean',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
}
