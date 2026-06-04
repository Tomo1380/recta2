<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UploadStoreImageRequest extends FormRequest
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
        // HEIC/HEIF (iPhone 標準) も受け付ける。`image` ルールは getimagesize()
        // ベースで HEIC を画像と認識せず弾いてしまうため使わず、mimes で許可する
        // (HEIC はアップロード後に MediaStorage が JPEG へ変換する)。
        return [
            'image' => 'required|file|mimes:jpg,jpeg,png,webp,heic,heif|max:5120',
        ];
    }
}
