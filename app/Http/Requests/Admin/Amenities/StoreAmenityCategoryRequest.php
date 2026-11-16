<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin\Amenities;

use App\Models\Admin;
use Illuminate\Foundation\Http\FormRequest;

class StoreAmenityCategoryRequest extends FormRequest
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
            'code' => ['required', 'string', 'max:64', 'unique:amenity_categories,code'],
            'name' => ['required', 'string', 'max:120'],
            'slug' => ['required', 'string', 'max:140', 'unique:amenity_categories,slug'],
            'description' => ['nullable', 'string', 'max:2000'],
            'display_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
