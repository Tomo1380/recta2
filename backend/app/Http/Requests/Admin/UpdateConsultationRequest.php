<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateConsultationRequest extends FormRequest
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
            'question' => 'sometimes|string',
            'answer' => 'sometimes|nullable|string',
            'tag' => 'sometimes|string|max:100',
            'count' => 'sometimes|integer',
            'visible' => 'sometimes|boolean',
            'sort_order' => 'sometimes|integer',
        ];
    }
}
