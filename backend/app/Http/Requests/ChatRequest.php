<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * AIチャット (POST /chat, POST /chat/stream) の入力検証。
 *
 * chat() / chatStream() で同一ルールをインライン validate していたのを
 * FormRequest に集約 (アーキ原則: inline validate 禁止)。公開エンドポイントだが
 * 任意認証 (auth('sanctum')) なので authorize は常に true。
 */
class ChatRequest extends FormRequest
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
            'message' => 'required|string|max:1000',
            'page_type' => 'required|in:top,list,detail',
            'store_id' => 'nullable|integer',
            'history' => 'nullable|array|max:20',
            'user_area' => 'nullable|string|max:100',
        ];
    }
}
