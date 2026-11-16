<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin\PartnerVerification;

use App\Models\Admin;
use Illuminate\Foundation\Http\FormRequest;

class RejectPartnerApplicationRequest extends FormRequest
{
    public function authorize(): bool
    {
        $admin = $this->user('admin');

        return $admin instanceof Admin
            && $admin->isActive()
            && $admin->hasTwoFactorEnabled()
            && $admin->hasPermission('partners.reject');
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'decision_reason' => ['required', 'string', 'min:10', 'max:2000'],
            'internal_reviewer_notes' => ['nullable', 'string', 'max:2000'],
            'document_notes' => ['nullable', 'array'],
            'document_notes.*' => ['nullable', 'string', 'max:500'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'decision_reason.required' => 'A documented rejection reason is required before declining a partner verification application.',
            'decision_reason.min' => 'The documented rejection reason must be at least 10 characters.',
        ];
    }
}
