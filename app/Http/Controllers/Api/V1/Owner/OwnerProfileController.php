<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Owner;

use App\Enums\OwnerStatus;
use App\Http\Controllers\Api\V1\ApiController;
use App\Http\Resources\Api\V1\OwnerProfileResource;
use App\Models\Owner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class OwnerProfileController extends ApiController
{
    public function show(Request $request): JsonResponse
    {
        /** @var Owner $owner */
        $owner = $request->user();

        return $this->success(new OwnerProfileResource($owner));
    }

    public function update(Request $request): JsonResponse
    {
        /** @var Owner $owner */
        $owner = $request->user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                Rule::unique(Owner::class, 'email')->ignore($owner->id),
            ],
            'phone' => [
                'nullable',
                'string',
                'max:20',
                'regex:/^[+0-9\s\-()]{7,20}$/',
                Rule::unique(Owner::class, 'phone')->ignore($owner->id),
            ],
        ]);

        $normalizedEmail = Str::lower(trim((string) $validated['email']));
        $emailChanged = $normalizedEmail !== Str::lower($owner->email);

        $owner->fill([
            'name' => $validated['name'],
            'email' => $normalizedEmail,
            'phone' => isset($validated['phone']) ? trim((string) $validated['phone']) : $owner->phone,
        ]);

        if ($emailChanged) {
            $owner->email_verified_at = null;

            if ($owner->status === OwnerStatus::PendingReview) {
                $owner->status = OwnerStatus::PendingVerification;
            }
        }

        $owner->save();

        if ($emailChanged) {
            $owner->sendEmailVerificationNotification();
        }

        return $this->success(
            new OwnerProfileResource($owner),
            $emailChanged ? 'Profile updated. Please verify your new email address.' : 'Profile updated successfully'
        );
    }

    public function updatePassword(Request $request): JsonResponse
    {
        /** @var Owner $owner */
        $owner = $request->user();

        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', Password::min(8), 'confirmed'],
        ]);

        if (! Hash::check($validated['current_password'], $owner->password)) {
            return $this->error('The provided current password does not match.', 'INVALID_PASSWORD', 422);
        }

        $owner->update([
            'password' => $validated['password'],
        ]);

        return $this->success(null, 'Password updated successfully');
    }
}
