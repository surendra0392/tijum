<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin\Amenities;

use App\Enums\AmenityApplicabilityScope;
use App\Models\Admin;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAmenityRequest extends FormRequest
{
    public function authorize(): bool
    {
        $admin = $this->user('admin');

        return $admin instanceof Admin && $admin->isActive() && $admin->hasPermission('amenities.assign');
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'amenity_category_id' => ['required', 'integer', 'exists:amenity_categories,id'],
            'code' => ['required', 'string', 'max:80', 'unique:amenities,code'],
            'name' => ['required', 'string', 'max:150'],
            'slug' => ['required', 'string', 'max:180', 'unique:amenities,slug'],
            'description' => ['nullable', 'string', 'max:2000'],
            'applicability_scope' => ['required', Rule::enum(AmenityApplicabilityScope::class)],
            'icon_key' => ['nullable', 'string', 'max:80'],
            'is_customer_visible' => ['sometimes', 'boolean'],
            'requires_review' => ['sometimes', 'boolean'],
            'display_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
