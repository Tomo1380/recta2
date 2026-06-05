<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

/**
 * 管理者による口コミ更新（本文/評価/表示名/フィーチャー/店側返答 B4/ステータス）。
 */
class UpdateReviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'rating' => ['sometimes', 'integer', 'between:1,5'],
            'body' => ['sometimes', 'string', 'min:1', 'max:2000'],
            'author_name' => ['sometimes', 'nullable', 'string', 'max:60'],
            'is_featured' => ['sometimes', 'boolean'],
            'status' => ['sometimes', 'in:published,unpublished,deleted'],
            'store_reply' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ];
    }
}
