<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

/**
 * 管理者による口コミ作成（桜口コミ B2 / 有名キャバ嬢口コミ B3）。
 * 実ユーザーに紐付かないので author_name で表示名を指定する。
 */
class StoreReviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'store_id' => ['required', 'integer', 'exists:stores,id'],
            'rating' => ['required', 'integer', 'between:1,5'],
            'body' => ['required', 'string', 'min:1', 'max:2000'],
            'author_name' => ['nullable', 'string', 'max:60'],
            'is_featured' => ['nullable', 'boolean'],
            'status' => ['nullable', 'in:published,unpublished'],
            'store_reply' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
