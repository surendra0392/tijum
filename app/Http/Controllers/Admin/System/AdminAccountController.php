<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\System;

use App\Enums\AdminRole;
use App\Http\Controllers\Controller;
use App\Models\Admin;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class AdminAccountController extends Controller
{
    private function resolveAdmin(Request $request): Admin
    {
        $admin = $request->user('admin');
        if (! $admin instanceof Admin) {
            abort(401);
        }
        if (! $admin->isSuperAdmin()) {
            abort(403, 'Unauthorized to manage admin accounts.');
        }

        return $admin;
    }

    public function index(Request $request): Response
    {
        $currentAdmin = $this->resolveAdmin($request);

        $search = trim($request->string('search')->toString());
        $roleFilter = trim($request->string('role')->toString());
        $statusFilter = trim($request->string('status')->toString());

        $query = Admin::query()->latest('created_at');

        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($roleFilter !== '' && in_array($roleFilter, AdminRole::values(), true)) {
            $query->where('role', $roleFilter);
        }

        if ($statusFilter === 'active') {
            $query->where('is_active', true);
        } elseif ($statusFilter === 'inactive') {
            $query->where('is_active', false);
        }

        $admins = $query->paginate(15)->withQueryString()->through(fn (Admin $a) => [
            'id' => $a->id,
            'name' => $a->name,
            'email' => $a->email,
            'role' => $a->role?->value ?? 'property_verification',
            'role_label' => $a->role?->label() ?? 'Staff',
            'is_active' => (bool) $a->is_active,
            'two_factor_enabled' => $a->hasTwoFactorEnabled(),
            'is_current' => $a->id === $currentAdmin->id,
            'created_at' => $a->created_at?->format('M d, Y'),
        ]);

        return Inertia::render('admin/system/admins/index', [
            'admins' => $admins,
            'filters' => [
                'search' => $search,
                'role' => $roleFilter,
                'status' => $statusFilter,
            ],
            'roles' => array_map(fn (AdminRole $r) => [
                'value' => $r->value,
                'label' => $r->label(),
            ], AdminRole::cases()),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->resolveAdmin($request);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:admins,email'],
            'role' => ['required', Rule::enum(AdminRole::class)],
            'password' => ['required', 'string', Password::defaults()],
        ]);

        Admin::create([
            'name' => $validated['name'],
            'email' => strtolower($validated['email']),
            'role' => $validated['role'],
            'password' => Hash::make($validated['password']),
            'is_active' => true,
        ]);

        return back()->with('status', 'Admin account created successfully.');
    }

    public function update(Request $request, Admin $admin): RedirectResponse
    {
        $currentAdmin = $this->resolveAdmin($request);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('admins', 'email')->ignore($admin->id)],
            'role' => ['required', Rule::enum(AdminRole::class)],
            'is_active' => ['required', 'boolean'],
            'password' => ['nullable', 'string', Password::defaults()],
        ]);

        // Safety: Cannot deactivate own account or demote self from SuperAdmin
        if ($admin->id === $currentAdmin->id) {
            if (! $validated['is_active']) {
                return back()->withErrors(['is_active' => 'You cannot deactivate your own admin account.']);
            }
            if ($validated['role'] !== AdminRole::SuperAdmin->value) {
                return back()->withErrors(['role' => 'You cannot change your own Super Admin role.']);
            }
        }

        $admin->name = $validated['name'];
        $admin->email = strtolower($validated['email']);
        $admin->role = AdminRole::from($validated['role']);
        $admin->is_active = (bool) $validated['is_active'];

        if (! empty($validated['password'])) {
            $admin->password = Hash::make($validated['password']);
        }

        $admin->save();

        return back()->with('status', 'Admin account updated successfully.');
    }

    public function toggleStatus(Request $request, Admin $admin): RedirectResponse
    {
        $currentAdmin = $this->resolveAdmin($request);

        if ($admin->id === $currentAdmin->id) {
            return back()->withErrors(['error' => 'You cannot toggle the active status of your own account.']);
        }

        $admin->is_active = ! $admin->is_active;
        $admin->save();

        $action = $admin->is_active ? 'activated' : 'deactivated';

        return back()->with('status', "Admin account {$action} successfully.");
    }

    public function resetTwoFactor(Request $request, Admin $admin): RedirectResponse
    {
        $this->resolveAdmin($request);

        $admin->two_factor_secret = null;
        $admin->two_factor_recovery_codes = null;
        $admin->two_factor_confirmed_at = null;
        $admin->save();

        return back()->with('status', "Two-factor authentication reset for {$admin->name}.");
    }
}
