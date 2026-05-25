<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

/**
 * 並び替えエンドポイント (areas/reorder, categories/reorder) 共通の入力。
 * ids: 並び順を表す ID 配列。0 番目を sort_order=0 に当てる仕様。
 */
class ReorderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'ids' => 'required|array',
            'ids.*' => 'integer',
        ];
    }
}
