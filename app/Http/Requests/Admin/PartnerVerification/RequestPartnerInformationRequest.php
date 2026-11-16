<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin\PartnerVerification;

use App\Enums\OwnerVerificationDocumentType;
use App\Models\Admin;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RequestPartnerInformationRequest extends FormRequest
{
    public function authorize(): bool
    {
        $admin = $this->user('admin');

        return $admin instanceof Admin
            && $admin->isActive()
            && $admin->hasTwoFactorEnabled()
            && $admin->hasPermission('partners.request_information');
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'requested_information' => ['required', 'string', 'min:10', 'max:2000'],
            'required_profile_changes' => ['nullable', 'array'],
            'required_profile_changes.*' => ['required', 'string', 'max:120'],
            'required_document_types' => ['nullable', 'array'],
            'required_document_types.*' => ['required', Rule::enum(OwnerVerificationDocumentType::class)],
            'document_notes' => ['nullable', 'array'],
            'document_notes.*' => ['nullable', 'string', 'max:500'],
            'internal_reviewer_notes' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'requested_information.required' => 'Provide clear instructions explaining what additional information or corrections the owner must submit.',
            'requested_information.min' => 'Requested information instructions must be at least 10 characters.',
        ];
    }
}
