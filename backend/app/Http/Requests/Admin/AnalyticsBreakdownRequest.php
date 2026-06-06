<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

/**
 * ランキング行のドリルダウン（画面別内訳）の入力。
 * GET クエリ: type=store|column|area, key=ID または エリア名, days=7|30|90|365。
 */
class AnalyticsBreakdownRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type' => ['required', 'in:store,column,area'],
            'key' => ['required', 'string', 'max:120'],
            'days' => ['nullable', 'in:7,30,90,365'],
        ];
    }
}
