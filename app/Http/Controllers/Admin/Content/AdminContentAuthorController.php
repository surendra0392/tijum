<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\Content;

use App\Http\Controllers\Controller;
use App\Models\ContentAuthor;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class AdminContentAuthorController extends Controller
{
    public function index(): Response
    {
        $authors = ContentAuthor::query()
            ->withCount('articles')
            ->orderBy('name')
            ->get();

        return Inertia::render('admin/content/authors/index', [
            'authors' => $authors,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'unique:content_authors,slug'],
            'designation' => ['nullable', 'string', 'max:255'],
            'bio' => ['nullable', 'string', 'max:1000'],
            'avatar_url' => ['nullable', 'string', 'max:500'],
            'is_active' => ['boolean'],
        ]);

        ContentAuthor::query()->create([
            'name' => $validated['name'],
            'slug' => Str::slug($validated['slug'] ?: $validated['name']),
            'designation' => $validated['designation'] ?? null,
            'bio' => $validated['bio'] ?? null,
            'avatar_url' => $validated['avatar_url'] ?? null,
            'is_active' => (bool) ($validated['is_active'] ?? true),
        ]);

        return back()->with('success', 'Author created successfully.');
    }

    public function update(Request $request, ContentAuthor $author): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'unique:content_authors,slug,'.$author->id],
            'designation' => ['nullable', 'string', 'max:255'],
            'bio' => ['nullable', 'string', 'max:1000'],
            'avatar_url' => ['nullable', 'string', 'max:500'],
            'is_active' => ['boolean'],
        ]);

        $author->update([
            'name' => $validated['name'],
            'slug' => Str::slug($validated['slug'] ?: $validated['name']),
            'designation' => $validated['designation'] ?? null,
            'bio' => $validated['bio'] ?? null,
            'avatar_url' => $validated['avatar_url'] ?? null,
            'is_active' => (bool) ($validated['is_active'] ?? true),
        ]);

        return back()->with('success', 'Author updated successfully.');
    }

    public function destroy(ContentAuthor $author): RedirectResponse
    {
        if ($author->articles()->exists()) {
            return back()->with('error', 'Cannot delete author with associated articles.');
        }

        $author->delete();

        return back()->with('success', 'Author deleted successfully.');
    }
}
