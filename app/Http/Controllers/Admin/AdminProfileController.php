<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class AdminProfileController extends Controller
{
    private function resolveAdmin(Request $request): Admin
    {
        $admin = $request->user('admin');
        if (! $admin instanceof Admin) {
            abort(401);
        }

        return $admin;
    }

    public function edit(Request $request): Response
    {
        $admin = $this->resolveAdmin($request);

        return Inertia::render('admin/profile', [
            'admin' => $admin->toPortalArray(),
            'status' => $request->session()->get('status'),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $admin = $this->resolveAdmin($request);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                Rule::unique('admins', 'email')->ignore($admin->id),
            ],
        ]);

        $admin->fill($validated)->save();

        return back()->with('status', 'profile-updated');
    }

    public function updatePassword(Request $request): RedirectResponse
    {
        $admin = $this->resolveAdmin($request);

        $passwordRule = Password::default() ?? Password::min(8);

        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', $passwordRule, 'confirmed'],
        ]);

        if (! Hash::check($validated['current_password'], $admin->password)) {
            return back()->withErrors([
                'current_password' => 'The provided password does not match your current password.',
            ]);
        }

        $admin->forceFill([
            'password' => Hash::make($validated['password']),
        ])->save();

        return back()->with('status', 'password-updated');
    }
}
