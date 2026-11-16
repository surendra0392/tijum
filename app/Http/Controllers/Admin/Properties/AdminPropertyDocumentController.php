<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\Properties;

use App\Enums\PropertyVerificationEventType;
use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\Property;
use App\Models\PropertyVerificationApplication;
use App\Models\PropertyVerificationDocument;
use App\Models\PropertyVerificationEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminPropertyDocumentController extends Controller
{
    public function __invoke(Request $request, PropertyVerificationDocument $document): StreamedResponse
    {
        $admin = $request->user('admin');
        if (! $admin instanceof Admin) {
            abort(403);
        }

        $document->loadMissing('application.property');
        Gate::forUser($admin)->authorize('viewByAdmin', $document);

        $application = $document->application;
        if (! $application instanceof PropertyVerificationApplication || ! $application->property instanceof Property) {
            abort(404);
        }

        $disk = (string) config('tijum.property_verification.disk', 'property_verification');
        if (! Storage::disk($disk)->exists($document->storage_path)) {
            abort(404, 'Property verification document not found in private storage.');
        }

        $download = $request->boolean('download');

        PropertyVerificationEvent::record(
            property: $application->property,
            application: $application,
            eventType: $download
                ? PropertyVerificationEventType::DocumentDownloaded
                : PropertyVerificationEventType::DocumentViewed,
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
