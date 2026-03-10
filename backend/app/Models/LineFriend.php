<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LineFriend extends Model
{
    protected $fillable = [
        'user_id',
        'line_user_id',
        'display_name',
        'picture_url',
        'followed_at',
        'unfollowed_at',
        'is_following',
    ];

    protected $casts = [
        'is_following' => 'boolean',
        'followed_at' => 'datetime',
        'unfollowed_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(LineMessage::class, 'line_user_id', 'line_user_id');
    }
}
