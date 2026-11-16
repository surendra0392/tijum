<?php

declare(strict_types=1);

namespace App\Http\Controllers\Owner\Properties;

use App\Actions\Owner\Properties\CreatePropertyApplicationRecord;
use App\Actions\Owner\Properties\DeletePropertyVerificationDocument;
use App\Actions\Owner\Properties\StartPropertyRevisionApplication;
use App\Actions\Owner\Properties\SubmitPropertyVerificationApplication;
use App\Actions\Owner\Properties\UploadPropertyVerificationDocument;
use App\Actions\Owner\Properties\WithdrawPropertyVerificationApplication;
use App\Enums\PropertyVerificationDocumentStatus;
use App\Enums\PropertyVerificationDocumentType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Owner\Properties\SubmitPropertyVerificationRequest;
use App\Http\Requests\Owner\Properties\UploadPropertyVerificationDocumentRequest;
use App\Http\Requests\Owner\Properties\WithdrawPropertyVerificationRequest;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyVerificationApplication;
use App\Models\PropertyVerificationDocument;
use App\Models\PropertyVerificationEvent;
use App\Services\PropertyVerificationChecklist;
use App\Support\PropertyPortalData;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PropertyVerificationController extends Controller
{
    public function __construct(
        public readonly PropertyVerificationChecklist $checklist,
    ) {}

    public function show(
        Request $request,
        Property $property,
        CreatePropertyApplicationRecord $createApplicationRecord,
    ): Response {
        $owner = $this->resolveOwner($request);
        Gate::forUser($owner)->authorize('viewByOwner', $property);

        $property->load([
            'category',
            'city',
            'roomTypes',
            'rooms',
            'media',
            'activeVerificationApplication.documents',
            'latestVerificationApplication.documents',
            'verificationApplications',
            'verificationEvents',
        ]);

        $application = $property->activeVerificationApplication ?? $property->latestVerificationApplication;

        if (! $application instanceof PropertyVerificationApplication && $owner->canPublishProperties()) {
            $application = $createApplicationRecord->execute($property, 1, false);
        }

        $evaluation = $this->checklist->evaluate($property, $application);

        $replacedDocuments = $application instanceof PropertyVerificationApplication
            ? $application->documents
                ->where('status', PropertyVerificationDocumentStatus::Replaced)
                ->map(static fn (PropertyVerificationDocument $d): array => $d->toOwnerArray($property->id))
                ->values()
                ->all()
            : [];

        $ownerEvents = $property->verificationEvents
            ->filter(static fn (PropertyVerificationEvent $e): bool => $e->event_type->isVisibleToOwner())
            ->map(static fn (PropertyVerificationEvent $e): array => $e->toTimelineArray())
            ->values()
            ->all();

        return Inertia::render('owner/properties/verification/status', [
            'property' => PropertyPortalData::ownerSummary($property),
            'application' => $application?->toOwnerArray(),
            'applicationsHistory' => $property->verificationApplications
                ->map(static fn (PropertyVerificationApplication $app): array => $app->toOwnerArray())
                ->values()
                ->all(),
            'evaluation' => $evaluation,
            'replacedDocuments' => $replacedDocuments,
            'events' => $ownerEvents,
            'maxDocumentSizeMb' => (int) round(((int) config('tijum.property_verification.max_document_kb', 10240)) / 1024),
            'declarationVersion' => config('tijum.property_verification.declaration_version', '2026.1'),
            'status' => $request->session()->get('status'),
        ]);
    }

    public function uploadDocument(
        UploadPropertyVerificationDocumentRequest $request,
        Property $property,
        UploadPropertyVerificationDocument $uploadDocument,
    ): RedirectResponse {
        $owner = $this->resolveOwner($request);
        Gate::forUser($owner)->authorize('manageInventoryByOwner', $property);

        $file = $request->file('document');
        if ($file === null) {
            abort(422);
        }

        $docType = PropertyVerificationDocumentType::from($request->string('document_type')->toString());
        $uploadDocument->execute($owner, $property, $docType, $file);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => sprintf('%s uploaded securely.', $docType->label()),
        ]);

        return to_route('owner.properties.verification.show', $property)
            ->with('status', 'document-uploaded');
    }

    public function deleteDocument(
        Request $request,
        Property $property,
        PropertyVerificationDocument $document,
        DeletePropertyVerificationDocument $deleteDocument,
    ): RedirectResponse {
        $owner = $this->resolveOwner($request);
        $document->loadMissing('application');
        if ($document->application?->property_id !== $property->id) {
            abort(404);
        }

        Gate::forUser($owner)->authorize('deleteByOwner', $document);
        $deleteDocument->execute($owner, $property, $document);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Document removed cleanly.'),
        ]);

        return to_route('owner.properties.verification.show', $property)
            ->with('status', 'document-deleted');
    }

    public function showDocument(
        Request $request,
        Property $property,
        PropertyVerificationDocument $document,
    ): StreamedResponse {
        $owner = $this->resolveOwner($request);
        $document->loadMissing('application');
        if ($document->application?->property_id !== $property->id) {
            abort(404);
        }

        Gate::forUser($owner)->authorize('viewByOwner', $document);

        $disk = (string) config('tijum.property_verification.disk', 'property_verification');
        if (! Storage::disk($disk)->exists($document->storage_path)) {
            abort(404);
        }

        $headers = [
            'Content-Type' => $document->mime_type,
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'no-store, private',
        ];

        return $request->boolean('download')
            ? Storage::disk($disk)->download($document->storage_path, $document->original_filename, $headers)
            : Storage::disk($disk)->response($document->storage_path, $document->original_filename, $headers, 'inline');
    }

    public function submit(
        SubmitPropertyVerificationRequest $request,
        Property $property,
        SubmitPropertyVerificationApplication $submitApplication,
    ): RedirectResponse {
        $owner = $this->resolveOwner($request);
        $activeApp = $property->activeVerificationApplication;
        if (! $activeApp instanceof PropertyVerificationApplication) {
            abort(404);
        }

        Gate::forUser($owner)->authorize('submitByOwner', $activeApp);
        $submitApplication->execute($owner, $property, $request->boolean('declaration_accepted'));

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Property submitted for independent TIJUM verification review.'),
        ]);

        return to_route('owner.properties.verification.show', $property)
            ->with('status', 'application-submitted');
    }

    public function withdraw(
        WithdrawPropertyVerificationRequest $request,
        Property $property,
        WithdrawPropertyVerificationApplication $withdrawApplication,
    ): RedirectResponse {
        $owner = $this->resolveOwner($request);
        $activeApp = $property->activeVerificationApplication;
        if (! $activeApp instanceof PropertyVerificationApplication) {
            abort(404);
        }

        Gate::forUser($owner)->authorize('withdrawByOwner', $activeApp);
        $withdrawApplication->execute($owner, $property, $request->input('reason'));

        Inertia::flash('toast', [
            'type' => 'info',
            'message' => __('Property verification application withdrawn cleanly.'),
        ]);

        return to_route('owner.properties.verification.show', $property)
            ->with('status', 'application-withdrawn');
    }

    public function startRevision(
        Request $request,
        Property $property,
        StartPropertyRevisionApplication $startRevision,
    ): RedirectResponse {
        $owner = $this->resolveOwner($request);
        Gate::forUser($owner)->authorize('viewByOwner', $property);

        $revision = $startRevision->execute($owner, $property);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => sprintf('Started revision #%d (%s).', $revision->revision_number, $revision->application_number),
        ]);

        return to_route('owner.properties.verification.show', $property)
            ->with('status', 'revision-started');
    }

    private function resolveOwner(Request $request): Owner
    {
        $owner = $request->user('owner');
        if (! $owner instanceof Owner) {
            abort(403);
        }

        return $owner;
    }
}
