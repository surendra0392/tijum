<?php

declare(strict_types=1);

namespace App\Http\Controllers\Owner\Onboarding;

use App\Actions\Owner\Onboarding\GetOrCreateDraftApplication;
use App\Actions\Owner\Onboarding\SaveOwnerBusinessProfile;
use App\Actions\Owner\Onboarding\SubmitVerificationApplication;
use App\Actions\Owner\Onboarding\SyncOwnerOperatingCities;
use App\Actions\Owner\Onboarding\UploadVerificationDocument;
use App\Actions\Owner\Onboarding\WithdrawVerificationApplication;
use App\Enums\OwnerEntityType;
use App\Enums\OwnerVerificationDocumentStatus;
use App\Enums\OwnerVerificationDocumentType;
use App\Enums\OwnerVerificationEventType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Owner\Onboarding\BusinessProfileUpdateRequest;
use App\Http\Requests\Owner\Onboarding\OperatingCitiesUpdateRequest;
use App\Http\Requests\Owner\Onboarding\SubmitVerificationApplicationRequest;
use App\Http\Requests\Owner\Onboarding\UploadVerificationDocumentRequest;
use App\Http\Requests\Owner\Onboarding\WithdrawVerificationApplicationRequest;
use App\Models\City;
use App\Models\Owner;
use App\Models\OwnerVerificationApplication;
use App\Models\OwnerVerificationDocument;
use App\Models\OwnerVerificationEvent;
use App\Services\PartnerVerificationChecklist;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PartnerOnboardingController extends Controller
{
    public function __construct(
        public readonly PartnerVerificationChecklist $checklist,
    ) {}

    public function index(Request $request, GetOrCreateDraftApplication $getOrCreateDraft): Response
    {
        $owner = $this->resolveOwner($request);
        $application = $this->resolveApplication($owner, $getOrCreateDraft);

        return Inertia::render('owner/onboarding/index', [
            ...$this->sharedOnboardingPayload($owner, $application),
            'status' => $request->session()->get('status'),
        ]);
    }

    public function businessProfile(Request $request, GetOrCreateDraftApplication $getOrCreateDraft): Response
    {
        $owner = $this->resolveOwner($request);
        $application = $this->resolveApplication($owner, $getOrCreateDraft);

        return Inertia::render('owner/onboarding/business-profile', [
            ...$this->sharedOnboardingPayload($owner, $application),
            'entityTypes' => array_map(
                static fn (OwnerEntityType $type): array => [
                    'value' => $type->value,
                    'label' => $type->label(),
                    'description' => $type->description(),
                    'requiresLegalBusinessName' => $type->requiresLegalBusinessName(),
                    'requiredDocuments' => array_map(
                        static fn (OwnerVerificationDocumentType $docType): string => $docType->label(),
                        $type->requiredDocumentTypes(),
                    ),
                ],
                OwnerEntityType::cases(),
            ),
            'status' => $request->session()->get('status'),
        ]);
    }

    public function updateBusinessProfile(
        BusinessProfileUpdateRequest $request,
        SaveOwnerBusinessProfile $saveProfile,
    ): RedirectResponse {
        $owner = $this->resolveOwner($request);
        $saveProfile->execute($owner, $request->validated());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Business profile saved.'),
        ]);

        return to_route('owner.onboarding.business-profile')
            ->with('status', 'business-profile-saved');
    }

    public function cities(Request $request, GetOrCreateDraftApplication $getOrCreateDraft): Response
    {
        $owner = $this->resolveOwner($request);
        $application = $this->resolveApplication($owner, $getOrCreateDraft);

        $availableCities = City::query()
            ->active()
            ->ordered()
            ->get()
            ->map(static fn (City $city): array => $city->toSelectorArray())
            ->values()
            ->all();

        return Inertia::render('owner/onboarding/operating-cities', [
            ...$this->sharedOnboardingPayload($owner, $application),
            'cities' => $availableCities,
            'selectedCityIds' => $owner->operatingCities->pluck('id')
                ->map(static fn (mixed $id): int => (int) $id)
                ->values()
                ->all(),
            'status' => $request->session()->get('status'),
        ]);
    }

    public function updateCities(
        OperatingCitiesUpdateRequest $request,
        SyncOwnerOperatingCities $syncCities,
    ): RedirectResponse {
        $owner = $this->resolveOwner($request);

        /** @var list<int> $cityIds */
        $cityIds = array_map(
            static fn (mixed $id): int => (int) $id,
            $request->validated('city_ids'),
        );

        $syncCities->execute($owner, $cityIds);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Intended operating cities updated.'),
        ]);

        return to_route('owner.onboarding.cities')
            ->with('status', 'operating-cities-saved');
    }

    public function documents(Request $request, GetOrCreateDraftApplication $getOrCreateDraft): Response
    {
        $owner = $this->resolveOwner($request);
        $application = $this->resolveApplication($owner, $getOrCreateDraft);
        $application->loadMissing('documents');

        $replacedDocuments = $application->documents
            ->filter(static fn (OwnerVerificationDocument $doc): bool => $doc->status === OwnerVerificationDocumentStatus::Replaced)
            ->map(static fn (OwnerVerificationDocument $doc): array => $doc->toOwnerArray())
            ->values()
            ->all();

        return Inertia::render('owner/onboarding/documents', [
            ...$this->sharedOnboardingPayload($owner, $application),
            'replacedDocuments' => $replacedDocuments,
            'maxDocumentSizeMb' => (int) ceil(((int) config('tijum.owner_verification.max_document_kb', 10240)) / 1024),
            'status' => $request->session()->get('status'),
        ]);
    }

    public function uploadDocument(
        UploadVerificationDocumentRequest $request,
        UploadVerificationDocument $uploader,
    ): RedirectResponse {
        $owner = $this->resolveOwner($request);
        $documentType = OwnerVerificationDocumentType::from((string) $request->validated('document_type'));
        $file = $request->file('document');

        if ($file === null) {
            return back()->withErrors(['document' => 'Please choose a PDF, JPG, JPEG, or PNG file to upload.']);
        }

        $uploader->execute($owner, $documentType, $file);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __(':type uploaded securely.', ['type' => $documentType->label()]),
        ]);

        return to_route('owner.onboarding.documents')
            ->with('status', 'document-uploaded');
    }

    public function showDocument(Request $request, OwnerVerificationDocument $document): StreamedResponse
    {
        $owner = $this->resolveOwner($request);
        $document->loadMissing('application');

        Gate::forUser($owner)->authorize('viewByOwner', $document);

        $disk = (string) config('tijum.owner_verification.disk', 'owner_verification');

        if (! Storage::disk($disk)->exists($document->storage_path)) {
            abort(404, 'Verification document not found in private storage.');
        }

        $download = $request->boolean('download');
        $headers = [
            'Content-Type' => $document->mime_type,
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'no-store, private',
        ];

        return $download
            ? Storage::disk($disk)->download($document->storage_path, $document->original_filename, $headers)
            : Storage::disk($disk)->response($document->storage_path, $document->original_filename, $headers, 'inline');
    }

    public function deleteDocument(Request $request, OwnerVerificationDocument $document): RedirectResponse
    {
        $owner = $this->resolveOwner($request);
        $document->loadMissing('application');

        Gate::forUser($owner)->authorize('deleteByOwner', $document);

        $application = $document->application;
        if (! $application instanceof OwnerVerificationApplication) {
            abort(404);
        }

        $disk = (string) config('tijum.owner_verification.disk', 'owner_verification');
        $storagePath = $document->storage_path;
        $label = $document->document_type->label();

        DB::transaction(function () use ($owner, $application, $document, $label): void {
            $lockedApp = OwnerVerificationApplication::query()
                ->whereKey($application->id)
                ->lockForUpdate()
                ->firstOrFail();

            OwnerVerificationEvent::record(
                application: $lockedApp,
                eventType: OwnerVerificationEventType::DocumentDeleted,
                actorType: 'owner',
                actorId: $owner->id,
                actorName: $owner->name,
                previousStatus: $lockedApp->status,
                newStatus: $lockedApp->status,
                notes: "Removed {$label} before final submission.",
                metadata: [
                    'document_id' => $document->id,
                    'document_type' => $document->document_type->value,
                ],
            );

            $document->delete();
        });

        Storage::disk($disk)->delete($storagePath);

        Inertia::flash('toast', [
            'type' => 'info',
            'message' => __(':type removed.', ['type' => $label]),
        ]);

        return to_route('owner.onboarding.documents')
            ->with('status', 'document-deleted');
    }

    public function review(Request $request, GetOrCreateDraftApplication $getOrCreateDraft): Response
    {
        $owner = $this->resolveOwner($request);
        $application = $this->resolveApplication($owner, $getOrCreateDraft);

        return Inertia::render('owner/onboarding/review', [
            ...$this->sharedOnboardingPayload($owner, $application),
            'declarationVersion' => (string) config('tijum.owner_verification.declaration_version', '2026.1'),
            'status' => $request->session()->get('status'),
        ]);
    }

    public function submit(
        SubmitVerificationApplicationRequest $request,
        SubmitVerificationApplication $submitAction,
    ): RedirectResponse {
        $owner = $this->resolveOwner($request);
        $notes = $request->validated('notes');

        $submitAction->execute($owner, is_string($notes) ? $notes : null);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Partner verification application submitted for TIJUM review.'),
        ]);

        return to_route('owner.onboarding.status')
            ->with('status', 'application-submitted');
    }

    public function status(Request $request): Response
    {
        $owner = $this->resolveOwner($request);
        $owner->loadMissing(['businessProfile', 'operatingCities']);

        $application = $owner->activeVerificationApplication()
            ->with(['documents', 'events'])
            ->first()
            ?? $owner->latestVerificationApplication()
                ->with(['documents', 'events'])
                ->first();

        $applicationsHistory = $owner->verificationApplications()
            ->get()
            ->map(static fn (OwnerVerificationApplication $app): array => $app->toOwnerArray())
            ->values()
            ->all();

        $events = $application instanceof OwnerVerificationApplication
            ? $application->events
                ->filter(static fn (OwnerVerificationEvent $event): bool => $event->event_type->isVisibleToOwner())
                ->map(static fn (OwnerVerificationEvent $event): array => $event->toOwnerArray())
                ->values()
                ->all()
            : [];

        return Inertia::render('owner/onboarding/application-status', [
            ...$this->sharedOnboardingPayload($owner, $application),
            'applicationsHistory' => $applicationsHistory,
            'events' => $events,
            'status' => $request->session()->get('status'),
        ]);
    }

    public function withdraw(
        WithdrawVerificationApplicationRequest $request,
        WithdrawVerificationApplication $withdrawAction,
    ): RedirectResponse {
        $owner = $this->resolveOwner($request);
        $reason = $request->validated('reason');

        $withdrawAction->execute($owner, is_string($reason) ? $reason : null);

        Inertia::flash('toast', [
            'type' => 'info',
            'message' => __('Partner verification application withdrawn.'),
        ]);

        return to_route('owner.onboarding.status')
            ->with('status', 'application-withdrawn');
    }

    public function startRevision(Request $request, GetOrCreateDraftApplication $getOrCreateDraft): RedirectResponse
    {
        $owner = $this->resolveOwner($request);
        $getOrCreateDraft->execute($owner, createIfTerminal: true);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Started a new partner verification draft revision.'),
        ]);

        return to_route('owner.onboarding.index')
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

    private function resolveApplication(
        Owner $owner,
        GetOrCreateDraftApplication $getOrCreateDraft,
    ): OwnerVerificationApplication {
        $active = $owner->activeVerificationApplication()->with('documents')->first();
        if ($active instanceof OwnerVerificationApplication) {
            return $active;
        }

        $latest = $owner->latestVerificationApplication()->with('documents')->first();
        if ($latest instanceof OwnerVerificationApplication) {
            return $latest;
        }

        return $getOrCreateDraft->execute($owner);
    }

    /**
     * @return array<string, mixed>
     */
    private function sharedOnboardingPayload(Owner $owner, ?OwnerVerificationApplication $application): array
    {
        $owner->loadMissing(['businessProfile', 'operatingCities']);
        $application?->loadMissing('documents');

        return [
            'application' => $application?->toOwnerArray(),
            'businessProfile' => $owner->businessProfile?->toPortalArray(),
            'operatingCities' => $owner->operatingCities
                ->map(static fn (City $city): array => $city->toSelectorArray())
                ->values()
                ->all(),
            'evaluation' => $this->checklist->evaluate($owner, $application),
        ];
    }
}
