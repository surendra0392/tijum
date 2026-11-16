<?php

declare(strict_types=1);

namespace App\Http\Requests\Protection;

use App\Enums\CaseCategory;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReportProblemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user('web') !== null;
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'category' => ['required', 'string', Rule::in(CaseCategory::values())],
            'description' => ['required', 'string', 'min:10', 'max:3000'],
            'priority' => ['nullable', 'string', Rule::in(['standard', 'high', 'urgent'])],
            'attachment' => ['nullable', 'file', 'max:5120', 'mimes:jpeg,jpg,png,webp,pdf'],
        ];
    }
}
