<?php

declare(strict_types=1);

namespace App\Http\Requests\Owner\Properties;

use App\Models\Owner;
use Illuminate\Foundation\Http\FormRequest;

class WithdrawPropertyVerificationRequest extends FormRequest
{
    public function authorize(): bool
    {
        $owner = $this->user('owner');

        return $owner instanceof Owner && $owner->canPublishProperties();
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'reason' => is_string($this->input('reason')) && trim($this->input('reason')) !== ''
                ? trim($this->input('reason'))
                : null,
        ]);
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'reason' => ['nullable', 'string', 'max:500'],
        ];
    }
}
