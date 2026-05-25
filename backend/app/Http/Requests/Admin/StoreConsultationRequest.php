<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreConsultationRequest extends FormRequest
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
            'question' => 'required|string',
            'answer' => 'nullable|string',
            'tag' => 'string|max:100',
            'count' => 'integer',
            'visible' => 'boolean',
            'sort_order' => 'integer',
        ];
    }
}
