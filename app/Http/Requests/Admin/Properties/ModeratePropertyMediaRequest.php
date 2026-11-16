<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin\Properties;

use App\Enums\PropertyMediaModerationStatus;
use App\Models\Admin;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ModeratePropertyMediaRequest extends FormRequest
{
    public function authorize(): bool
    {
        $admin = $this->user('admin');

        return $admin instanceof Admin
            && $admin->isActive()
            && $admin->hasPermission('properties.review');
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'moderation_note' => is_string($this->input('moderation_note')) && trim($this->input('moderation_note')) !== ''
                ? trim($this->input('moderation_note'))
                : null,
        ]);
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'moderation_status' => [
                'required',
                Rule::in([
                    PropertyMediaModerationStatus::Approved->value,
                    PropertyMediaModerationStatus::Rejected->value,
                ]),
            ],
            'moderation_note' => [
                $this->input('moderation_status') === PropertyMediaModerationStatus::Rejected->value ? 'required' : 'nullable',
                'string',
                'max:500',
            ],
        ];
    }
}
