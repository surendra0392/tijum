<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreCommissionAgreementRequest extends FormRequest
{
    public function authorize(): bool
    {
        $admin = $this->user('admin');

        return $admin !== null && $admin->hasPermission('commissions.manage');
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'owner_id' => ['required', 'integer', 'exists:owners,id'],
            'property_id' => ['nullable', 'integer', 'exists:properties,id'],
            'commission_rate_bps' => ['required', 'integer', 'min:100', 'max:5000'], // 1.00% to 50.00%
            'commission_base_type' => ['required', 'string', 'in:gross_booking_amount,net_accommodation_amount'],
            'commission_gst_type' => ['required', 'string', 'in:exclusive,inclusive,exempt'],
            'effective_from' => ['required', 'date'],
            'effective_until' => ['nullable', 'date', 'after:effective_from'],
            'admin_notes' => ['nullable', 'string', 'max:1000'],
            'send_for_acceptance' => ['boolean'],
        ];
    }
}
