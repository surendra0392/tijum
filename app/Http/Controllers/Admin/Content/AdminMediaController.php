<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\Content;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\MediaAsset;
use App\Services\Media\MediaStorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Inertia\Inertia;
use Inertia\Response;

class AdminMediaController extends Controller
{
    public function __construct(
        private readonly MediaStorageService $storageService,
    ) {}

    public function index(Request $request): Response|JsonResponse
    {
        $query = MediaAsset::query()->with('admin')->latest();

        if ($request->filled('search')) {
            $search = (string) $request->query('search');
            $query->where(function ($q) use ($search): void {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('original_name', 'like', "%{$search}%")
                    ->orWhere('alt_text', 'like', "%{$search}%");
            });
        }

        if ($request->filled('mime_type')) {
            $query->where('mime_type', 'like', $request->query('mime_type').'%');
        }

        $assets = $query->paginate(24)->withQueryString();

        if ($request->wantsJson()) {
            return response()->json($assets);
        }

        return Inertia::render('admin/content/media/index', [
            'assets' => $assets,
            'filters' => [
                'search' => $request->query('search'),
                'mime_type' => $request->query('mime_type'),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse|RedirectResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:jpg,jpeg,png,webp,svg', 'max:5120'],
            'title' => ['nullable', 'string', 'max:255'],
            'alt_text' => ['nullable', 'string', 'max:255'],
            'caption' => ['nullable', 'string', 'max:500'],
        ]);

        /** @var Admin $admin */
        $admin = auth('admin')->user();
        /** @var UploadedFile $file */
        $file = $request->file('file');

        $asset = $this->storageService->storeUpload(
            file: $file,
            admin: $admin,
            title: $request->input('title'),
            altText: $request->input('alt_text'),
            caption: $request->input('caption'),
        );

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'asset' => $asset,
            ]);
        }

        return back()->with('success', 'Media file uploaded successfully.');
    }

    public function update(Request $request, MediaAsset $media): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['nullable', 'string', 'max:255'],
            'alt_text' => ['nullable', 'string', 'max:255'],
            'caption' => ['nullable', 'string', 'max:500'],
        ]);

        $media->update($validated);

        return back()->with('success', 'Media metadata updated.');
    }

    public function destroy(MediaAsset $media): RedirectResponse
    {
        $this->storageService->delete($media);

        return back()->with('success', 'Media asset deleted.');
    }
}
