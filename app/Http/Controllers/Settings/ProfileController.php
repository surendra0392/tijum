<?php

declare(strict_types=1);

namespace App\Http\Controllers\Settings;

use App\Actions\Auth\LogoutPortalGuard;
use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileDeleteRequest;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Fortify\Features;

class ProfileController extends Controller
{
    /**
     * Show the customer's profile settings page.
     */
    public function edit(Request $request): Response
    {
        $user = $request->user('web');

        if (! $user instanceof User) {
            abort(403);
        }

        return Inertia::render('settings/profile', [
            'customer' => $user->toCustomerAccountArray(),
            'mustVerifyEmail' => Features::enabled(Features::emailVerification()),
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Update the customer's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $user = $request->user('web');

        if (! $user instanceof User) {
            abort(403);
        }

        /** @var array{name: string, email: string, phone?: string} $validated */
        $validated = $request->validated();

        $emailChanged = $validated['email'] !== $user->email;
        $phoneProvided = array_key_exists('phone', $validated);
        $phoneChanged = $phoneProvided && $validated['phone'] !== $user->phone;

        $user->fill([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $phoneProvided ? $validated['phone'] : $user->phone,
        ]);

        if ($emailChanged) {
            $user->email_verified_at = null;
        }

        if ($phoneChanged) {
            $user->phone_verified_at = null;
        }

        $user->save();

        if ($emailChanged) {
            $user->sendEmailVerificationNotification();
        }

        Inertia::flash('toast', [
            'type' => $emailChanged ? 'info' : 'success',
            'message' => $emailChanged
                ? __('Profile saved. Please verify your new email address.')
                : __('Profile updated.'),
        ]);

        return to_route('profile.edit')->with(
            'status',
            $emailChanged ? 'profile-updated-verify-email' : 'profile-updated',
        );
    }

    /**
     * Permanently delete the authenticated customer account without touching sibling portal guards.
     */
    public function destroy(ProfileDeleteRequest $request, LogoutPortalGuard $logoutPortalGuard): RedirectResponse
    {
        $user = $request->user('web');

        if (! $user instanceof User) {
            abort(403);
        }

        if ($user->reservations()->exists()) {
            throw ValidationException::withMessages([
                'password' => 'Accounts with reservation history cannot be deleted because booking records must be preserved.',
            ]);
        }

        $logoutPortalGuard->execute($request, 'web');

        $user->delete();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Your customer account has been deleted.'),
        ]);

        return to_route('home');
    }
}
