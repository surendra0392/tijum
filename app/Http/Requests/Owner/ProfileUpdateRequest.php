<?php

declare(strict_types=1);

namespace App\Http\Requests\Owner;

use App\Models\Owner;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ProfileUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user('owner') instanceof Owner;
    }

    protected function prepareForValidation(): void
    {
        $phone = $this->input('phone');

        $this->merge([
            'email' => Str::lower(trim((string) $this->input('email', ''))),
            'phone' => is_string($phone) ? trim($phone) : '',
        ]);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        /** @var Owner $owner */
        $owner = $this->user('owner');

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                Rule::unique(Owner::class, 'email')->ignore($owner->id),
            ],
            'phone' => [
                'required',
                'string',
                'max:20',
                'regex:/^[+0-9\s\-()]{7,20}$/',
                Rule::unique(Owner::class, 'phone')->ignore($owner->id),
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'phone.required' => 'A mobile number is mandatory for partner operations.',
            'phone.regex' => 'Please enter a valid mobile number (7 to 20 digits).',
            'phone.unique' => 'This mobile number is already registered to another partner.',
        ];
    }
}
