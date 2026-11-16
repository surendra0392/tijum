<?php

declare(strict_types=1);

namespace App\Http\Requests\Reservations;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

class CustomerCancelReservationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() instanceof User;
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'cancellation_reason' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
