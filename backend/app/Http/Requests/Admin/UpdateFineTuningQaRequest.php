<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateFineTuningQaRequest extends FormRequest
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
            'category' => 'sometimes|nullable|string|max:100',
            'question' => 'sometimes|required|string',
            'answer' => 'sometimes|required|string',
            'tags' => 'sometimes|nullable|array',
            'tags.*' => 'string|max:50',
            'source' => 'sometimes|nullable|string|max:50',
            'status' => 'sometimes|nullable|in:active,draft,archived',
        ];
    }
}
