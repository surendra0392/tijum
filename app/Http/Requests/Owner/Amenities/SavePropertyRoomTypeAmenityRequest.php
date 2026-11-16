<?php

declare(strict_types=1);

namespace App\Http\Requests\Owner\Amenities;

use App\Enums\AmenityAvailability;
use App\Models\Owner;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SavePropertyRoomTypeAmenityRequest extends FormRequest
{
    public function authorize(): bool
    {
        $owner = $this->user('owner');

        return $owner instanceof Owner && $owner->canPublishProperties();
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'details' => is_string($this->input('details')) && trim($this->input('details')) !== '' ? trim($this->input('details')) : null,
        ]);
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'property_room_type_id' => ['required', 'integer', 'exists:property_room_types,id'],
            'amenity_id' => ['required', 'integer', 'exists:amenities,id'],
            'availability' => ['required', Rule::enum(AmenityAvailability::class)],
            'is_customer_visible' => ['sometimes', 'boolean'],
            'details' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
