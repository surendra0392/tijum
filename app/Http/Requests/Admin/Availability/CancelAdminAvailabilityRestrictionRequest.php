<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin\Availability;

use App\Models\Admin;
use Illuminate\Foundation\Http\FormRequest;

class CancelAdminAvailabilityRestrictionRequest extends FormRequest
{
    public function authorize(): bool
    {
        $admin = $this->user('admin');

        return $admin instanceof Admin && (
            $admin->role->isSuperAdmin()
            || $admin->hasPermission('availability.manage_restrictions')
            || $admin->hasPermission('pricing.manage_restrictions')
        );
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
