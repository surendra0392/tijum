<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin\Properties;

use App\Models\Admin;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AssignPropertyReviewerRequest extends FormRequest
{
    public function authorize(): bool
    {
        $admin = $this->user('admin');

        return $admin instanceof Admin
            && $admin->isActive()
            && $admin->hasPermission('properties.assign');
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'assigned_admin_id' => [
                'required',
                'integer',
                Rule::exists('admins', 'id')->where('is_active', true),
            ],
        ];
    }
}
