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
            // max は 15MB。画像アップロードの上限を全 endpoint で統一 (nginx/PHP 20M 内)。
            // HEIC/HEIF (iPhone 標準) も許可。`image` ルールは getimagesize() が
            // HEIC 非対応で弾くため使わず、mimes で受けて MediaStorage で JPEG 変換。
            'image' => 'required|file|mimes:jpeg,jpg,png,webp,gif,heic,heif|max:15360',
        ];
    }
}
