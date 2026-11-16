<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin\Availability;

use App\Enums\PropertyAvailabilityBlockScope;
use App\Enums\PropertyAvailabilityBlockType;
use App\Models\Admin;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateAdminAvailabilityRestrictionRequest extends FormRequest
{
    public function authorize(): bool
    {
        $admin = $this->user('admin');

        return $admin instanceof Admin && $admin->hasPermission('availability.manage_restrictions');
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
