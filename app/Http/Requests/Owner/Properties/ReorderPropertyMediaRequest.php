<?php

declare(strict_types=1);

namespace App\Http\Requests\Owner\Properties;

use App\Models\Owner;
use Illuminate\Foundation\Http\FormRequest;

class ReorderPropertyMediaRequest extends FormRequest
{
    public function authorize(): bool
    {
        $owner = $this->user('owner');

        return $owner instanceof Owner && $owner->canPublishProperties();
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'media_ids' => ['required', 'array', 'min:1'],
            'media_ids.*' => ['required', 'integer', 'min:1'],
        ];
    }
}
