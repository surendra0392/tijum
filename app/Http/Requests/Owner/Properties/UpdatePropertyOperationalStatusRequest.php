<?php

declare(strict_types=1);

namespace App\Http\Requests\Owner\Properties;

use App\Enums\PropertyOperationalStatus;
use App\Models\Owner;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePropertyOperationalStatusRequest extends FormRequest
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
            'status' => [
                'required',
                Rule::in([
                    PropertyOperationalStatus::Active->value,
                    PropertyOperationalStatus::TemporarilyClosed->value,
                    PropertyOperationalStatus::Archived->value,
                ]),
            ],
            'redirect_to_index' => ['sometimes', 'boolean'],
        ];
    }
}
