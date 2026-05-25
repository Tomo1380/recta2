<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreAreaRequest extends FormRequest
{
    public function authorize(): bool
    {
        // admin-only ルート (sanctum + admin middleware) の中なので、
        // controller の手前で既に弾かれている前提。
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:255|unique:areas,slug',
            'visible' => 'boolean',
            'sort_order' => 'integer',
        ];
    }
}
