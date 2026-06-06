<?php

namespace App\Http\Requests\Tracking;

use Illuminate\Foundation\Http\FormRequest;

/**
 * 公開 PV ビーコンの入力。すべて任意（無名の append-only ログ）。
 */
class TrackPageViewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'page_type' => ['nullable', 'string', 'max:32'],
            'store_id' => ['nullable', 'integer', 'exists:stores,id'],
            'article_id' => ['nullable', 'integer', 'exists:articles,id'],
            'area' => ['nullable', 'string', 'max:64'],
            'path' => ['nullable', 'string', 'max:1024'],
            'session_id' => ['nullable', 'string', 'max:64'],
        ];
    }
}
