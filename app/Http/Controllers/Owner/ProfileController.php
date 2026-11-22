<?php

declare(strict_types=1);

namespace App\Http\Controllers\Owner;

use App\Enums\OwnerStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Owner\PasswordUpdateRequest;
use App\Http\Requests\Owner\ProfileUpdateRequest;
use App\Models\Owner;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    public function edit(Request $request): Response
    {
        return Inertia::render('owner/profile', [
            'status' => $request->session()->get('status'),
        ]);
    }

    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        /** @var Owner $owner */
        $owner = $request->user('owner');

        /** @var array{name: string, email: string, phone: string|null} $validated */
        $validated = $request->validated();

        $emailChanged = $validated['email'] !== $owner->email;

        $owner->fill([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'],
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

        return redirect()
            ->route('owner.profile.edit')
            ->with('status', $emailChanged ? 'profile-updated-verify-email' : 'profile-updated');
    }

    public function updatePassword(PasswordUpdateRequest $request): RedirectResponse
    {
        /** @var Owner $owner */
        $owner = $request->user('owner');

        $owner->update([
            'password' => $request->string('password')->toString(),
        ]);

        $owner->tokens()->delete();

        return redirect()
            ->route('owner.profile.edit')
            ->with('status', 'password-updated');
    }
}
