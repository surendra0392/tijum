<?php

declare(strict_types=1);

namespace App\Http\Requests\Protection;

use App\Enums\CaseStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AddCaseMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user('web') !== null
            || $this->user('owner') !== null
            || $this->user('admin') !== null;
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'message' => ['required', 'string', 'min:1', 'max:3000'],
            'attachment' => ['nullable', 'file', 'max:5120', 'mimes:jpeg,jpg,png,webp,pdf'],
            'is_internal_note' => ['nullable', 'boolean'],
            'status' => ['nullable', 'string', Rule::in(CaseStatus::values())],
        ];
    }
}
