<?php

declare(strict_types=1);

namespace App\Http\Requests\Owner\Onboarding;

use App\Enums\OwnerVerificationDocumentType;
use App\Models\Owner;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UploadVerificationDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        $owner = $this->user('owner');

        return $owner instanceof Owner && $owner->canSignIn();
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        $maxKb = (int) config('tijum.owner_verification.max_document_kb', 10240);

        return [
            'document_type' => ['required', Rule::enum(OwnerVerificationDocumentType::class)],
            'document' => [
                'required',
                'file',
                'mimes:pdf,jpg,jpeg,png',
                'mimetypes:application/pdf,image/jpeg,image/png',
                "max:{$maxKb}",
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'document.mimes' => 'Only PDF, JPG, JPEG, and PNG documents are accepted.',
            'document.mimetypes' => 'The uploaded file content must be a valid PDF, JPEG, or PNG document.',
            'document.max' => 'Each verification document must not exceed 10 MB.',
        ];
    }
}
