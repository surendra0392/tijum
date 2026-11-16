<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\System;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\PropertyCategory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AdminCategoryController extends Controller
{
    private function resolveAdmin(Request $request): Admin
    {
        $admin = $request->user('admin');
        if (! $admin instanceof Admin) {
            abort(401);
        }
        if (! $admin->isSuperAdmin()) {
            abort(403, 'Unauthorized to manage categories.');
        }

        return $admin;
    }

    public function index(Request $request): Response
    {
        $this->resolveAdmin($request);

        $search = trim($request->string('search')->toString());
        $statusFilter = trim($request->string('status')->toString());

        $query = PropertyCategory::query()
            ->withCount('properties')
            ->orderBy('sort_order')
            ->orderBy('name');

        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%");
            });
        }

        if ($statusFilter === 'active') {
            $query->where('is_active', true);
        } elseif ($statusFilter === 'inactive') {
            $query->where('is_active', false);
        }

        $categories = $query->paginate(20)->withQueryString()->through(fn (PropertyCategory $c) => [
            'id' => $c->id,
            'name' => $c->name,
            'slug' => $c->slug,
            'code' => $c->code,
            'description' => $c->description,
            'is_active' => (bool) $c->is_active,
            'sort_order' => (int) $c->sort_order,
            'properties_count' => (int) $c->properties_count,
            'is_canonical' => in_array($c->slug, PropertyCategory::CANONICAL_SLUGS, true),
            'created_at' => $c->created_at?->format('M d, Y'),
        ]);

        return Inertia::render('admin/system/categories/index', [
            'categories' => $categories,
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
            'slug' => ['nullable', 'string', 'max:100', 'unique:property_categories,slug'],
            'code' => ['required', 'string', 'max:50', 'unique:property_categories,code'],
            'description' => ['nullable', 'string', 'max:500'],
            'is_active' => ['required', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $slug = ! empty($validated['slug'])
            ? Str::slug($validated['slug'])
            : Str::slug($validated['name']);

        PropertyCategory::create([
            'name' => $validated['name'],
            'slug' => $slug,
            'code' => Str::slug($validated['code'], '_'),
            'description' => $validated['description'] ?? null,
            'is_active' => (bool) $validated['is_active'],
            'sort_order' => (int) ($validated['sort_order'] ?? 0),
        ]);

        return back()->with('status', "Category '{$validated['name']}' created successfully.");
    }

    public function update(Request $request, PropertyCategory $category): RedirectResponse
    {
        $this->resolveAdmin($request);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'slug' => ['required', 'string', 'max:100', Rule::unique('property_categories', 'slug')->ignore($category->id)],
            'code' => ['required', 'string', 'max:50', Rule::unique('property_categories', 'code')->ignore($category->id)],
            'description' => ['nullable', 'string', 'max:500'],
            'is_active' => ['required', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $category->update([
            'name' => $validated['name'],
            'slug' => Str::slug($validated['slug']),
            'code' => Str::slug($validated['code'], '_'),
            'description' => $validated['description'] ?? null,
            'is_active' => (bool) $validated['is_active'],
            'sort_order' => (int) ($validated['sort_order'] ?? 0),
        ]);

        return back()->with('status', "Category '{$category->name}' updated successfully.");
    }

    public function toggleStatus(Request $request, PropertyCategory $category): RedirectResponse
    {
        $this->resolveAdmin($request);

        $category->is_active = ! $category->is_active;
        $category->save();

        $state = $category->is_active ? 'activated' : 'deactivated';

        return back()->with('status', "Category '{$category->name}' {$state} successfully.");
    }

    public function destroy(Request $request, PropertyCategory $category): RedirectResponse
    {
        $this->resolveAdmin($request);

        if (in_array($category->slug, PropertyCategory::CANONICAL_SLUGS, true)) {
            return back()->withErrors([
                'error' => "Cannot delete core canonical category '{$category->name}'. You can deactivate it instead.",
            ]);
        }

        if ($category->properties()->exists()) {
            return back()->withErrors([
                'error' => "Cannot delete category '{$category->name}' because it has active properties linked to it. You can deactivate it instead.",
            ]);
        }

        $categoryName = $category->name;
        $category->delete();

        return back()->with('status', "Category '{$categoryName}' deleted successfully.");
    }
}
