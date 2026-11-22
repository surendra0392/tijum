<?php

declare(strict_types=1);

namespace App\Http\Requests\Reviews;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

class UpdatePropertyReviewRequest extends FormRequest
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
}
