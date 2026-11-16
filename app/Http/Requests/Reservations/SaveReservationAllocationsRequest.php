<?php

declare(strict_types=1);

namespace App\Http\Requests\Reservations;

use App\Models\Owner;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveReservationAllocationsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user('owner') instanceof Owner;
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'allocations' => ['present', 'array', 'max:100'],
            'allocations.*.property_room_id' => ['required', 'integer', 'distinct', Rule::exists('property_rooms', 'id')],
            'allocations.*.allocated_quantity' => ['required', 'integer', 'min:1'],
        ];
    }
}
