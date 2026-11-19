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
            'user_id' => ['sometimes', 'integer', 'exists:users,id'],
            'property_id' => ['sometimes', 'integer', 'exists:properties,id'],
            'status' => ['sometimes', Rule::in(ReservationStatus::values())],
            'stay_stage' => ['sometimes', 'string', Rule::in(['awaiting_arrival', 'checked_in', 'checked_out'])],
            'search' => ['sometimes', 'string', 'max:120'],
            'from' => ['sometimes', 'date'],
            'to' => ['sometimes', 'date', 'after_or_equal:from'],
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ];
    }
}
