<?php

declare(strict_types=1);

namespace App\Http\Requests\Owner\Auth;

use App\Models\City;
use App\Models\Owner;
use App\Models\PropertyCategory;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $phone = $this->input('phone') ?? $this->input('mobile');
        $email = $this->input('email');

        // Resolve city/location
        $cityInput = $this->input('city_id') ?? $this->input('location') ?? $this->input('city');
        $resolvedCityId = null;
        if (is_numeric($cityInput)) {
            $resolvedCityId = (int) $cityInput;
        } elseif (is_string($cityInput) && trim($cityInput) !== '') {
            $resolvedCityId = City::query()
                ->where('slug', Str::slug($cityInput))
                ->orWhere('name', 'like', trim($cityInput))
                ->value('id');
        }

        // Resolve canonical category
        $categoryInput = $this->input('property_category_id') ?? $this->input('property_type') ?? $this->input('category');
        $resolvedCategoryId = null;
        if (is_numeric($categoryInput)) {
            $resolvedCategoryId = (int) $categoryInput;
        } elseif (is_string($categoryInput) && trim($categoryInput) !== '') {
            $catSlug = Str::slug($categoryInput);
            if (in_array($catSlug, ['hostel', 'hostels', 'pg', 'pgs', 'hostels-pg', 'hostel-pg', 'independent-hostel', 'pg-accommodation'], true)) {
                $catSlug = 'hostels-pg';
            } elseif (in_array($catSlug, ['homestay', 'homestays'], true)) {
                $catSlug = 'homestays';
            } elseif (in_array($catSlug, ['coliving', 'co-living', 'community-living'], true)) {
                $catSlug = 'co-living';
            }
            $resolvedCategoryId = PropertyCategory::query()->where('slug', $catSlug)->value('id');
        }

        $this->merge([
            'email' => Str::lower(trim((string) $email)),
            'phone' => is_string($phone) && trim($phone) !== '' ? trim($phone) : null,
            'city_id' => $resolvedCityId ?? $cityInput,
            'property_category_id' => $resolvedCategoryId ?? $categoryInput,
            'property_name' => $this->input('property_name') ?? $this->input('propertyName'),
            'locality' => $this->input('locality') ?? $this->input('area'),
            'available_for' => $this->input('available_for') ?? $this->input('gender_policy') ?? 'both',
        ]);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $activeCityIds = City::query()->where('is_active', true)->pluck('id')->all();
        $activeCategoryIds = PropertyCategory::query()->where('is_active', true)->pluck('id')->all();

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', Rule::unique(Owner::class, 'email')],
            'phone' => ['required', 'string', 'max:20', 'regex:/^[+0-9\s\-()]{7,20}$/', Rule::unique(Owner::class, 'phone')],
            'password' => ['required', 'string', 'confirmed', Password::defaults()],
            'property_name' => ['required', 'string', 'max:255'],
            'property_category_id' => ['required', 'integer', Rule::in($activeCategoryIds)],
            'available_for' => ['required', 'string', Rule::in(['male', 'female', 'both', 'all_genders', 'male_only', 'female_only'])],
            'city_id' => ['required', 'integer', Rule::in($activeCityIds)],
            'locality' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'terms' => ['required', 'accepted'],
        ];
    }
}
