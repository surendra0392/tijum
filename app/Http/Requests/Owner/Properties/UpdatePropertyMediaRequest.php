<?php

declare(strict_types=1);

namespace App\Http\Requests\Owner\Properties;

use App\Enums\PropertyMediaCategory;
use App\Models\Owner;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePropertyMediaRequest extends FormRequest
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
        ]);
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'alt_text' => ['required', 'string', 'min:3', 'max:255'],
            'media_type' => ['sometimes', Rule::enum(PropertyMediaCategory::class)],
            'is_cover' => ['sometimes', 'boolean'],
        ];
    }
}
