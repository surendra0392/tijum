<?php

declare(strict_types=1);

namespace App\Http\Requests\Public;

use App\Models\City;
use App\Models\PropertyCategory;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class PropertySearchRequest extends FormRequest
{
    private const MAX_GUESTS = 20;

    private const MAX_DURATION_COUNT = 30;

    private const MAX_ARRAY_ITEMS = 20;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $intent = $this->queryHasIntent();
        $cityIds = City::query()->where('is_active', true)->pluck('id')->all();
        $categoryIds = PropertyCategory::query()->where('is_active', true)->pluck('id')->all();

        $requiredIfIntent = $intent ? ['required'] : ['nullable'];

        return [
            'city' => array_merge($requiredIfIntent, ['integer', Rule::in($cityIds)]),
            'locality' => ['nullable', 'string', 'max:120'],
            'location_label' => ['nullable', 'string', 'max:300'],
            'check_in' => array_merge($requiredIfIntent, ['date_format:Y-m-d']),
            'duration_type' => array_merge($requiredIfIntent, ['string', Rule::in(['daily', 'weekly', 'monthly'])]),
            'duration_count' => array_merge($requiredIfIntent, ['integer', 'min:1', 'max:'.self::MAX_DURATION_COUNT]),
            'guests' => array_merge($requiredIfIntent, ['integer', 'min:1', 'max:'.self::MAX_GUESTS]),
            'category' => ['nullable', 'array', 'max:3'],
            'category.*' => ['integer', 'distinct', Rule::in($categoryIds)],
            'gender_preference' => ['nullable', 'string', Rule::in(['male', 'female', 'both', 'all', 'any'])],
            'sharing_capacity' => ['nullable', 'array', 'max:4'],
            'sharing_capacity.*' => ['integer', 'distinct', Rule::in([1, 2, 3, 4])],
            'ac' => ['nullable', 'array', 'max:2'],
            'ac.*' => ['string', 'distinct', Rule::in(['ac', 'non_ac'])],
            'food_meals' => ['nullable', 'array', 'max:3'],
            'food_meals.*' => ['string', 'distinct', Rule::in(['breakfast', 'lunch', 'dinner'])],
            'amenities' => ['nullable', 'array', 'max:'.self::MAX_ARRAY_ITEMS],
            'amenities.*' => ['integer', 'distinct', 'min:1'],
            'min_price' => ['nullable', 'integer', 'min:0'],
            'max_price' => ['nullable', 'integer', 'min:0'],
            'min_rating' => ['nullable', 'numeric', 'min:1', 'max:5'],
            'early_check_in' => ['nullable', 'boolean'],
            'sort' => ['nullable', 'string', Rule::in(['relevant', 'price_asc', 'price_desc', 'recent', 'highest_rated', 'distance_asc', 'distance_desc'])],
            'lat' => ['nullable', 'numeric', 'between:-90,90'],
            'lng' => ['nullable', 'numeric', 'between:-180,180'],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $checkIn = $this->input('check_in');
            if ($this->queryHasIntent() && is_string($checkIn) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $checkIn) === 1) {
                try {
                    $date = CarbonImmutable::createFromFormat('Y-m-d', $checkIn, (string) config('tijum.pricing.timezone', 'Asia/Kolkata'));
                    $today = CarbonImmutable::now((string) config('tijum.pricing.timezone', 'Asia/Kolkata'))->startOfDay();
                    if (! $date instanceof CarbonImmutable || $date->startOfDay()->lt($today)) {
                        $validator->errors()->add('check_in', 'Select a check-in date that is today or later.');
                    }
                } catch (\Throwable) {
                    $validator->errors()->add('check_in', 'Enter a valid check-in date.');
                }
            }

            $min = $this->input('min_price');
            $max = $this->input('max_price');
            if (is_numeric($min) && is_numeric($max) && (int) $min > (int) $max) {
                $validator->errors()->add('min_price', 'Minimum price cannot be greater than maximum price.');
            }
        });
    }

    protected function prepareForValidation(): void
    {
        $normalizeArray = function (string $key): void {
            $value = $this->input($key);
            if ($value === null || $value === '') {
                return;
            }
            if (is_string($value)) {
                $value = array_filter(explode(',', $value), static fn (string $v): bool => $v !== '');
            }
            if (is_array($value)) {
                $this->merge([$key => array_values($value)]);
            }
        };

        foreach (['category', 'sharing_capacity', 'ac', 'food_meals', 'amenities'] as $key) {
            $normalizeArray($key);
        }

        if ($this->has('category')) {
            $catInput = $this->input('category');
            if ($catInput !== null && $catInput !== '') {
                $rawList = is_array($catInput) ? $catInput : explode(',', (string) $catInput);
                $normalizedIds = [];

                $legacySlugMap = [
                    'independent-hostel' => 'hostels-pg',
                    'independent-hostels' => 'hostels-pg',
                    'pg-accommodation' => 'hostels-pg',
                    'pg-accommodations' => 'hostels-pg',
                    'hostel' => 'hostels-pg',
                    'hostels' => 'hostels-pg',
                    'pg' => 'hostels-pg',
                    'pgs' => 'hostels-pg',
                    'hostels-pg' => 'hostels-pg',
                    'hostel-pg' => 'hostels-pg',
                    'homestay' => 'homestays',
                    'homestays' => 'homestays',
                    'co-living' => 'co-living',
                    'coliving' => 'co-living',
                    'hotel' => 'hostels-pg',
                    'hotels' => 'hostels-pg',
                    'lodge' => 'hostels-pg',
                    'lodges' => 'hostels-pg',
                    'guest-house' => 'hostels-pg',
                    'guest-houses' => 'hostels-pg',
                ];

                foreach ($rawList as $item) {
                    if (is_numeric($item)) {
                        $normalizedIds[] = (int) $item;
                    } elseif (is_string($item)) {
                        $slug = strtolower(trim($item));
                        $targetSlug = $legacySlugMap[$slug] ?? $slug;
                        $id = PropertyCategory::query()->where('slug', $targetSlug)->value('id');
                        if ($id !== null) {
                            $normalizedIds[] = (int) $id;
                        }
                    }
                }

                $this->merge(['category' => array_values(array_unique($normalizedIds))]);
            }
        }

        if ($this->has('early_check_in')) {
            $this->merge([
                'early_check_in' => filter_var($this->input('early_check_in'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? $this->boolean('early_check_in'),
            ]);
        }

        // Resolve city slug to ID and default intent fields when city is passed
        if ($this->has('city')) {
            $cityInput = $this->input('city');
            $cityId = null;
            if (is_numeric($cityInput)) {
                $cityId = (int) $cityInput;
            } elseif (is_string($cityInput) && trim($cityInput) !== '') {
                $cityId = City::query()
                    ->where('slug', strtolower(trim($cityInput)))
                    ->orWhere('name', 'like', trim($cityInput))
                    ->value('id');
            }

            if ($cityId !== null) {
                $today = CarbonImmutable::now((string) config('tijum.pricing.timezone', 'Asia/Kolkata'))->toDateString();
                $merges = ['city' => $cityId];

                if (! $this->filled('check_in')) {
                    $merges['check_in'] = $today;
                }
                if (! $this->filled('duration_type')) {
                    $merges['duration_type'] = 'daily';
                }
                if (! $this->filled('duration_count')) {
                    $merges['duration_count'] = 1;
                }
                if (! $this->filled('guests')) {
                    $merges['guests'] = 1;
                }

                $this->merge($merges);
            }
        }

        if ($this->has('gender_preference')) {
            $gender = strtolower(trim((string) $this->input('gender_preference')));
            $normalizedGender = match ($gender) {
                'male', 'male_only' => 'male',
                'female', 'female_only' => 'female',
                'both' => 'both',
                'all', 'any', 'all_genders' => 'all',
                default => 'all',
            };
            $this->merge(['gender_preference' => $normalizedGender]);
        }
    }

    private function queryHasIntent(): bool
    {
        return $this->query->has('city')
            || $this->query->has('check_in')
            || $this->query->has('duration_type')
            || $this->query->has('guests');
    }

    public function hasSearchIntent(): bool
    {
        return $this->filled('city')
            && $this->filled('check_in')
            && $this->filled('duration_type')
            && $this->filled('duration_count')
            && $this->filled('guests')
            && ($this->validator === null || ! $this->validator->fails());
    }

    /**
     * @return array<string, mixed>
     */
    public function searchFilters(): array
    {
        $validated = $this->validated();

        return [
            'city' => (int) $validated['city'],
            'locality' => isset($validated['locality']) && is_string($validated['locality']) && trim($validated['locality']) !== '' ? trim($validated['locality']) : null,
            'check_in' => (string) $validated['check_in'],
            'duration_type' => (string) $validated['duration_type'],
            'duration_count' => (int) ($validated['duration_count'] ?? 1),
            'guests' => (int) $validated['guests'],
            'category' => array_map('intval', $validated['category'] ?? []),
            'gender_preference' => $validated['gender_preference'] ?? 'all',
            'sharing_capacity' => array_map('intval', $validated['sharing_capacity'] ?? []),
            'ac' => $validated['ac'] ?? [],
            'food_meals' => $validated['food_meals'] ?? [],
            'amenities' => array_map('intval', $validated['amenities'] ?? []),
            'min_price' => isset($validated['min_price']) ? (int) $validated['min_price'] : null,
            'max_price' => isset($validated['max_price']) ? (int) $validated['max_price'] : null,
            'min_rating' => isset($validated['min_rating']) ? (float) $validated['min_rating'] : null,
            'early_check_in' => (bool) ($validated['early_check_in'] ?? false),
            'sort' => $validated['sort'] ?? 'relevant',
            'lat' => isset($validated['lat']) ? (float) $validated['lat'] : null,
            'lng' => isset($validated['lng']) ? (float) $validated['lng'] : null,
            'page' => (int) ($validated['page'] ?? 1),
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'city.required' => 'Select a launch city to search for accommodation.',
            'city.in' => 'Select one of the active TIJUM launch cities.',
            'check_in.required' => 'Select a check-in date.',
            'duration_type.required' => 'Select a stay duration.',
            'duration_type.in' => 'Stay duration must be daily, weekly, or monthly.',
            'guests.required' => 'Enter the number of guests.',
        ];
    }
}
