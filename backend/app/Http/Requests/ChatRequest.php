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
            // コスト・濫用対策の最終防衛線（フロントの maxLength と揃える）。
            'message' => 'required|string|max:500',
            'page_type' => 'required|in:top,list,detail',
            'store_id' => 'nullable|integer',
            // 履歴は最大20件・各発話2000字まで。実際に prompt へ渡すのは
            // buildGeminiHistory 側で直近 N 件にさらに絞る。
            'history' => 'nullable|array|max:20',
            'history.*.role' => 'nullable|string|max:20',
            'history.*.content' => 'nullable|string|max:2000',
            'user_area' => 'nullable|string|max:100',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'message.required' => 'メッセージを入力してください。',
            'message.max' => 'メッセージが長すぎます。:max 文字以内で入力してください。',
            'history.max' => '会話が長くなりすぎました。新しい会話を始めてください。',
            'history.*.content.max' => '会話の内容が長すぎます。新しい会話を始めてください。',
        ];
    }
}
