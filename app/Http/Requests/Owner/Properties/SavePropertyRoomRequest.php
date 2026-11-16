<?php

declare(strict_types=1);

namespace App\Http\Requests\Owner\Properties;

use App\Enums\PropertyRoomStatus;
use App\Models\Owner;
use App\Models\Property;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SavePropertyRoomRequest extends FormRequest
{
    public function authorize(): bool
    {
        $owner = $this->user('owner');

        return $owner instanceof Owner && $owner->canPublishProperties();
    }

    protected function prepareForValidation(): void
    {
        $trim = static fn (mixed $v): ?string => is_string($v) && trim($v) !== '' ? trim($v) : null;

        $this->merge([
            'room_number' => $trim($this->input('room_number')),
            'floor_number' => $trim($this->input('floor_number')),
            'wing_name' => $trim($this->input('wing_name')),
            'building_name' => $trim($this->input('building_name')),
            'description' => $trim($this->input('description')),
            'operational_status' => $trim($this->input('operational_status')) ?? PropertyRoomStatus::Active->value,
        ]);
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        $property = $this->route('property');
        $propertyId = $property instanceof Property ? $property->id : 0;

        return [
            'property_room_type_id' => [
                'required',
                'integer',
                Rule::exists('property_room_types', 'id')->where('property_id', $propertyId),
            ],
            'room_number' => [
                'required',
                'string',
                'max:64',
                'regex:/^[A-Za-z0-9][A-Za-z0-9\-\/\s_]{0,62}$/',
            ],
            'floor_number' => ['nullable', 'string', 'max:32'],
            'wing_name' => ['nullable', 'string', 'max:80'],
            'building_name' => ['nullable', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:1000'],
            'operational_status' => ['required', Rule::enum(PropertyRoomStatus::class)],
        ];
    }
}
