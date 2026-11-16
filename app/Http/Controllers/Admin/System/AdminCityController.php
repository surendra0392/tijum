<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\System;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\City;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AdminCityController extends Controller
{
    private function resolveAdmin(Request $request): Admin
    {
        $admin = $request->user('admin');
        if (! $admin instanceof Admin) {
            abort(401);
        }
        if (! $admin->isSuperAdmin()) {
            abort(403, 'Unauthorized to manage cities.');
        }

        return $admin;
    }

    public function index(Request $request): Response
    {
        $this->resolveAdmin($request);

        $search = trim($request->string('search')->toString());
        $statusFilter = trim($request->string('status')->toString());

        $query = City::query()
            ->withCount('properties')
            ->orderBy('sort_order')
            ->orderBy('name');

        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('state', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%");
            });
        }

        if ($statusFilter === 'active') {
            $query->where('is_active', true);
        } elseif ($statusFilter === 'inactive') {
            $query->where('is_active', false);
        }

        $cities = $query->paginate(20)->withQueryString()->through(fn (City $c) => [
            'id' => $c->id,
            'name' => $c->name,
            'slug' => $c->slug,
            'state' => $c->state,
            'state_code' => $c->state_code,
            'country_code' => $c->country_code,
            'is_active' => (bool) $c->is_active,
            'sort_order' => (int) $c->sort_order,
            'properties_count' => (int) $c->properties_count,
            'created_at' => $c->created_at?->format('M d, Y'),
        ]);

        return Inertia::render('admin/system/cities/index', [
            'cities' => $cities,
            'filters' => [
                'search' => $search,
                'status' => $statusFilter,
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->resolveAdmin($request);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'slug' => ['nullable', 'string', 'max:100', 'unique:cities,slug'],
            'state' => ['required', 'string', 'max:100'],
            'state_code' => ['nullable', 'string', 'max:10'],
            'country_code' => ['nullable', 'string', 'max:10'],
            'is_active' => ['required', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $slug = ! empty($validated['slug'])
            ? Str::slug($validated['slug'])
            : Str::slug($validated['name']);

        City::create([
            'name' => $validated['name'],
            'slug' => $slug,
            'state' => $validated['state'],
            'state_code' => ! empty($validated['state_code']) ? strtoupper($validated['state_code']) : null,
            'country_code' => ! empty($validated['country_code']) ? strtoupper($validated['country_code']) : 'IN',
            'is_active' => (bool) $validated['is_active'],
            'sort_order' => (int) ($validated['sort_order'] ?? 0),
        ]);

        return back()->with('status', "City '{$validated['name']}' created successfully.");
    }

    public function update(Request $request, City $city): RedirectResponse
    {
        $this->resolveAdmin($request);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'slug' => ['required', 'string', 'max:100', Rule::unique('cities', 'slug')->ignore($city->id)],
            'state' => ['required', 'string', 'max:100'],
            'state_code' => ['nullable', 'string', 'max:10'],
            'country_code' => ['nullable', 'string', 'max:10'],
            'is_active' => ['required', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $city->update([
            'name' => $validated['name'],
            'slug' => Str::slug($validated['slug']),
            'state' => $validated['state'],
            'state_code' => ! empty($validated['state_code']) ? strtoupper($validated['state_code']) : null,
            'country_code' => ! empty($validated['country_code']) ? strtoupper($validated['country_code']) : 'IN',
            'is_active' => (bool) $validated['is_active'],
            'sort_order' => (int) ($validated['sort_order'] ?? 0),
        ]);

        return back()->with('status', "City '{$city->name}' updated successfully.");
    }

    public function toggleStatus(Request $request, City $city): RedirectResponse
    {
        $this->resolveAdmin($request);

        $city->is_active = ! $city->is_active;
        $city->save();

        $state = $city->is_active ? 'activated' : 'deactivated';

        return back()->with('status', "City '{$city->name}' {$state} successfully.");
    }

    public function destroy(Request $request, City $city): RedirectResponse
    {
        $this->resolveAdmin($request);

        if ($city->properties()->exists()) {
            return back()->withErrors([
                'error' => "Cannot delete city '{$city->name}' because it has active properties linked to it. You can deactivate it instead.",
            ]);
        }

        $cityName = $city->name;
        $city->delete();

        return back()->with('status', "City '{$cityName}' deleted successfully.");
    }
}
