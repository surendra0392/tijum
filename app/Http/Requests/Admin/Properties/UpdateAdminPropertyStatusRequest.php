<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin\Properties;

use App\Enums\PropertyOperationalStatus;
use App\Models\Admin;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAdminPropertyStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        $admin = $this->user('admin');
        if (! $admin instanceof Admin || ! $admin->isActive()) {
            return false;
        }

        $target = (string) $this->input('status');
        if ($target === PropertyOperationalStatus::Suspended->value) {
            return $admin->hasPermission('properties.suspend');
        }

        return $admin->hasPermission('properties.manage_status') || $admin->hasPermission('properties.suspend');
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'reason' => is_string($this->input('reason')) && trim($this->input('reason')) !== ''
                ? trim($this->input('reason'))
                : null,
        ]);
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'status' => ['required', Rule::enum(PropertyOperationalStatus::class)],
            'reason' => [
                $this->input('status') === PropertyOperationalStatus::Suspended->value ? 'required' : 'nullable',
                'string',
                'min:10',
                'max:1000',
            ],
        ];
    }
}
