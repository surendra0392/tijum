<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\PartnerVerification;

use App\Actions\Admin\PartnerVerification\ApprovePartnerApplication;
use App\Actions\Admin\PartnerVerification\AssignVerificationReviewer;
use App\Actions\Admin\PartnerVerification\RejectPartnerApplication;
use App\Actions\Admin\PartnerVerification\RequestPartnerInformation;
use App\Actions\Admin\PartnerVerification\StartPartnerReview;
use App\Enums\AdminRole;
use App\Enums\OwnerEntityType;
use App\Enums\OwnerVerificationDocumentStatus;
use App\Enums\OwnerVerificationDocumentType;
use App\Enums\OwnerVerificationStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\PartnerVerification\ApprovePartnerApplicationRequest;
use App\Http\Requests\Admin\PartnerVerification\AssignReviewerRequest;
use App\Http\Requests\Admin\PartnerVerification\RejectPartnerApplicationRequest;
use App\Http\Requests\Admin\PartnerVerification\RequestPartnerInformationRequest;
use App\Models\Admin;
use App\Models\City;
use App\Models\Owner;
use App\Models\OwnerBusinessProfile;
use App\Models\OwnerVerificationApplication;
use App\Models\OwnerVerificationDocument;
use App\Models\OwnerVerificationEvent;
use App\Services\PartnerVerificationChecklist;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class PartnerVerificationController extends Controller
{
    public function __construct(
        public readonly PartnerVerificationChecklist $checklist,
    ) {}

    public function index(Request $request): Response
    {
        $admin = $this->resolveAdmin($request);
        Gate::forUser($admin)->authorize('viewQueueByAdmin', OwnerVerificationApplication::class);

        $search = trim($request->string('search')->toString());
        $statusFilter = trim($request->string('status')->toString());
        $cityFilter = trim($request->string('city')->toString());
        $entityFilter = trim($request->string('entity_type')->toString());
        $dateFrom = trim($request->string('date_from')->toString());
        $dateTo = trim($request->string('date_to')->toString());

        $sortField = match ($request->string('sort')->toString()) {
            'application_number', 'status', 'created_at', 'submitted_at' => $request->string('sort')->toString(),
            default => 'submitted_at',
        };
        $sortDirection = $request->string('direction')->toString() === 'asc' ? 'asc' : 'desc';

        $countsByStatus = OwnerVerificationApplication::query()
            ->toBase()
            ->selectRaw('status, count(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        $stats = [
            'total' => (int) $countsByStatus->sum(),
            'submitted' => (int) ($countsByStatus[OwnerVerificationStatus::Submitted->value] ?? 0),
            'under_review' => (int) ($countsByStatus[OwnerVerificationStatus::UnderReview->value] ?? 0),
            'needs_information' => (int) ($countsByStatus[OwnerVerificationStatus::NeedsInformation->value] ?? 0),
            'approved' => (int) ($countsByStatus[OwnerVerificationStatus::Approved->value] ?? 0),
            'rejected' => (int) ($countsByStatus[OwnerVerificationStatus::Rejected->value] ?? 0),
            'draft' => (int) ($countsByStatus[OwnerVerificationStatus::Draft->value] ?? 0),
        ];

        $query = OwnerVerificationApplication::query()
            ->with([
                'owner.businessProfile',
                'owner.operatingCities',
                'assignedAdmin:id,name,email,role',
                'reviewedByAdmin:id,name,email,role',
            ]);

        if ($search !== '') {
            $like = '%'.addcslashes($search, '\\%_').'%';
            $query->where(function (Builder $q) use ($like): void {
                $q->where('application_number', 'like', $like)
                    ->orWhereHas('owner', function (Builder $ownerQuery) use ($like): void {
                        $ownerQuery->where('name', 'like', $like)
                            ->orWhere('email', 'like', $like)
                            ->orWhereHas('businessProfile', function (Builder $profileQuery) use ($like): void {
                                $profileQuery->where('display_business_name', 'like', $like)
                                    ->orWhere('legal_business_name', 'like', $like);
                            });
                    });
            });
        }

        if ($statusFilter !== '' && OwnerVerificationStatus::tryFrom($statusFilter) !== null) {
            $query->where('status', $statusFilter);
        }

        if ($cityFilter !== '') {
            $query->whereHas('owner.operatingCities', function (Builder $cityQuery) use ($cityFilter): void {
                $cityQuery->where('slug', $cityFilter);
            });
        }

        if ($entityFilter !== '' && OwnerEntityType::tryFrom($entityFilter) !== null) {
            $query->whereHas('owner.businessProfile', function (Builder $profileQuery) use ($entityFilter): void {
                $profileQuery->where('entity_type', $entityFilter);
            });
        }

        if ($dateFrom !== '') {
            try {
                $query->where('submitted_at', '>=', Carbon::parse($dateFrom)->startOfDay());
            } catch (\Throwable) {
                // Ignore malformed date filter input gracefully.
            }
        }

        if ($dateTo !== '') {
            try {
                $query->where('submitted_at', '<=', Carbon::parse($dateTo)->endOfDay());
            } catch (\Throwable) {
                // Ignore malformed date filter input gracefully.
            }
        }

        $query->orderBy($sortField, $sortDirection)->orderByDesc('id');

        $paginator = $query->paginate(15)->withQueryString();

        $rows = $paginator->getCollection()
            ->map(fn (OwnerVerificationApplication $application): array => $this->serializeApplicationSummary($application))
            ->values()
            ->all();

        $cities = City::query()
            ->ordered()
            ->get()
            ->map(static fn (City $city): array => $city->toSelectorArray())
            ->values()
            ->all();

        return Inertia::render('admin/partners/index', [
            'stats' => $stats,
            'applications' => [
                'data' => $rows,
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
            'filters' => [
                'search' => $search,
                'status' => $statusFilter,
                'city' => $cityFilter,
                'entity_type' => $entityFilter,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'sort' => $sortField,
                'direction' => $sortDirection,
            ],
            'cities' => $cities,
            'statuses' => array_map(
                static fn (OwnerVerificationStatus $status): array => [
                    'value' => $status->value,
                    'label' => $status->label(),
                ],
                OwnerVerificationStatus::cases(),
            ),
            'entityTypes' => array_map(
                static fn (OwnerEntityType $type): array => [
                    'value' => $type->value,
                    'label' => $type->label(),
                ],
                OwnerEntityType::cases(),
            ),
            'capabilities' => [
                'canReview' => $admin->hasPermission('partners.review'),
                'canAssign' => $admin->hasPermission('partners.assign'),
                'canViewDocuments' => $admin->hasPermission('partners.view_documents'),
            ],
            'status' => $request->session()->get('status'),
        ]);
    }

    public function show(Request $request, OwnerVerificationApplication $application): Response
    {
        $admin = $this->resolveAdmin($request);
        Gate::forUser($admin)->authorize('viewByAdmin', $application);

        $application->load([
            'owner.businessProfile',
            'owner.operatingCities',
            'assignedAdmin:id,name,email,role',
            'reviewedByAdmin:id,name,email,role',
            'documents.reviewedByAdmin:id,name,role',
            'events',
        ]);

        $owner = $application->owner;
        if (! $owner instanceof Owner) {
            abort(404);
        }

        $canViewDocuments = $admin->hasPermission('partners.view_documents');
        $evaluation = $this->checklist->evaluate($owner, $application);

        $assignableAdmins = $admin->hasPermission('partners.assign')
            ? Admin::query()
                ->where('is_active', true)
                ->whereIn('role', [
                    AdminRole::SuperAdmin->value,
                    AdminRole::PropertyVerification->value,
                ])
                ->orderBy('name')
                ->get(['id', 'name', 'email', 'role'])
                ->map(static fn (Admin $candidate): array => [
                    'id' => $candidate->id,
                    'name' => $candidate->name,
                    'role' => $candidate->role->value,
                    'role_label' => $candidate->role->label(),
                ])
                ->values()
                ->all()
            : [];

        $documents = $application->documents
            ->map(static fn (OwnerVerificationDocument $doc): array => $doc->toAdminArray($canViewDocuments))
            ->values()
            ->all();

        $events = $application->events
            ->filter(static fn (OwnerVerificationEvent $event): bool => $canViewDocuments || $event->event_type->isVisibleToOwner())
            ->map(static fn (OwnerVerificationEvent $event): array => $event->toAdminArray())
            ->values()
            ->all();

        return Inertia::render('admin/partners/verification/show', [
            'application' => $this->serializeApplicationDetail($application, $owner),
            'businessProfile' => $owner->businessProfile instanceof OwnerBusinessProfile
                ? $owner->businessProfile->toPortalArray()
                : null,
            'operatingCities' => $owner->operatingCities
                ->map(static fn (City $city): array => $city->toSelectorArray())
                ->values()
                ->all(),
            'evaluation' => [
                'email_verified' => $evaluation['email_verified'],
                'business_profile_complete' => $evaluation['business_profile_complete'],
                'operating_cities_complete' => $evaluation['operating_cities_complete'],
                'documents_complete' => $evaluation['documents_complete'],
                'ready_for_submission' => $evaluation['ready_for_submission'],
                'missing_requirements' => $evaluation['missing_requirements'],
                'checklist' => array_map(
                    static fn (array $item): array => [
                        'type' => $item['type'],
                        'label' => $item['label'],
                        'required' => $item['required'],
                        'fulfilled' => $item['fulfilled'],
                    ],
                    $evaluation['checklist'],
                ),
            ],
            'documents' => $documents,
            'events' => $events,
            'assignableAdmins' => $assignableAdmins,
            'documentTypes' => array_map(
                static fn (OwnerVerificationDocumentType $type): array => [
                    'value' => $type->value,
                    'label' => $type->label(),
                ],
                OwnerVerificationDocumentType::cases(),
            ),
            'capabilities' => [
                'canAssign' => Gate::forUser($admin)->allows('assignByAdmin', $application),
                'canStartReview' => Gate::forUser($admin)->allows('startReviewByAdmin', $application),
                'canRequestInformation' => Gate::forUser($admin)->allows('requestInformationByAdmin', $application),
                'canApprove' => Gate::forUser($admin)->allows('approveByAdmin', $application),
                'canReject' => Gate::forUser($admin)->allows('rejectByAdmin', $application),
                'canViewDocuments' => $canViewDocuments,
            ],
            'status' => $request->session()->get('status'),
        ]);
    }

    public function history(Request $request, OwnerVerificationApplication $application): Response
    {
        $admin = $this->resolveAdmin($request);
        Gate::forUser($admin)->authorize('viewByAdmin', $application);

        $application->load([
            'owner:id,name,email,status',
            'owner.businessProfile:id,owner_id,display_business_name,entity_type',
            'events',
        ]);

        $canViewDocuments = $admin->hasPermission('partners.view_documents');

        $events = $application->events
            ->filter(static fn (OwnerVerificationEvent $event): bool => $canViewDocuments || $event->event_type->isVisibleToOwner())
            ->map(static fn (OwnerVerificationEvent $event): array => $event->toAdminArray())
            ->values()
            ->all();

        $owner = $application->owner;
        if (! $owner instanceof Owner) {
            abort(404);
        }

        return Inertia::render('admin/partners/verification/history', [
            'application' => [
                'id' => $application->id,
                'application_number' => $application->application_number,
                'status' => $application->status->value,
                'status_label' => $application->status->label(),
                'revision_number' => $application->revision_number,
                'owner_name' => $owner->name,
                'owner_email' => $owner->email,
                'business_name' => $owner->businessProfile instanceof OwnerBusinessProfile
                    ? $owner->businessProfile->display_business_name
                    : $owner->name,
            ],
            'events' => $events,
        ]);
    }

    public function assign(
        AssignReviewerRequest $request,
        OwnerVerificationApplication $application,
        AssignVerificationReviewer $action,
    ): RedirectResponse {
        $admin = $this->resolveAdmin($request);
        Gate::forUser($admin)->authorize('assignByAdmin', $application);

        $rawId = $request->validated('assigned_admin_id');
        $assignedId = $rawId !== null ? (int) $rawId : null;

        $action->execute($admin, $application, $assignedId);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Reviewer assignment updated.'),
        ]);

        return to_route('admin.partners.show', $application)
            ->with('status', 'reviewer-assigned');
    }

    public function startReview(
        Request $request,
        OwnerVerificationApplication $application,
        StartPartnerReview $action,
    ): RedirectResponse {
        $admin = $this->resolveAdmin($request);
        Gate::forUser($admin)->authorize('startReviewByAdmin', $application);

        $action->execute($admin, $application);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Application moved to Under Review.'),
        ]);

        return to_route('admin.partners.show', $application)
            ->with('status', 'review-started');
    }

    public function requestInformation(
        RequestPartnerInformationRequest $request,
        OwnerVerificationApplication $application,
        RequestPartnerInformation $action,
    ): RedirectResponse {
        $admin = $this->resolveAdmin($request);
        Gate::forUser($admin)->authorize('requestInformationByAdmin', $application);

        /** @var array{
         *     requested_information: string,
         *     required_profile_changes?: list<string>,
         *     required_document_types?: list<string>,
         *     document_notes?: array<string, string|null>,
         *     internal_reviewer_notes?: string|null,
         * } $validated */
        $validated = $request->validated();

        $action->execute($admin, $application, $validated);

        Inertia::flash('toast', [
            'type' => 'info',
            'message' => __('Information request sent to partner.'),
        ]);

        return to_route('admin.partners.show', $application)
            ->with('status', 'information-requested');
    }

    public function approve(
        ApprovePartnerApplicationRequest $request,
        OwnerVerificationApplication $application,
        ApprovePartnerApplication $action,
    ): RedirectResponse {
        $admin = $this->resolveAdmin($request);
        Gate::forUser($admin)->authorize('approveByAdmin', $application);

        $reason = $request->validated('decision_reason');
        $internalNotes = $request->validated('internal_reviewer_notes');

        $action->execute(
            $admin,
            $application,
            is_string($reason) ? $reason : null,
            is_string($internalNotes) ? $internalNotes : null,
        );

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Partner application approved and owner account activated.'),
        ]);

        return to_route('admin.partners.show', $application)
            ->with('status', 'application-approved');
    }

    public function reject(
        RejectPartnerApplicationRequest $request,
        OwnerVerificationApplication $application,
        RejectPartnerApplication $action,
    ): RedirectResponse {
        $admin = $this->resolveAdmin($request);
        Gate::forUser($admin)->authorize('rejectByAdmin', $application);

        /** @var string $reason */
        $reason = $request->validated('decision_reason');
        $internalNotes = $request->validated('internal_reviewer_notes');

        /** @var array<string, string|null> $documentNotes */
        $documentNotes = is_array($request->validated('document_notes'))
            ? $request->validated('document_notes')
            : [];

        $action->execute(
            $admin,
            $application,
            $reason,
            is_string($internalNotes) ? $internalNotes : null,
            $documentNotes,
        );

        Inertia::flash('toast', [
            'type' => 'info',
            'message' => __('Partner application declined with documented decision reason.'),
        ]);

        return to_route('admin.partners.show', $application)
            ->with('status', 'application-rejected');
    }

    private function resolveAdmin(Request $request): Admin
    {
        $admin = $request->user('admin');

        if (! $admin instanceof Admin) {
            abort(403);
        }

        return $admin;
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeApplicationSummary(OwnerVerificationApplication $application): array
    {
        $owner = $application->owner;
        $profile = $owner->businessProfile;

        return [
            'id' => $application->id,
            'application_number' => $application->application_number,
            'status' => $application->status->value,
            'status_label' => $application->status->label(),
            'revision_number' => $application->revision_number,
            'business_name' => $profile instanceof OwnerBusinessProfile
                ? $profile->display_business_name
                : $owner->name,
            'entity_type' => $profile instanceof OwnerBusinessProfile
                ? $profile->entity_type->value
                : null,
            'entity_type_label' => $profile instanceof OwnerBusinessProfile
                ? $profile->entity_type->label()
                : 'Not saved yet',
            'owner_name' => $owner->name,
            'owner_email' => $owner->email,
            'owner_status' => $owner->status->value,
            'owner_status_label' => $owner->status->label(),
            'operating_cities' => $owner->operatingCities
                ->map(static fn (City $city): string => $city->name)
                ->values()
                ->all(),
            'submitted_at' => $application->submitted_at?->toISOString(),
            'reviewed_at' => $application->reviewed_at?->toISOString(),
            'assigned_reviewer_name' => $application->assignedAdmin?->name,
            'assigned_admin_id' => $application->assigned_admin_id,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeApplicationDetail(
        OwnerVerificationApplication $application,
        Owner $owner,
    ): array {
        $requestedChanges = is_array($application->requested_changes)
            ? array_values(array_filter($application->requested_changes, 'is_array'))
            : [];

        return [
            'id' => $application->id,
            'application_number' => $application->application_number,
            'status' => $application->status->value,
            'status_label' => $application->status->label(),
            'revision_number' => $application->revision_number,
            'declaration_version' => $application->declaration_version,
            'declaration_accepted_at' => $application->declaration_accepted_at?->toISOString(),
            'submitted_at' => $application->submitted_at?->toISOString(),
            'reviewed_at' => $application->reviewed_at?->toISOString(),
            'requested_information' => $application->requested_information,
            'requested_changes' => $application->requested_changes ?? $requestedChanges,
            'decision_reason' => $application->decision_reason,
            'internal_reviewer_notes' => $application->internal_reviewer_notes,
            'assigned_admin_id' => $application->assigned_admin_id,
            'assigned_reviewer_name' => $application->assignedAdmin?->name,
            'reviewed_by_name' => $application->reviewedByAdmin?->name,
            'created_at' => $application->created_at?->toISOString(),
            'updated_at' => $application->updated_at?->toISOString(),
            'owner' => [
                'id' => $owner->id,
                'name' => $owner->name,
                'email' => $owner->email,
                'phone' => $owner->phone,
                'status' => $owner->status->value,
                'status_label' => $owner->status->label(),
                'email_verified' => $owner->hasVerifiedEmail(),
                'email_verified_at' => $owner->email_verified_at?->toISOString(),
                'approved_at' => $owner->approved_at?->toISOString(),
                'created_at' => $owner->created_at?->toISOString(),
            ],
            'active_documents_count' => $application->documents
                ->filter(static fn (OwnerVerificationDocument $doc): bool => $doc->status !== OwnerVerificationDocumentStatus::Replaced)
                ->count(),
        ];
    }
}
