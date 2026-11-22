<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class CreateSettlementRequest extends FormRequest
{
    public function authorize(): bool
    {
        $admin = $this->user('admin');

        return $admin !== null && $admin->hasPermission('settlements.manage');
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'owner_id' => ['required', 'integer', 'exists:owners,id'],
            'reservation_ids' => ['nullable', 'array'],
            'reservation_ids.*' => ['integer', 'exists:reservations,id'],
            'period_start' => ['nullable', 'date'],
            'period_end' => ['nullable', 'date'],
        ];
    }
}
