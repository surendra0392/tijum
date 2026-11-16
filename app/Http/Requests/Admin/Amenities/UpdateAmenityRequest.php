<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin\Amenities;

use App\Enums\AmenityApplicabilityScope;
use App\Models\Admin;
use App\Models\Amenity;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAmenityRequest extends FormRequest
{
    public function authorize(): bool
    {
        $admin = $this->user('admin');

        return $admin instanceof Admin && $admin->isActive() && $admin->hasPermission('amenities.assign');
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        $amenity = $this->route('amenity');
        $amenityId = $amenity instanceof Amenity ? $amenity->id : $amenity;

        return [
            'amenity_category_id' => ['required', 'integer', 'exists:amenity_categories,id'],
            'code' => ['required', 'string', 'max:80', Rule::unique('amenities', 'code')->ignore($amenityId)],
            'name' => ['required', 'string', 'max:150'],
            'slug' => ['required', 'string', 'max:180', Rule::unique('amenities', 'slug')->ignore($amenityId)],
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
