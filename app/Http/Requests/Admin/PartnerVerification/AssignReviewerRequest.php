<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin\PartnerVerification;

use App\Enums\AdminRole;
use App\Models\Admin;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AssignReviewerRequest extends FormRequest
{
    public function authorize(): bool
    {
        $admin = $this->user('admin');

        return $admin instanceof Admin
            && $admin->isActive()
            && $admin->hasTwoFactorEnabled()
            && $admin->hasPermission('partners.assign');
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'assigned_admin_id' => [
                'nullable',
                'integer',
                Rule::exists('admins', 'id')
                    ->where('is_active', true)
                    ->whereIn('role', [
                        AdminRole::SuperAdmin->value,
                        AdminRole::PropertyVerification->value,
                    ]),
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'assigned_admin_id.exists' => 'Selected reviewer must be an active Super Admin or Property Verification administrator.',
        ];
    }
}
