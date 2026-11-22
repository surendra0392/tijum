<?php

declare(strict_types=1);

namespace App\Http\Requests\Owner\Properties;

use App\Enums\PropertyVerificationDocumentType;
use App\Models\Owner;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UploadPropertyVerificationDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        $owner = $this->user('owner') ?? $this->user();

        return $owner instanceof Owner && $owner->canPublishProperties();
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        $maxKb = (int) config('tijum.property_verification.max_document_kb', 10240);

        return [
            'document_type' => ['required', Rule::enum(PropertyVerificationDocumentType::class)],
            'document' => [
                'required',
                'file',
                'max:'.$maxKb,
                'mimes:pdf,jpg,jpeg,png',
                'mimetypes:application/pdf,image/jpeg,image/png',
            ],
        ];
    }
}
