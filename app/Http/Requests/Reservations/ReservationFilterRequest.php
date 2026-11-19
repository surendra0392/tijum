<?php

declare(strict_types=1);

namespace App\Http\Requests\Reservations;

use App\Enums\ReservationStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReservationFilterRequest extends FormRequest
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
            'user_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'property_id' => ['sometimes', 'nullable', 'integer', 'exists:properties,id'],
            'status' => ['sometimes', 'nullable', Rule::in(ReservationStatus::values())],
            'stay_stage' => [
                'sometimes',
                'nullable',
                'string',
                Rule::in([
                    'awaiting_arrival',
                    'needs_room',
                    'checked_in',
                    'checked_out',
                    'awaiting_payment',
                    'cancelled',
                ]),
            ],
            'search' => ['sometimes', 'nullable', 'string', 'max:120'],
            'from' => ['sometimes', 'nullable', 'date'],
            'to' => [
                'sometimes',
                'nullable',
                'date',
                Rule::when($this->filled('from'), ['after_or_equal:from']),
            ],
            'sort' => [
                'sometimes',
                'nullable',
                'string',
                Rule::in(['newest', 'check_in_asc', 'check_in_desc', 'amount_desc']),
            ],
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ];
    }
}
