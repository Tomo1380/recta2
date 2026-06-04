<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class ReorderStoreImagesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * `order` は現在の images の index を新しい並び順で列挙した配列。
     * 例: 3 枚を [2, 0, 1] にすると「3枚目→1枚目→2枚目」の順になる。
     * 値の妥当性 (0..n-1 の順列であること) は Service 側で検証する。
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'order' => 'required|array|min:1',
            'order.*' => 'required|integer|min:0',
        ];
    }
}
