<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\Properties;

use App\Actions\Admin\Properties\ApprovePropertyApplication;
use App\Actions\Admin\Properties\AssignPropertyReviewer;
use App\Actions\Admin\Properties\ManagePropertyOperationalStatusByAdmin;
use App\Actions\Admin\Properties\ModeratePropertyMedia;
use App\Actions\Admin\Properties\RejectPropertyApplication;
use App\Actions\Admin\Properties\RequestPropertyInformation;
use App\Actions\Admin\Properties\StartPropertyReview;
use App\Enums\AccommodationCategory;
use App\Enums\AdminRole;
use App\Enums\PropertyMediaModerationStatus;
use App\Enums\PropertyOperationalStatus;
use App\Enums\PropertyRoomStatus;
use App\Enums\PropertyVerificationStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Properties\ApprovePropertyApplicationRequest;
use App\Http\Requests\Admin\Properties\AssignPropertyReviewerRequest;
use App\Http\Requests\Admin\Properties\ModeratePropertyMediaRequest;
use App\Http\Requests\Admin\Properties\RejectPropertyApplicationRequest;
use App\Http\Requests\Admin\Properties\RequestPropertyInformationRequest;
use App\Http\Requests\Admin\Properties\UpdateAdminPropertyStatusRequest;
use App\Models\Admin;
use App\Models\City;
use App\Models\Property;
use App\Models\PropertyCategory;
use App\Models\PropertyMedia;
use App\Models\PropertyRoom;
use App\Models\PropertyRoomType;
use App\Models\PropertyVerificationApplication;
use App\Models\PropertyVerificationDocument;
use App\Models\PropertyVerificationEvent;
use App\Services\PropertyVerificationChecklist;
use App\Services\StayTimingPolicy;
use App\Support\PropertyPortalData;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminPropertyController extends Controller
{
    public function __construct(
        public readonly PropertyVerificationChecklist $checklist,
        private readonly StayTimingPolicy $timing,
    ) {}

    public function index(Request $request): Response
    {
        $admin = $this->resolveAdmin($request);
        Gate::forUser($admin)->authorize('viewQueueByAdmin', Property::class);

        $search = trim($request->string('search')->toString());
        $verificationFilter = trim($request->string('verification_status')->toString());
        $operationalFilter = trim($request->string('operational_status')->toString());
        $cityFilter = trim($request->string('city')->toString());
        $categoryFilter = trim($request->string('category')->toString());
        $dateFrom = trim($request->string('date_from')->toString());
        $dateTo = trim($request->string('date_to')->toString());

        $query = Property::query()
            ->with([
                'owner:id,name,email,status',
                'category:id,name,slug,code',
                'city:id,name,slug,state',
                'activeVerificationApplication.assignedAdmin:id,name,email,role',
                'latestVerificationApplication.assignedAdmin:id,name,email,role',
            ])
            ->withCount(['roomTypes', 'rooms'])
            ->orderByDesc('updated_at')
            ->orderByDesc('id');

        if ($search !== '') {
            $like = '%'.addcslashes($search, '\\%_').'%';
            $query->where(function (Builder $q) use ($like): void {
                $q->where('property_reference', 'like', $like)
                    ->orWhere('name', 'like', $like)
                    ->orWhere('locality', 'like', $like)
                    ->orWhereHas('owner', static function (Builder $ownerQ) use ($like): void {
                        $ownerQ->where('name', 'like', $like)->orWhere('email', 'like', $like);
                    });
            });
        }

        if ($cityFilter !== '') {
            $query->whereHas('city', static fn (Builder $q) => $q->where('slug', $cityFilter));
        }

        if ($categoryFilter !== '') {
            $canonicalCategory = AccommodationCategory::tryFromLegacy($categoryFilter);
            $targetSlug = $canonicalCategory?->value ?? $categoryFilter;
            $query->whereHas('category', static fn (Builder $q) => $q->where('slug', $targetSlug)->orWhere('slug', $categoryFilter));
        }

        if ($operationalFilter !== '' && in_array($operationalFilter, PropertyOperationalStatus::values(), true)) {
            $query->where('status', $operationalFilter);
        }

        if ($verificationFilter !== '' && in_array($verificationFilter, PropertyVerificationStatus::values(), true)) {
            $query->whereHas('latestVerificationApplication', static fn (Builder $q) => $q->where('status', $verificationFilter));
        }

        if ($dateFrom !== '') {
            try {
                $from = Carbon::parse($dateFrom)->startOfDay();
                $query->whereHas('latestVerificationApplication', static fn (Builder $q) => $q->where('submitted_at', '>=', $from));
            } catch (\Throwable) {
                // Ignore invalid date filter inputs safely
            }
        }

        if ($dateTo !== '') {
            try {
                $to = Carbon::parse($dateTo)->endOfDay();
                $query->whereHas('latestVerificationApplication', static fn (Builder $q) => $q->where('submitted_at', '<=', $to));
            } catch (\Throwable) {
                // Ignore invalid date filter inputs safely
            }
        }

        $paginated = $query->paginate(12)->withQueryString();
        $paginated->through(static fn (Property $p): array => PropertyPortalData::adminQueueRow($p));

        $appStats = PropertyVerificationApplication::query()
            ->toBase()
            ->selectRaw('status, count(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        $propStats = Property::query()
            ->toBase()
            ->selectRaw('status, count(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        return Inertia::render('admin/properties/index', [
            'properties' => $paginated,
            'stats' => [
                'total' => Property::query()->count(),
                'submitted' => (int) ($appStats[PropertyVerificationStatus::Submitted->value] ?? 0),
                'under_review' => (int) ($appStats[PropertyVerificationStatus::UnderReview->value] ?? 0),
                'needs_information' => (int) ($appStats[PropertyVerificationStatus::NeedsInformation->value] ?? 0),
                'approved' => Property::query()->where('is_verified', true)->count(),
                'suspended' => (int) ($propStats[PropertyOperationalStatus::Suspended->value] ?? 0),
            ],
            'filters' => [
                'search' => $search,
                'verification_status' => $verificationFilter,
                'operational_status' => $operationalFilter,
                'city' => $cityFilter,
                'category' => $categoryFilter,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
            ],
            'cities' => City::query()->ordered()->get()->map(static fn (City $c): array => $c->toSelectorArray())->values(),
            'categories' => PropertyCategory::query()->ordered()->get()->map(static fn (PropertyCategory $c): array => $c->toOptionArray())->values(),
            'verificationStatuses' => array_map(
                static fn (PropertyVerificationStatus $s): array => ['value' => $s->value, 'label' => $s->label()],
                PropertyVerificationStatus::cases(),
            ),
            'operationalStatuses' => array_map(
                static fn (PropertyOperationalStatus $s): array => ['value' => $s->value, 'label' => $s->label()],
                PropertyOperationalStatus::cases(),
            ),
        ]);
    }

    public function show(Request $request, Property $property): Response
    {
        $admin = $this->resolveAdmin($request);
        Gate::forUser($admin)->authorize('viewByAdmin', $property);

        $property->load([
            'owner.businessProfile',
            'category',
            'city',
            'roomTypes.rooms',
            'roomTypes.media',
            'rooms.roomType',
            'media.roomType',
            'media.room',
            'activeVerificationApplication.assignedAdmin',
            'activeVerificationApplication.reviewedByAdmin',
            'activeVerificationApplication.documents.reviewedByAdmin',
            'latestVerificationApplication.assignedAdmin',
            'latestVerificationApplication.reviewedByAdmin',
            'latestVerificationApplication.documents.reviewedByAdmin',
            'verificationEvents',
        ]);

        $application = $property->activeVerificationApplication ?? $property->latestVerificationApplication;
        $evaluation = $this->checklist->evaluate($property, $application);
        $canViewDocs = $admin->hasPermission('properties.view_documents');

        $reviewers = Admin::query()
            ->where('is_active', true)
            ->whereIn('role', [AdminRole::SuperAdmin->value, AdminRole::PropertyVerification->value])
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role'])
            ->map(static fn (Admin $reviewer): array => [
                'id' => $reviewer->id,
                'name' => $reviewer->name,
                'role_label' => $reviewer->role->label(),
            ])
            ->values()
            ->all();

        $allMedia = $property->media->map(static fn (PropertyMedia $m): array => $m->toPortalArray('admin'))->values();
        $propertyPhotos = $allMedia->filter(static fn (array $m): bool => ! (bool) $m['is_room_category'])->values()->all();
        $roomPhotos = $allMedia->filter(static fn (array $m): bool => (bool) $m['is_room_category'])->values()->all();

        $roomSummary = [
            'total_rooms' => $property->rooms->count(),
            'active_rooms' => $property->rooms->where('operational_status', PropertyRoomStatus::Active)->count(),
            'maintenance_rooms' => $property->rooms->where('operational_status', PropertyRoomStatus::Maintenance)->count(),
            'blocked_rooms' => $property->rooms->where('operational_status', PropertyRoomStatus::Blocked)->count(),
            'inactive_rooms' => $property->rooms->where('operational_status', PropertyRoomStatus::Inactive)->count(),
        ];

        $effectiveFields = $property->effectiveFieldsForRevision($application);

        return Inertia::render('admin/properties/show', [
            'property' => [
                ...PropertyPortalData::adminQueueRow($property),
                'description' => $effectiveFields['description'] ?? $property->description,
                'contact_person_name' => $effectiveFields['contact_person_name'] ?? $property->contact_person_name,
                'contact_phone' => $effectiveFields['contact_phone'] ?? $property->contact_phone,
                'contact_email' => $effectiveFields['contact_email'] ?? $property->contact_email,
                'address_line_1' => $effectiveFields['address_line_1'] ?? $property->address_line_1,
                'address_line_2' => $effectiveFields['address_line_2'] ?? $property->address_line_2,
                'landmark' => $effectiveFields['landmark'] ?? $property->landmark,
                'postal_code' => $effectiveFields['postal_code'] ?? $property->postal_code,
                'state' => $effectiveFields['state'] ?? $property->state,
                'country_code' => $effectiveFields['country_code'] ?? $property->country_code,
                'latitude' => $effectiveFields['latitude'] ?? $property->latitude,
                'longitude' => $effectiveFields['longitude'] ?? $property->longitude,
                'approved_details' => $property->toApprovedPropertyFieldsSnapshot(),
                'approved_snapshot' => $property->approved_snapshot,
                'suspended_reason' => $property->suspended_reason,
                'approved_at' => $property->approved_at?->toISOString(),
            ],
            'owner' => $property->owner !== null ? [
                'id' => $property->owner->id,
                'name' => $property->owner->name,
                'email' => $property->owner->email,
                'phone' => $property->owner->phone,
                'status' => $property->owner->status->value,
                'status_label' => $property->owner->status->label(),
                'approved_at' => $property->owner->approved_at?->toISOString(),
                'business_profile' => $property->owner->businessProfile?->toPortalArray(),
            ] : null,
            'application' => $application instanceof PropertyVerificationApplication ? [
                ...$application->toOwnerArray(),
                'internal_reviewer_notes' => $application->internal_reviewer_notes,
                'assigned_admin_id' => $application->assigned_admin_id,
                'assigned_reviewer_name' => $application->assignedAdmin?->name,
                'reviewed_by_name' => $application->reviewedByAdmin?->name,
            ] : null,
            'roomTypes' => $property->roomTypes->map(static fn (PropertyRoomType $rt): array => $rt->toPortalArray($application))->values()->all(),
            'rooms' => $property->rooms->map(static fn (PropertyRoom $r): array => $r->toPortalArray())->values()->all(),
            'roomSummary' => $roomSummary,
            'timingRules' => $this->timing->timingSummary(),
            'propertyPhotos' => $propertyPhotos,
            'roomPhotos' => $roomPhotos,
            'documents' => $application instanceof PropertyVerificationApplication
                ? $application->documents->map(static fn (PropertyVerificationDocument $d): array => $d->toAdminArray($canViewDocs))->values()->all()
                : [],
            'events' => $property->verificationEvents->map(static fn (PropertyVerificationEvent $e): array => $e->toTimelineArray())->values()->all(),
            'evaluation' => $evaluation,
            'reviewers' => $reviewers,
            'permissions' => [
                'can_view_documents' => $canViewDocs,
                'can_assign' => $application instanceof PropertyVerificationApplication && Gate::forUser($admin)->allows('assignByAdmin', $application),
                'can_start_review' => $application instanceof PropertyVerificationApplication && Gate::forUser($admin)->allows('startReviewByAdmin', $application),
                'can_request_information' => $application instanceof PropertyVerificationApplication && Gate::forUser($admin)->allows('requestInformationByAdmin', $application),
                'can_approve' => $application instanceof PropertyVerificationApplication && Gate::forUser($admin)->allows('approveByAdmin', $application),
                'can_reject' => $application instanceof PropertyVerificationApplication && Gate::forUser($admin)->allows('rejectByAdmin', $application),
                'can_moderate_media' => $admin->hasPermission('properties.review'),
                'can_manage_status' => Gate::forUser($admin)->allows('manageOperationalStatusByAdmin', $property),
                'can_suspend' => Gate::forUser($admin)->allows('suspendByAdmin', $property),
            ],
            'status' => $request->session()->get('status'),
        ]);
    }

    public function history(Request $request, Property $property): Response
    {
        $admin = $this->resolveAdmin($request);
        Gate::forUser($admin)->authorize('viewByAdmin', $property);

        $property->load([
            'category',
            'city',
            'owner:id,name,email',
            'verificationApplications.assignedAdmin:id,name',
            'verificationApplications.reviewedByAdmin:id,name',
            'verificationEvents',
        ]);

        return Inertia::render('admin/properties/history', [
            'property' => PropertyPortalData::adminQueueRow($property),
            'applications' => $property->verificationApplications
                ->map(static fn (PropertyVerificationApplication $app): array => [
                    ...$app->toOwnerArray(),
                    'internal_reviewer_notes' => $app->internal_reviewer_notes,
                    'assigned_reviewer_name' => $app->assignedAdmin?->name,
                    'reviewed_by_name' => $app->reviewedByAdmin?->name,
                ])
                ->values()
                ->all(),
            'events' => $property->verificationEvents
                ->map(static fn (PropertyVerificationEvent $e): array => $e->toTimelineArray())
                ->values()
                ->all(),
        ]);
    }

    public function assign(
        AssignPropertyReviewerRequest $request,
        Property $property,
        AssignPropertyReviewer $assignReviewer,
    ): RedirectResponse {
        $admin = $this->resolveAdmin($request);
        $application = $this->resolveActiveOrLatestApplication($property);
        Gate::forUser($admin)->authorize('assignByAdmin', $application);

        $assignee = Admin::query()->findOrFail($request->integer('assigned_admin_id'));
        $assignReviewer->execute($admin, $application, $assignee);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => sprintf('Assigned reviewer %s.', $assignee->name),
        ]);

        return to_route('admin.properties.show', $property)->with('status', 'reviewer-assigned');
    }

    public function startReview(
        Request $request,
        Property $property,
        StartPropertyReview $startReview,
    ): RedirectResponse {
        $admin = $this->resolveAdmin($request);
        $application = $this->resolveActiveOrLatestApplication($property);
        Gate::forUser($admin)->authorize('startReviewByAdmin', $application);

        $startReview->execute($admin, $application);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Property verification moved to Under Review.'),
        ]);

        return to_route('admin.properties.show', $property)->with('status', 'review-started');
    }

    public function moderateMedia(
        ModeratePropertyMediaRequest $request,
        Property $property,
        PropertyMedia $media,
        ModeratePropertyMedia $moderateMedia,
    ): RedirectResponse {
        $admin = $this->resolveAdmin($request);
        if ($media->property_id !== $property->id) {
            abort(404);
        }
        Gate::forUser($admin)->authorize('moderateByAdmin', $media);

        $target = PropertyMediaModerationStatus::from($request->string('moderation_status')->toString());
        $moderateMedia->execute($admin, $property, $media, $target, $request->input('moderation_note'));

        Inertia::flash('toast', [
            'type' => $target === PropertyMediaModerationStatus::Approved ? 'success' : 'info',
            'message' => sprintf('Photograph #%d %s.', $media->id, $target->label()),
        ]);

        return to_route('admin.properties.show', $property)->with('status', 'media-moderated');
    }

    public function requestInformation(
        RequestPropertyInformationRequest $request,
        Property $property,
        RequestPropertyInformation $requestInfo,
    ): RedirectResponse {
        $admin = $this->resolveAdmin($request);
        $application = $this->resolveActiveOrLatestApplication($property);
        Gate::forUser($admin)->authorize('requestInformationByAdmin', $application);

        /** @var array<int, string> $docNotes */
        $docNotes = $request->input('rejected_document_notes', []);
        /** @var array<int, string> $mediaNotes */
        $mediaNotes = $request->input('rejected_media_notes', []);

        $requestInfo->execute(
            actingAdmin: $admin,
            application: $application,
            requestedInformation: $request->string('requested_information')->toString(),
            internalReviewerNotes: $request->input('internal_reviewer_notes'),
            rejectedDocumentNotes: $docNotes,
            rejectedMediaNotes: $mediaNotes,
        );

        Inertia::flash('toast', [
            'type' => 'info',
            'message' => __('Requested clarification sent to partner.'),
        ]);

        return to_route('admin.properties.show', $property)->with('status', 'information-requested');
    }

    public function approve(
        ApprovePropertyApplicationRequest $request,
        Property $property,
        ApprovePropertyApplication $approveApplication,
    ): RedirectResponse {
        $admin = $this->resolveAdmin($request);
        $application = $this->resolveActiveOrLatestApplication($property);
        Gate::forUser($admin)->authorize('approveByAdmin', $application);

        $approveApplication->execute(
            actingAdmin: $admin,
            application: $application,
            decisionReason: $request->input('decision_reason'),
            internalReviewerNotes: $request->input('internal_reviewer_notes'),
        );

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Property approved and eligible media published cleanly.'),
        ]);

        return to_route('admin.properties.show', $property)->with('status', 'application-approved');
    }

    public function reject(
        RejectPropertyApplicationRequest $request,
        Property $property,
        RejectPropertyApplication $rejectApplication,
    ): RedirectResponse {
        $admin = $this->resolveAdmin($request);
        $application = $this->resolveActiveOrLatestApplication($property);
        Gate::forUser($admin)->authorize('rejectByAdmin', $application);

        $rejectApplication->execute(
            actingAdmin: $admin,
            application: $application,
            decisionReason: $request->string('decision_reason')->toString(),
            internalReviewerNotes: $request->input('internal_reviewer_notes'),
        );

        Inertia::flash('toast', [
            'type' => 'info',
            'message' => __('Property verification application rejected with reason recorded.'),
        ]);

        return to_route('admin.properties.show', $property)->with('status', 'application-rejected');
    }

    public function updateStatus(
        UpdateAdminPropertyStatusRequest $request,
        Property $property,
        ManagePropertyOperationalStatusByAdmin $manageStatus,
    ): RedirectResponse {
        $admin = $this->resolveAdmin($request);
        $targetStatus = PropertyOperationalStatus::from($request->string('status')->toString());

        if ($targetStatus === PropertyOperationalStatus::Suspended || $property->status === PropertyOperationalStatus::Suspended) {
            Gate::forUser($admin)->authorize('suspendByAdmin', $property);
        } else {
            Gate::forUser($admin)->authorize('manageOperationalStatusByAdmin', $property);
        }

        $manageStatus->execute($admin, $property, $targetStatus, $request->input('reason'));

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => sprintf('Property operational status set to %s.', $targetStatus->label()),
        ]);

        return to_route('admin.properties.show', $property)->with('status', 'operational-status-updated');
    }

    public function previewMedia(Request $request, Property $property, PropertyMedia $media): StreamedResponse
    {
        $admin = $this->resolveAdmin($request);
        if ($media->property_id !== $property->id) {
            abort(404);
        }
        Gate::forUser($admin)->authorize('viewByAdmin', $media);

        $disk = (string) config('tijum.property_media.private_disk', 'property_media_private');
        $path = $request->string('variant')->toString() === 'thumbnail'
            ? $media->thumbnail_path
            : $media->optimized_private_path;

        if (! Storage::disk($disk)->exists($path)) {
            abort(404);
        }

        return Storage::disk($disk)->response($path, $media->original_filename, [
            'Content-Type' => 'image/webp',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'no-store, private',
        ], 'inline');
    }

    private function resolveActiveOrLatestApplication(Property $property): PropertyVerificationApplication
    {
        $application = $property->activeVerificationApplication()->first()
            ?? $property->latestVerificationApplication()->first();

        if (! $application instanceof PropertyVerificationApplication) {
            abort(404);
        }

        return $application;
    }

    private function resolveAdmin(Request $request): Admin
    {
        $admin = $request->user('admin');
        if (! $admin instanceof Admin) {
            abort(403);
        }

        return $admin;
    }
}
