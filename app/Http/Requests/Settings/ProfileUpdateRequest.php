<?php

declare(strict_types=1);

namespace App\Http\Requests\Settings;

use App\Concerns\ProfileValidationRules;
use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;

class ProfileUpdateRequest extends FormRequest
{
    use ProfileValidationRules;

    public function authorize(): bool
    {
        return $this->user('web') instanceof User;
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        $name = $this->input('name');
        $email = $this->input('email');
        $phone = $this->input('phone');

        $payload = [];

        if (is_string($name)) {
            $payload['name'] = trim($name);
        }

        if (is_string($email)) {
            $trimmedEmail = trim($email);
            $payload['email'] = config('fortify.lowercase_usernames')
                ? Str::lower($trimmedEmail)
                : $trimmedEmail;
        }

        if ($this->has('phone')) {
            $payload['phone'] = is_string($phone) ? trim($phone) : '';
        }

        $this->merge($payload);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var User $user */
        $user = $this->user('web');

        $rules = [
            ...$this->profileRules($user->id),
        ];

        if ($this->has('phone')) {
            $rules['phone'] = $this->phoneRules();
        }

        return $rules;
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'phone.required' => 'A mobile phone number is required.',
            'phone.regex' => 'Please enter a valid international phone number (7 to 15 digits, optional leading + and spaces or hyphens).',
            'phone.max' => 'The phone number must not exceed 32 characters.',
        ];
    }
}
