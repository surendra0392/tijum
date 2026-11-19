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

    protected function prepareForValidation(): void
    {
        $classificationMap = [
            'unregistered_hostel' => 'unregistered',
            'homestay_individual' => 'unregistered',
            'registered_hotelier' => 'regular',
        ];

        $classification = (string) $this->input('supplier_legal_classification', '');
        if (isset($classificationMap[$classification])) {
            $this->merge([
                'supplier_legal_classification' => $classificationMap[$classification],
            ]);
        }

        if ($this->filled('bank_account_number_confirmation') === false) {
            $this->request->remove('bank_account_number_confirmation');
        }
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'legal_business_name' => ['required', 'string', 'max:255'],
            'business_constitution' => ['required', 'string', 'in:individual,proprietorship,partnership,llp,private_limited,trust_society'],
            'pan_number' => ['required', 'string', 'regex:/^[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}$/'],
            'gst_registered' => ['required', 'boolean'],
            'gstin' => ['nullable', 'required_if:gst_registered,true', 'string', 'max:20'],
            'supplier_legal_classification' => ['required', 'string', 'in:unregistered,regular,composition'],
            'bank_beneficiary_name' => ['required', 'string', 'max:255'],
            'bank_account_number' => ['required', 'string', 'min:9', 'max:18'],
            'bank_account_number_confirmation' => ['sometimes', 'string', 'same:bank_account_number'],
            'bank_ifsc' => ['required', 'string', 'regex:/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/'],
            'bank_name' => ['required', 'string', 'max:255'],
        ];
    }
}
