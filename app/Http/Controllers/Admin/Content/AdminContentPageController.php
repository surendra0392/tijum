<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\Content;

use App\Enums\ContentStatus;
use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\ContentPage;
use App\Models\ContentPageRevision;
use App\Services\Content\ContentPageService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminContentPageController extends Controller
{
    public function __construct(
        private readonly ContentPageService $pageService,
    ) {}

    public function index(Request $request): Response
    {
        $query = ContentPage::query()->with('authorAdmin')->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('search')) {
            $search = (string) $request->query('search');
            $query->where(function ($q) use ($search): void {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%")
                    ->orWhere('internal_name', 'like', "%{$search}%");
            });
        }

        $pages = $query->paginate(15)->withQueryString();

        return Inertia::render('admin/content/pages/index', [
            'pages' => $pages,
            'filters' => [
                'status' => $request->query('status'),
                'search' => $request->query('search'),
            ],
            'statuses' => array_map(fn (ContentStatus $s) => [
                'value' => $s->value,
                'label' => $s->label(),
            ], ContentStatus::cases()),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/content/pages/form', [
            'page' => null,
            'statuses' => array_map(fn (ContentStatus $s) => [
                'value' => $s->value,
                'label' => $s->label(),
            ], ContentStatus::cases()),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'internal_name' => ['nullable', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'unique:content_pages,slug'],
            'summary' => ['nullable', 'string', 'max:500'],
            'content_blocks' => ['nullable', 'array'],
            'featured_image' => ['nullable', 'string', 'max:500'],
            'status' => ['required', 'string'],
            'scheduled_for' => ['nullable', 'date'],
            'seo_title' => ['nullable', 'string', 'max:255'],
            'seo_description' => ['nullable', 'string', 'max:500'],
            'canonical_override' => ['nullable', 'string', 'max:500'],
            'robots_directive' => ['nullable', 'string', 'max:64'],
            'og_image' => ['nullable', 'string', 'max:500'],
        ]);

        /** @var Admin $admin */
        $admin = auth('admin')->user();
        $page = $this->pageService->createPage($validated, $admin);

        return redirect()->route('admin.content.pages.edit', $page)
            ->with('success', 'Page created successfully.');
    }

    public function edit(ContentPage $page): Response
    {
        $page->load(['revisions.admin', 'authorAdmin']);

        return Inertia::render('admin/content/pages/form', [
            'page' => $page,
            'statuses' => array_map(fn (ContentStatus $s) => [
                'value' => $s->value,
                'label' => $s->label(),
            ], ContentStatus::cases()),
        ]);
    }

    public function update(Request $request, ContentPage $page): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'internal_name' => ['nullable', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'unique:content_pages,slug,'.$page->id],
            'summary' => ['nullable', 'string', 'max:500'],
            'content_blocks' => ['nullable', 'array'],
            'featured_image' => ['nullable', 'string', 'max:500'],
            'status' => ['required', 'string'],
            'scheduled_for' => ['nullable', 'date'],
            'seo_title' => ['nullable', 'string', 'max:255'],
            'seo_description' => ['nullable', 'string', 'max:500'],
            'canonical_override' => ['nullable', 'string', 'max:500'],
            'robots_directive' => ['nullable', 'string', 'max:64'],
            'og_image' => ['nullable', 'string', 'max:500'],
            'change_notes' => ['nullable', 'string', 'max:255'],
        ]);

        /** @var Admin $admin */
        $admin = auth('admin')->user();
        $this->pageService->updatePage($page, $validated, $admin, $validated['change_notes'] ?? null);

        return back()->with('success', 'Page updated successfully.');
    }

    public function restoreRevision(ContentPage $page, ContentPageRevision $revision): RedirectResponse
    {
        /** @var Admin $admin */
        $admin = auth('admin')->user();
        $this->pageService->restoreRevision($page, $revision, $admin);

        return back()->with('success', "Page restored to revision version {$revision->version}.");
    }

    public function destroy(ContentPage $page): RedirectResponse
    {
        $page->update(['status' => ContentStatus::Archived]);

        return redirect()->route('admin.content.pages.index')
            ->with('success', 'Page archived successfully.');
    }
}
