<?php

declare(strict_types=1);

namespace App\Http\Requests\Owner\Properties;

use App\Enums\PropertyRoomStatus;
use App\Models\Owner;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePropertyRoomStatusRequest extends FormRequest
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
            'operational_status' => ['required', Rule::enum(PropertyRoomStatus::class)],
            'description' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
