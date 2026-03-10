<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory;

    protected $fillable = [
        'line_user_id',
        'line_display_name',
        'line_picture_url',
        'line_access_token',
        'line_refresh_token',
        'line_token_expires_at',
        'nickname',
        'age',
        'preferred_area',
        'preferred_category',
        'experience',
        'bio',
        'status',
        'last_login_at',
    ];

    protected $hidden = [
        'line_access_token',
        'line_refresh_token',
    ];

    protected $casts = [
        'last_login_at' => 'datetime',
        'line_token_expires_at' => 'datetime',
    ];

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function lineFriend(): HasOne
    {
        return $this->hasOne(LineFriend::class);
    }
}
