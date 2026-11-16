<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\PartnerVerification;

use App\Enums\OwnerVerificationEventType;
use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\OwnerVerificationApplication;
use App\Models\OwnerVerificationDocument;
use App\Models\OwnerVerificationEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PartnerVerificationDocumentController extends Controller
{
    public function __invoke(Request $request, OwnerVerificationDocument $document): StreamedResponse
    {
        $admin = $request->user('admin');

        if (! $admin instanceof Admin) {
            abort(403);
        }

        $document->loadMissing('application');
        Gate::forUser($admin)->authorize('viewByAdmin', $document);

        $application = $document->application;
        if (! $application instanceof OwnerVerificationApplication) {
            abort(404);
        }

        $disk = (string) config('tijum.owner_verification.disk', 'owner_verification');

        if (! Storage::disk($disk)->exists($document->storage_path)) {
            abort(404, 'Verification document file not found in private storage.');
        }

        $download = $request->boolean('download');

        OwnerVerificationEvent::record(
            application: $application,
            eventType: $download
                ? OwnerVerificationEventType::DocumentDownloaded
                : OwnerVerificationEventType::DocumentViewed,
            actorType: 'admin',
            actorId: $admin->id,
            actorName: $admin->name,
            previousStatus: $application->status,
            newStatus: $application->status,
            notes: sprintf(
                '%s %s (%s).',
                $download ? 'Downloaded' : 'Viewed',
                $document->document_type->label(),
                $document->original_filename,
            ),
            metadata: [
                'document_id' => $document->id,
                'document_type' => $document->document_type->value,
                'download' => $download,
            ],
        );

        $headers = [
            'Content-Type' => $document->mime_type,
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'no-store, private',
        ];

        return $download
            ? Storage::disk($disk)->download($document->storage_path, $document->original_filename, $headers)
            : Storage::disk($disk)->response($document->storage_path, $document->original_filename, $headers, 'inline');
    }
}
