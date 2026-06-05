<?php

namespace App\Http\Requests\Tracking;

use Illuminate\Foundation\Http\FormRequest;

/**
 * 公開 LINE 追加クリックビーコンの入力。すべて任意。
 */
class TrackLineClickRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'source' => ['nullable', 'string', 'max:64'],
            'page_type' => ['nullable', 'string', 'max:32'],
            'store_id' => ['nullable', 'integer', 'exists:stores,id'],
            'article_id' => ['nullable', 'integer', 'exists:articles,id'],
            'area' => ['nullable', 'string', 'max:64'],
            'session_id' => ['nullable', 'string', 'max:64'],
        ];
    }
}
