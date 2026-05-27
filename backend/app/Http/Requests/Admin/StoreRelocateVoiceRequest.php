<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreRelocateVoiceRequest extends FormRequest
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
            'area_from' => 'required|string|max:255',
            'area_to' => 'required|string|max:255',
            'body' => 'required|string',
            'visible' => 'boolean',
            'display_order' => 'integer',
        ];
    }
}
