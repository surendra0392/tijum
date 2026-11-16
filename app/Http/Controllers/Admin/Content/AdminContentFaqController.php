<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\Content;

use App\Http\Controllers\Controller;
use App\Models\ContentFaq;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminContentFaqController extends Controller
{
    public function index(Request $request): Response
    {
        $query = ContentFaq::query()->orderBy('display_order')->orderBy('id');

        if ($request->filled('category')) {
            $query->where('category', $request->query('category'));
        }

        $faqs = $query->paginate(20)->withQueryString();

        $categories = ContentFaq::query()
            ->select('category')
            ->distinct()
            ->pluck('category')
            ->all();

        return Inertia::render('admin/content/faqs/index', [
            'faqs' => $faqs,
            'categories' => $categories,
            'currentCategory' => $request->query('category'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'question' => ['required', 'string', 'max:255'],
            'answer' => ['required', 'string', 'max:2000'],
            'category' => ['nullable', 'string', 'max:64'],
            'display_order' => ['nullable', 'integer', 'min:0'],
            'is_published' => ['boolean'],
        ]);

        ContentFaq::query()->create([
            'question' => $validated['question'],
            'answer' => $validated['answer'],
            'category' => $validated['category'] ?: 'general',
            'display_order' => (int) ($validated['display_order'] ?? 0),
            'is_published' => (bool) ($validated['is_published'] ?? true),
        ]);

        return back()->with('success', 'FAQ item created successfully.');
    }

    public function update(Request $request, ContentFaq $faq): RedirectResponse
    {
        $validated = $request->validate([
            'question' => ['required', 'string', 'max:255'],
            'answer' => ['required', 'string', 'max:2000'],
            'category' => ['nullable', 'string', 'max:64'],
            'display_order' => ['nullable', 'integer', 'min:0'],
            'is_published' => ['boolean'],
        ]);

        $faq->update([
            'question' => $validated['question'],
            'answer' => $validated['answer'],
            'category' => $validated['category'] ?: 'general',
            'display_order' => (int) ($validated['display_order'] ?? 0),
            'is_published' => (bool) ($validated['is_published'] ?? true),
        ]);

        return back()->with('success', 'FAQ item updated successfully.');
    }

    public function destroy(ContentFaq $faq): RedirectResponse
    {
        $faq->delete();

        return back()->with('success', 'FAQ item deleted successfully.');
    }
}
