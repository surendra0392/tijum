<?php

declare(strict_types=1);

namespace App\Http\Requests\Owner\Availability;

use App\Models\Owner;
use App\Models\Property;
use Illuminate\Foundation\Http\FormRequest;

class CancelPropertyAvailabilityBlockRequest extends FormRequest
{
    public function authorize(): bool
    {
        $owner = $this->user('owner');
        $property = $this->route('property');

        if (! $owner instanceof Owner || ! $owner->canPublishProperties()) {
            return false;
        }

        if ($property instanceof Property) {
            return $property->owner_id === $owner->id;
        }

        return true;
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'reason' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
