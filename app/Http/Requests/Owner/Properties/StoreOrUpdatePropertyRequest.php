<?php

declare(strict_types=1);

namespace App\Http\Requests\Owner\Properties;

use App\Enums\AccommodationCategory;
use App\Enums\PropertyOwnershipArrangement;
use App\Models\Owner;
use App\Models\PropertyCategory;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class StoreOrUpdatePropertyRequest extends FormRequest
{
    public function authorize(): bool
    {
        $owner = $this->user('owner');

        return $owner instanceof Owner && $owner->canPublishProperties();
    }

    protected function prepareForValidation(): void
    {
        $trim = static fn (mixed $value): ?string => is_string($value) && trim($value) !== ''
            ? trim($value)
            : null;

        $email = $trim($this->input('contact_email'));

        $catInput = $this->input('property_category_id') ?? $this->input('category_id') ?? $this->input('category');
        if (is_string($catInput) && ! is_numeric($catInput)) {
            $enum = AccommodationCategory::tryFromLegacy($catInput);
            $slug = $enum?->value ?? $catInput;
            $catId = PropertyCategory::query()->where('slug', $slug)->value('id');
            if ($catId !== null) {
                $this->merge(['property_category_id' => $catId]);
            }
        } elseif ($this->filled('category_id') && ! $this->filled('property_category_id')) {
            $this->merge(['property_category_id' => (int) $this->input('category_id')]);
        }

        $this->merge([
            'name' => $trim($this->input('name')),
            'description' => $trim($this->input('description')),
            'contact_person_name' => $trim($this->input('contact_person_name')),
            'contact_phone' => $trim($this->input('contact_phone')),
            'contact_email' => $email !== null ? Str::lower($email) : null,
            'address_line_1' => $trim($this->input('address_line_1')),
            'address_line_2' => $trim($this->input('address_line_2')),
            'locality' => $trim($this->input('locality')),
            'landmark' => $trim($this->input('landmark')),
            'postal_code' => $trim($this->input('postal_code')),
            'latitude' => $trim($this->input('latitude')),
            'longitude' => $trim($this->input('longitude')),
            'ownership_arrangement' => $trim($this->input('ownership_arrangement'))
                ?? PropertyOwnershipArrangement::OwnerOperator->value,
        ]);
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'property_category_id' => [
                'required',
                'integer',
                Rule::exists('property_categories', 'id')->where('is_active', true),
            ],
            'city_id' => [
                'required',
                'integer',
                Rule::exists('cities', 'id')->where('is_active', true),
            ],
            'name' => ['required', 'string', 'min:3', 'max:180'],
            'description' => ['required', 'string', 'min:20', 'max:2500'],
            'contact_person_name' => ['required', 'string', 'max:150'],
            'contact_phone' => ['required', 'string', 'max:32', 'regex:/^\+?(?:[\s\-()]*[0-9]){7,15}[\s\-()]*$/'],
            'contact_email' => ['nullable', 'string', 'email', 'max:255'],
            'address_line_1' => ['required', 'string', 'max:255'],
            'address_line_2' => ['nullable', 'string', 'max:255'],
            'locality' => ['required', 'string', 'max:120'],
            'landmark' => ['nullable', 'string', 'max:160'],
            'postal_code' => ['required', 'string', 'max:20', 'regex:/^[A-Za-z0-9\s\-]{3,16}$/'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'ownership_arrangement' => ['required', Rule::enum(PropertyOwnershipArrangement::class)],
        ];
    }
}
