<?php

declare(strict_types=1);

namespace App\Http\Requests\Owner\Onboarding;

use App\Models\Owner;
use Illuminate\Foundation\Http\FormRequest;

class SubmitVerificationApplicationRequest extends FormRequest
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
            'declaration_accepted' => ['required', 'accepted'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'declaration_accepted.accepted' => 'You must confirm the partner verification declaration before submitting.',
        ];
    }
}
