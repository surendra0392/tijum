<?php

declare(strict_types=1);

namespace App\Http\Requests\Owner\Onboarding;

use App\Models\Owner;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class OperatingCitiesUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        $owner = $this->user('owner');

        return $owner instanceof Owner && $owner->canSignIn();
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'city_ids' => ['required', 'array', 'min:1'],
            'city_ids.*' => [
                'required',
                'integer',
                'distinct',
                Rule::exists('cities', 'id')->where('is_active', true),
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'city_ids.required' => 'Select at least one active TIJUM launch city where you plan to operate.',
            'city_ids.min' => 'Select at least one active TIJUM launch city where you plan to operate.',
            'city_ids.*.exists' => 'One or more selected cities are inactive or unavailable.',
        ];
    }
}
