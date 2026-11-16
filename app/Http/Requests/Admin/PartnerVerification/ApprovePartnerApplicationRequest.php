<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin\PartnerVerification;

use App\Models\Admin;
use Illuminate\Foundation\Http\FormRequest;

class ApprovePartnerApplicationRequest extends FormRequest
{
    public function authorize(): bool
    {
        $admin = $this->user('admin');

        return $admin instanceof Admin
            && $admin->isActive()
            && $admin->hasTwoFactorEnabled()
            && $admin->hasPermission('partners.approve');
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'decision_reason' => ['nullable', 'string', 'max:2000'],
            'internal_reviewer_notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
