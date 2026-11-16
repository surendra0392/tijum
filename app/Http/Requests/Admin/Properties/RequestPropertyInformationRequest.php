<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin\Properties;

use App\Models\Admin;
use Illuminate\Foundation\Http\FormRequest;

class RequestPropertyInformationRequest extends FormRequest
{
    public function authorize(): bool
    {
        $admin = $this->user('admin');

        return $admin instanceof Admin
            && $admin->isActive()
            && $admin->hasPermission('properties.request_information');
    }

    protected function prepareForValidation(): void
    {
        $trim = static fn (mixed $v): ?string => is_string($v) && trim($v) !== '' ? trim($v) : null;

        $this->merge([
            'requested_information' => $trim($this->input('requested_information')),
            'internal_reviewer_notes' => $trim($this->input('internal_reviewer_notes')),
        ]);
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'requested_information' => ['required', 'string', 'min:10', 'max:2000'],
            'internal_reviewer_notes' => ['nullable', 'string', 'max:2000'],
            'rejected_document_notes' => ['nullable', 'array'],
            'rejected_document_notes.*' => ['nullable', 'string', 'max:500'],
            'rejected_media_notes' => ['nullable', 'array'],
            'rejected_media_notes.*' => ['nullable', 'string', 'max:500'],
        ];
    }
}
