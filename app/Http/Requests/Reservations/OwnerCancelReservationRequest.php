<?php

declare(strict_types=1);

namespace App\Http\Requests\Reservations;

use App\Models\Owner;
use Illuminate\Foundation\Http\FormRequest;

class OwnerCancelReservationRequest extends FormRequest
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
            'cancellation_reason' => ['required', 'string', 'max:1000'],
        ];
    }
}
