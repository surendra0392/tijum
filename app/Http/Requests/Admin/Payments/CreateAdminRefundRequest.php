<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin\Payments;

use Illuminate\Foundation\Http\FormRequest;

class CreateAdminRefundRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user('admin') !== null;
    }

    protected function prepareForValidation(): void
    {
        $headerKey = $this->header('Idempotency-Key');

        if (! $this->has('idempotency_key') && is_string($headerKey)) {
            $this->merge([
                'idempotency_key' => trim($headerKey),
            ]);
        }
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'amount_minor' => ['required', 'integer', 'min:100'],
            'reason' => ['required', 'string', 'min:3', 'max:500'],
            'idempotency_key' => ['required', 'string', 'min:1', 'max:64'],
        ];
    }
}
