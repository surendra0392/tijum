<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin\Amenities;

use App\Models\Admin;
use Illuminate\Foundation\Http\FormRequest;

class ApproveAmenityAssignmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        $admin = $this->user('admin');

        return $admin instanceof Admin && $admin->isActive() && $admin->hasPermission('amenities.approve');
    }

    protected function prepareForValidation(): void
    {
        $trim = static fn (mixed $v): ?string => is_string($v) && trim($v) !== '' ? trim($v) : null;
        $this->merge([
            'decision_reason' => $trim($this->input('decision_reason')),
            'internal_reviewer_notes' => $trim($this->input('internal_reviewer_notes')),
        ]);
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'decision_reason' => ['nullable', 'string', 'max:2000'],
            'internal_reviewer_notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
