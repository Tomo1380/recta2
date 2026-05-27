<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UploadMediaRequest extends FormRequest
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
            // 5MB 上限はフロントの圧縮ロジック次第で見直す。とりあえず 10MB に。
            'image' => 'required|image|mimes:jpeg,jpg,png,webp,gif|max:10240',
        ];
    }
}
