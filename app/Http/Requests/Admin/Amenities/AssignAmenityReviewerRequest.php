<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin\Amenities;

use App\Models\Admin;
use Illuminate\Foundation\Http\FormRequest;

class AssignAmenityReviewerRequest extends FormRequest
{
    public function authorize(): bool
    {
        $admin = $this->user('admin');

        return $admin instanceof Admin && $admin->isActive() && $admin->hasPermission('amenities.assign');
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'assigned_admin_id' => ['required', 'integer', 'exists:admins,id'],
        ];
    }
}
