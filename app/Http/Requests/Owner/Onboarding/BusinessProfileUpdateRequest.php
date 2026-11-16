<?php

declare(strict_types=1);

namespace App\Http\Requests\Owner\Onboarding;

use App\Enums\OwnerEntityType;
use App\Models\Owner;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class BusinessProfileUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        $owner = $this->user('owner');

        return $owner instanceof Owner && $owner->canSignIn();
    }

    protected function prepareForValidation(): void
    {
        $trim = static fn (mixed $value): ?string => is_string($value) && trim($value) !== ''
            ? trim($value)
            : null;

        $email = $trim($this->input('business_email'));
        $country = $trim($this->input('country_code'));

        $this->merge([
            'entity_type' => $trim($this->input('entity_type')),
            'legal_business_name' => $trim($this->input('legal_business_name')),
            'display_business_name' => $trim($this->input('display_business_name')),
            'primary_contact_name' => $trim($this->input('primary_contact_name')),
            'primary_contact_designation' => $trim($this->input('primary_contact_designation')),
            'business_email' => $email !== null ? Str::lower($email) : null,
            'business_address_line_1' => $trim($this->input('business_address_line_1')),
            'business_address_line_2' => $trim($this->input('business_address_line_2')),
            'locality' => $trim($this->input('locality')),
            'postal_code' => $trim($this->input('postal_code')),
            'city' => $trim($this->input('city')),
            'state' => $trim($this->input('state')),
            'country_code' => $country !== null ? Str::upper($country) : 'IN',
            'website_url' => $trim($this->input('website_url')),
            'description' => $trim($this->input('description')),
        ]);
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        $entityType = OwnerEntityType::tryFrom((string) $this->input('entity_type'));
        $requiresLegalName = $entityType !== null && $entityType->requiresLegalBusinessName();

        return [
            'entity_type' => ['required', Rule::enum(OwnerEntityType::class)],
            'legal_business_name' => [
                $requiresLegalName ? 'required' : 'nullable',
                'string',
                'max:180',
            ],
            'display_business_name' => ['required', 'string', 'max:180'],
            'primary_contact_name' => ['required', 'string', 'max:150'],
            'primary_contact_designation' => ['nullable', 'string', 'max:120'],
            'business_email' => ['nullable', 'string', 'email', 'max:255'],
            'business_address_line_1' => ['required', 'string', 'max:255'],
            'business_address_line_2' => ['nullable', 'string', 'max:255'],
            'locality' => ['nullable', 'string', 'max:120'],
            'postal_code' => ['nullable', 'string', 'max:20', 'regex:/^[A-Za-z0-9\s\-]{3,16}$/'],
            'city' => ['required', 'string', 'max:120'],
            'state' => ['required', 'string', 'max:120'],
            'country_code' => ['required', 'string', 'size:2', 'regex:/^[A-Z]{2}$/'],
            'website_url' => ['nullable', 'string', 'max:255', 'url:http,https'],
            'description' => ['nullable', 'string', 'max:1500'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'legal_business_name.required' => 'Please enter the legal business name for your selected entity type.',
            'postal_code.regex' => 'Enter a valid postal code using 3 to 16 letters, digits, spaces, or hyphens.',
            'website_url.url' => 'Enter a valid http:// or https:// website URL.',
        ];
    }
}
