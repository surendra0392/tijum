<?php

declare(strict_types=1);

namespace App\Http\Requests\Owner\Availability;

use App\Enums\PropertyAvailabilityBlockScope;
use App\Enums\PropertyAvailabilityBlockType;
use App\Models\Owner;
use App\Models\Property;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreatePropertyAvailabilityBlockRequest extends FormRequest
{
    public function authorize(): bool
    {
        $owner = $this->user('owner');
        $property = $this->route('property');

        if (! $owner instanceof Owner || ! $owner->canPublishProperties()) {
            return false;
        }

        if ($property instanceof Property) {
            return $property->owner_id === $owner->id;
        }

        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'reason' => is_string($this->input('reason')) && trim($this->input('reason')) !== '' ? trim($this->input('reason')) : null,
        ]);
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'scope' => ['required', Rule::enum(PropertyAvailabilityBlockScope::class)],
            'block_type' => ['required', Rule::enum(PropertyAvailabilityBlockType::class)],
            'property_room_type_id' => ['nullable', 'integer', 'exists:property_room_types,id'],
            'property_room_id' => ['nullable', 'integer', 'exists:property_rooms,id'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'reason' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
