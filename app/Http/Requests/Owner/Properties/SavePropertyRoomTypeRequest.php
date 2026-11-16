<?php

declare(strict_types=1);

namespace App\Http\Requests\Owner\Properties;

use App\Enums\PropertyGenderPolicy;
use App\Enums\PropertyGuestComposition;
use App\Enums\PropertyRoomTypeMode;
use App\Models\Owner;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SavePropertyRoomTypeRequest extends FormRequest
{
    public function authorize(): bool
    {
        $owner = $this->user('owner');

        return $owner instanceof Owner && $owner->canPublishProperties();
    }

    protected function prepareForValidation(): void
    {
        $mode = is_string($this->input('accommodation_mode'))
            ? trim($this->input('accommodation_mode'))
            : '';

        $this->merge([
            'name' => is_string($this->input('name')) ? trim($this->input('name')) : null,
            'description' => is_string($this->input('description')) && trim($this->input('description')) !== ''
                ? trim($this->input('description'))
                : null,
            'sharing_capacity' => $mode === PropertyRoomTypeMode::Private->value
                ? null
                : ($this->filled('sharing_capacity') ? (int) $this->input('sharing_capacity') : null),
            'max_guests_per_room' => $mode === PropertyRoomTypeMode::Private->value
                ? ($this->filled('max_guests_per_room') ? (int) $this->input('max_guests_per_room') : 1)
                : ($this->filled('sharing_capacity') ? (int) $this->input('sharing_capacity') : (int) $this->input('max_guests_per_room', 0)),
        ]);
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        $mode = PropertyRoomTypeMode::tryFrom((string) $this->input('accommodation_mode'));
        $isPrivate = $mode === PropertyRoomTypeMode::Private;

        return [
            'name' => ['required', 'string', 'min:3', 'max:150'],
            'accommodation_mode' => ['required', Rule::enum(PropertyRoomTypeMode::class)],
            'sharing_capacity' => $isPrivate
                ? ['nullable']
                : ['required', 'integer', Rule::in([2, 3, 4])],
            'max_guests_per_room' => $isPrivate
                ? ['required', 'integer', 'min:1', 'max:1']
                : ['required', 'integer', Rule::in([2, 3, 4])],
            'is_air_conditioned' => ['required', 'boolean'],
            'gender_policy' => ['required', Rule::enum(PropertyGenderPolicy::class)],
            'guest_composition_policy' => ['required', 'array', 'min:1'],
            'guest_composition_policy.*' => ['required', Rule::enum(PropertyGuestComposition::class)],
            'early_check_in_enabled' => ['required', 'boolean'],
            'description' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['sometimes', 'boolean'],
            'display_order' => ['sometimes', 'integer', 'min:0', 'max:500'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'max_guests_per_room.max' => 'Single Room configurations are strictly limited to 1 guest per room.',
        ];
    }
}
