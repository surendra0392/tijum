<?php

declare(strict_types=1);

namespace App\Http\Requests\Reservations;

use App\Models\Property;
use App\Models\PropertyRoomType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class QuoteReservationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'property_id' => ['required', 'integer', Rule::exists(Property::class, 'id')],
            'property_room_type_id' => ['required', 'integer', Rule::exists(PropertyRoomType::class, 'id')->where('property_id', $this->input('property_id'))],
            'check_in_date' => ['required', 'date', 'after_or_equal:today'],
            'duration_type' => ['required', Rule::in(['daily', 'weekly', 'monthly'])],
            'duration_quantity' => ['required', 'integer', 'min:1', 'max:30'],
            'quantity' => ['required', 'integer', 'min:1', 'max:100'],
            'guest_count' => ['required', 'integer', 'min:1', 'max:100', 'same:quantity'],
            'early_check_in_requested' => ['sometimes', 'boolean'],
            'requested_arrival_time' => ['exclude_unless:early_check_in_requested,true', 'required', 'date_format:H:i'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $property = $this->route('property');

        if ($property instanceof Property) {
            $this->merge(['property_id' => $property->id]);
        }

        if (! $this->has('guest_count') && $this->has('quantity')) {
            $this->merge(['guest_count' => $this->input('quantity')]);
        }
    }

    /**
     * @return array<string, string>
     */
    public function validationAttributes(): array
    {
        return [
            'property_room_type_id' => 'room type',
        ];
    }
}
