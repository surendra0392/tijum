<?php

declare(strict_types=1);

namespace App\Http\Requests\Owner\Onboarding;

use App\Models\Owner;
use Illuminate\Foundation\Http\FormRequest;

class WithdrawVerificationApplicationRequest extends FormRequest
{
    public function authorize(): bool
    {
        $owner = $this->user('owner');

        return $owner instanceof Owner && $owner->canSignIn();
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'reason' => ['nullable', 'string', 'max:500'],
        ];
    }
}
