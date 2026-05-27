<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateRelocateVoiceRequest extends FormRequest
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
            'area_from' => 'string|max:255',
            'area_to' => 'string|max:255',
            'body' => 'string',
            'visible' => 'boolean',
            'display_order' => 'integer',
        ];
    }
}
