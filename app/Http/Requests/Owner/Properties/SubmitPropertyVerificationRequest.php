<?php

declare(strict_types=1);

namespace App\Http\Requests\Owner\Properties;

use App\Models\Owner;
use Illuminate\Foundation\Http\FormRequest;

class SubmitPropertyVerificationRequest extends FormRequest
{
    public function authorize(): bool
    {
        $owner = $this->user('owner');

        return $owner instanceof Owner && $owner->canPublishProperties();
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'declaration_accepted' => ['accepted'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'declaration_accepted.accepted' => 'You must confirm accuracy of property details, room inventory, photographs, and legal authority before submitting.',
        ];
    }
}
