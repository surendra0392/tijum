<?php

declare(strict_types=1);

namespace App\Http\Requests\Protection;

use Illuminate\Foundation\Http\FormRequest;

class CreateRelocationOfferRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user('admin') !== null;
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'destination_property_id' => ['required', 'integer', 'exists:properties,id'],
            'destination_room_type_id' => ['required', 'integer', 'exists:property_room_types,id'],
            'destination_owner_accepted' => ['nullable', 'boolean'],
            'admin_notes' => ['nullable', 'string', 'max:1000'],
            'validity_hours' => ['nullable', 'integer', 'min:1', 'max:72'],
        ];
    }
}
