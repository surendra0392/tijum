<?php

declare(strict_types=1);

namespace App\Http\Requests\Reviews;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

class StorePropertyReviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() instanceof User;
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        $maxChars = (int) config('tijum.reviews.max_content_length', 3000);

        return [
            'overall_rating' => ['required', 'integer', 'between:1,5'],
            'cleanliness_rating' => ['nullable', 'integer', 'between:1,5'],
            'food_quality_rating' => ['nullable', 'integer', 'between:1,5'],
            'communication_rating' => ['nullable', 'integer', 'between:1,5'],
            'value_rating' => ['nullable', 'integer', 'between:1,5'],
            'title' => ['nullable', 'string', 'max:150'],
            'content' => ['nullable', 'string', "max:{$maxChars}"],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'overall_rating.required' => 'Please select an overall rating between 1 and 5 stars.',
            'overall_rating.between' => 'The overall rating must be between 1 and 5 stars.',
            'cleanliness_rating.between' => 'Cleanliness rating must be between 1 and 5 stars.',
            'food_quality_rating.between' => 'Food quality rating must be between 1 and 5 stars.',
            'communication_rating.between' => 'Host communication rating must be between 1 and 5 stars.',
            'value_rating.between' => 'Value for money rating must be between 1 and 5 stars.',
            'title.max' => 'Review title cannot exceed 150 characters.',
            'content.max' => 'Written review content cannot exceed :max characters.',
        ];
    }
}
