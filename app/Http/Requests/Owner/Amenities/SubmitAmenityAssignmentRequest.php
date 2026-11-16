<?php

declare(strict_types=1);

namespace App\Http\Requests\Owner\Amenities;

use App\Models\Owner;
use Illuminate\Foundation\Http\FormRequest;

class SubmitAmenityAssignmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        $owner = $this->user('owner');

        return $owner instanceof Owner && $owner->canPublishProperties();
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'declaration_accepted' => ['accepted'],
        ];
    }
}
