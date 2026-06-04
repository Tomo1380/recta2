<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UploadCategoryImageRequest extends FormRequest
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
            // max は 15MB。画像アップロードの上限を全 endpoint で統一 (nginx/PHP 20M 内)。
            'image' => 'required|image|max:15360',
        ];
    }
}
