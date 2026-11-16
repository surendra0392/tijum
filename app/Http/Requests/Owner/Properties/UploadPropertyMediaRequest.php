<?php

declare(strict_types=1);

namespace App\Http\Requests\Owner\Properties;

use App\Enums\PropertyMediaCategory;
use App\Models\Owner;
use App\Models\Property;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UploadPropertyMediaRequest extends FormRequest
{
    public function authorize(): bool
    {
        $owner = $this->user('owner');

        return $owner instanceof Owner && $owner->canPublishProperties();
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'alt_text' => is_string($this->input('alt_text')) ? trim($this->input('alt_text')) : null,
            'property_room_type_id' => $this->filled('property_room_type_id') ? (int) $this->input('property_room_type_id') : null,
            'property_room_id' => $this->filled('property_room_id') ? (int) $this->input('property_room_id') : null,
            'replaces_media_id' => $this->filled('replaces_media_id') ? (int) $this->input('replaces_media_id') : null,
        ]);
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        $maxKb = (int) config('tijum.property_media.max_image_kb', 8192);
        $property = $this->route('property');
        $propertyId = $property instanceof Property ? $property->id : 0;

        return [
            'image' => [
                'required',
                'file',
                'max:'.$maxKb,
                'mimes:jpg,jpeg,png,webp',
                'mimetypes:image/jpeg,image/png,image/webp',
            ],
            'media_type' => ['required', Rule::enum(PropertyMediaCategory::class)],
            'alt_text' => ['required', 'string', 'min:3', 'max:255'],
            'property_room_type_id' => [
                'nullable',
                'integer',
                Rule::exists('property_room_types', 'id')->where('property_id', $propertyId),
            ],
            'property_room_id' => [
                'nullable',
                'integer',
                Rule::exists('property_rooms', 'id')->where('property_id', $propertyId),
            ],
            'is_cover' => ['sometimes', 'boolean'],
            'replaces_media_id' => [
                'nullable',
                'integer',
                Rule::exists('property_media', 'id')->where('property_id', $propertyId),
            ],
        ];
    }
}
