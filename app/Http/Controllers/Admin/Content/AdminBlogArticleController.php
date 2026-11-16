<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\Content;

use App\Enums\ContentStatus;
use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\BlogArticle;
use App\Models\BlogCategory;
use App\Models\ContentAuthor;
use App\Services\Blog\BlogArticleService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminBlogArticleController extends Controller
{
    public function __construct(
        private readonly BlogArticleService $articleService,
    ) {}

    public function index(Request $request): Response
    {
        $query = BlogArticle::query()->with(['author', 'category', 'tags'])->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->query('category_id'));
        }

        if ($request->filled('search')) {
            $search = (string) $request->query('search');
            $query->where(function ($q) use ($search): void {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%")
                    ->orWhere('excerpt', 'like', "%{$search}%");
            });
        }

        $articles = $query->paginate(15)->withQueryString();
        $categories = BlogCategory::query()->orderBy('name')->get();

        return Inertia::render('admin/content/blog/index', [
            'articles' => $articles,
            'categories' => $categories,
            'filters' => [
                'status' => $request->query('status'),
                'category_id' => $request->query('category_id'),
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
        $categories = BlogCategory::query()->active()->get();
        $authors = ContentAuthor::query()->where('is_active', true)->get();

        return Inertia::render('admin/content/blog/form', [
            'article' => null,
            'categories' => $categories,
            'authors' => $authors,
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
            'slug' => ['nullable', 'string', 'max:255', 'unique:blog_articles,slug'],
            'excerpt' => ['nullable', 'string', 'max:500'],
            'content' => ['required', 'string'],
            'featured_image' => ['nullable', 'string', 'max:500'],
            'author_id' => ['nullable', 'exists:content_authors,id'],
            'category_id' => ['nullable', 'exists:blog_categories,id'],
            'status' => ['required', 'string'],
            'scheduled_for' => ['nullable', 'date'],
            'tags' => ['nullable', 'array'],
            'seo_title' => ['nullable', 'string', 'max:255'],
            'seo_description' => ['nullable', 'string', 'max:500'],
            'canonical_override' => ['nullable', 'string', 'max:500'],
            'og_image' => ['nullable', 'string', 'max:500'],
        ]);

        /** @var Admin $admin */
        $admin = auth('admin')->user();
        $article = $this->articleService->createArticle($validated, $admin);

        return redirect()->route('admin.content.blog.edit', $article)
            ->with('success', 'Article created successfully.');
    }

    public function edit(BlogArticle $article): Response
    {
        $article->load(['author', 'category', 'tags']);
        $categories = BlogCategory::query()->active()->get();
        $authors = ContentAuthor::query()->where('is_active', true)->get();

        return Inertia::render('admin/content/blog/form', [
            'article' => $article,
            'categories' => $categories,
            'authors' => $authors,
            'statuses' => array_map(fn (ContentStatus $s) => [
                'value' => $s->value,
                'label' => $s->label(),
            ], ContentStatus::cases()),
        ]);
    }

    public function update(Request $request, BlogArticle $article): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'unique:blog_articles,slug,'.$article->id],
            'excerpt' => ['nullable', 'string', 'max:500'],
            'content' => ['required', 'string'],
            'featured_image' => ['nullable', 'string', 'max:500'],
            'author_id' => ['nullable', 'exists:content_authors,id'],
            'category_id' => ['nullable', 'exists:blog_categories,id'],
            'status' => ['required', 'string'],
            'scheduled_for' => ['nullable', 'date'],
            'tags' => ['nullable', 'array'],
            'seo_title' => ['nullable', 'string', 'max:255'],
            'seo_description' => ['nullable', 'string', 'max:500'],
            'canonical_override' => ['nullable', 'string', 'max:500'],
            'og_image' => ['nullable', 'string', 'max:500'],
        ]);

        /** @var Admin $admin */
        $admin = auth('admin')->user();
        $this->articleService->updateArticle($article, $validated, $admin);

        return back()->with('success', 'Article updated successfully.');
    }

    public function destroy(BlogArticle $article): RedirectResponse
    {
        $article->update(['status' => ContentStatus::Archived]);

        return redirect()->route('admin.content.blog.index')
            ->with('success', 'Article archived successfully.');
    }
}
