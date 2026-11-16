<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin\Amenities;

use App\Models\Admin;
use App\Models\AmenityCategory;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAmenityCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        $admin = $this->user('admin');

        return $admin instanceof Admin && $admin->isActive() && $admin->hasPermission('amenities.assign');
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        $category = $this->route('category');
        $categoryId = $category instanceof AmenityCategory ? $category->id : $category;

        return [
            'code' => ['required', 'string', 'max:64', Rule::unique('amenity_categories', 'code')->ignore($categoryId)],
            'name' => ['required', 'string', 'max:120'],
            'slug' => ['required', 'string', 'max:140', Rule::unique('amenity_categories', 'slug')->ignore($categoryId)],
            'description' => ['nullable', 'string', 'max:2000'],
            'display_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
