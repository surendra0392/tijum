<?php

declare(strict_types=1);

namespace App\Http\Requests\Owner;

use Illuminate\Foundation\Http\FormRequest;

class UpdateFinancialProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user('owner') !== null;
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'legal_business_name' => ['required', 'string', 'max:255'],
            'business_constitution' => ['required', 'string', 'in:individual,proprietorship,partnership,llp,private_limited'],
            'pan_number' => ['required', 'string', 'regex:/^[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}$/'],
            'gst_registered' => ['required', 'boolean'],
            'gstin' => ['nullable', 'required_if:gst_registered,true', 'string', 'max:20'],
            'supplier_legal_classification' => ['required', 'string', 'in:unregistered,regular,composition'],
            'bank_beneficiary_name' => ['required', 'string', 'max:255'],
            'bank_account_number' => ['required', 'string', 'min:9', 'max:18'],
            'bank_ifsc' => ['required', 'string', 'regex:/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/'],
            'bank_name' => ['required', 'string', 'max:255'],
        ];
    }
}
