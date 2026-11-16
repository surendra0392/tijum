<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\Amenities;

use App\Actions\Admin\Amenities\ApprovePropertyAmenity;
use App\Actions\Admin\Amenities\ApprovePropertyRoomTypeAmenity;
use App\Actions\Admin\Amenities\AssignPropertyAmenityReviewer;
use App\Actions\Admin\Amenities\AssignPropertyRoomTypeAmenityReviewer;
use App\Actions\Admin\Amenities\RejectPropertyAmenity;
use App\Actions\Admin\Amenities\RejectPropertyRoomTypeAmenity;
use App\Actions\Admin\Amenities\RequestPropertyAmenityInformation;
use App\Actions\Admin\Amenities\RequestPropertyRoomTypeAmenityInformation;
use App\Actions\Admin\Amenities\StartPropertyAmenityReview;
use App\Actions\Admin\Amenities\StartPropertyRoomTypeAmenityReview;
use App\Enums\AmenityApplicabilityScope;
use App\Enums\AmenityVerificationStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Amenities\ApproveAmenityAssignmentRequest;
use App\Http\Requests\Admin\Amenities\AssignAmenityReviewerRequest;
use App\Http\Requests\Admin\Amenities\RejectAmenityAssignmentRequest;
use App\Http\Requests\Admin\Amenities\RequestAmenityInformationRequest;
use App\Http\Requests\Admin\Amenities\StoreAmenityCategoryRequest;
use App\Http\Requests\Admin\Amenities\StoreAmenityRequest;
use App\Http\Requests\Admin\Amenities\UpdateAmenityCategoryRequest;
use App\Http\Requests\Admin\Amenities\UpdateAmenityRequest;
use App\Models\Admin;
use App\Models\Amenity;
use App\Models\AmenityAssignmentEvent;
use App\Models\AmenityCategory;
use App\Models\PropertyAmenity;
use App\Models\PropertyRoomTypeAmenity;
use App\Services\PropertyAmenityReadiness;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AdminAmenityController extends Controller
{
    public function __construct(
        public readonly PropertyAmenityReadiness $readiness,
    ) {}

    public function index(Request $request): Response
    {
        $admin = $this->resolveAdmin($request);
        Gate::forUser($admin)->authorize('viewAnyByAdmin', Amenity::class);

        $statusFilter = trim($request->string('status')->toString());
        $scopeFilter = trim($request->string('scope')->toString());

        $propertyQuery = PropertyAmenity::query()
            ->where('is_current', true)
            ->with([
                'amenity.category',
                'property:id,name,property_reference,owner_id,city_id',
                'property.owner:id,name,email,status',
                'property.city:id,name',
                'assignedAdmin:id,name',
            ])
            ->orderByDesc('submitted_at')
            ->orderByDesc('id');

        $roomTypeQuery = PropertyRoomTypeAmenity::query()
            ->where('is_current', true)
            ->with([
                'amenity.category',
                'roomType:id,name,property_id',
                'property:id,name,property_reference,owner_id,city_id',
                'property.owner:id,name,email,status',
                'property.city:id,name',
                'assignedAdmin:id,name',
            ])
            ->orderByDesc('submitted_at')
            ->orderByDesc('id');

        if ($statusFilter !== '' && in_array($statusFilter, AmenityVerificationStatus::values(), true)) {
            $propertyQuery->where('status', $statusFilter);
            $roomTypeQuery->where('status', $statusFilter);
        }

        $assignments = collect();
        if ($scopeFilter === '' || $scopeFilter === 'property') {
            $assignments = $assignments->merge(
                $propertyQuery->get()->map(static fn (PropertyAmenity $a): array => $a->toAdminQueueArray()),
            );
        }
        if ($scopeFilter === '' || $scopeFilter === 'room_type') {
            $assignments = $assignments->merge(
                $roomTypeQuery->get()->map(static fn (PropertyRoomTypeAmenity $a): array => $a->toAdminQueueArray()),
            );
        }

        $stats = [
            'awaiting_review' => $assignments->filter(static fn (array $a): bool => in_array($a['status'], AmenityVerificationStatus::awaitingReviewValues(), true))->count(),
            'needs_information' => $assignments->where('status', AmenityVerificationStatus::NeedsInformation->value)->count(),
            'approved' => $assignments->where('status', AmenityVerificationStatus::Approved->value)->count(),
            'rejected' => $assignments->where('status', AmenityVerificationStatus::Rejected->value)->count(),
        ];

        $reviewers = Admin::query()
            ->where('is_active', true)
            ->whereIn('role', ['super_admin', 'property_verification'])
            ->orderBy('name')
            ->get(['id', 'name', 'role'])
            ->map(static fn (Admin $a): array => ['id' => $a->id, 'name' => $a->name, 'role' => $a->role->value])
            ->values()
            ->all();

        $categories = AmenityCategory::query()->ordered()->withCount('amenities')->get()->map(static fn (AmenityCategory $c): array => [
            ...$c->toOptionArray(),
            'amenities_count' => $c->amenities_count,
        ])->values()->all();

        $amenities = Amenity::query()->ordered()->with('category')->get()->map(static fn (Amenity $a): array => $a->toAdminArray())->values()->all();

        return Inertia::render('admin/amenities/index', [
            'assignments' => $assignments->sortByDesc('id')->values()->all(),
            'stats' => $stats,
            'categories' => $categories,
            'amenities' => $amenities,
            'reviewers' => $reviewers,
            'filters' => ['status' => $statusFilter, 'scope' => $scopeFilter],
            'statuses' => array_map(static fn (AmenityVerificationStatus $status): array => ['value' => $status->value, 'label' => $status->label()], AmenityVerificationStatus::cases()),
            'scopes' => array_map(static fn (AmenityApplicabilityScope $scope): array => ['value' => $scope->value, 'label' => $scope->label()], AmenityApplicabilityScope::cases()),
            'canManageCatalogue' => Gate::forUser($admin)->allows('manageByAdmin', Amenity::class),
        ]);
    }

    public function showProperty(Request $request, PropertyAmenity $assignment): Response
    {
        $admin = $this->resolveAdmin($request);
        Gate::forUser($admin)->authorize('viewByAdmin', $assignment);

        $assignment->load(['amenity.category', 'property.owner', 'property.city', 'assignedAdmin', 'reviewedByAdmin']);
        $events = AmenityAssignmentEvent::query()
            ->where('assignable_type', 'property_amenity')
            ->where('assignable_id', $assignment->id)
            ->orderByDesc('created_at')->orderByDesc('id')->get()
            ->map(static fn (AmenityAssignmentEvent $e): array => $e->toPortalArray())->values()->all();

        $reviewers = Admin::query()->where('is_active', true)->whereIn('role', ['super_admin', 'property_verification'])->orderBy('name')->get(['id', 'name'])->map(static fn (Admin $a): array => ['id' => $a->id, 'name' => $a->name])->values()->all();

        return Inertia::render('admin/amenities/show-property', [
            'assignment' => [
                ...$assignment->toAdminQueueArray(),
                ...$assignment->toSummaryArray(),
                'internal_reviewer_notes' => $assignment->internal_reviewer_notes,
                'approved_snapshot' => $assignment->approved_snapshot,
            ],
            'events' => $events,
            'reviewers' => $reviewers,
            'permissions' => [
                'can_assign' => Gate::forUser($admin)->allows('assignByAdmin', $assignment),
                'can_start_review' => Gate::forUser($admin)->allows('startReviewByAdmin', $assignment),
                'can_request_information' => Gate::forUser($admin)->allows('requestInformationByAdmin', $assignment),
                'can_approve' => Gate::forUser($admin)->allows('approveByAdmin', $assignment),
                'can_reject' => Gate::forUser($admin)->allows('rejectByAdmin', $assignment),
            ],
        ]);
    }

    public function showRoomType(Request $request, PropertyRoomTypeAmenity $assignment): Response
    {
        $admin = $this->resolveAdmin($request);
        Gate::forUser($admin)->authorize('viewByAdmin', $assignment);

        $assignment->load(['amenity.category', 'roomType', 'property.owner', 'property.city', 'assignedAdmin', 'reviewedByAdmin']);
        $events = AmenityAssignmentEvent::query()
            ->where('assignable_type', 'room_type_amenity')
            ->where('assignable_id', $assignment->id)
            ->orderByDesc('created_at')->orderByDesc('id')->get()
            ->map(static fn (AmenityAssignmentEvent $e): array => $e->toPortalArray())->values()->all();

        $reviewers = Admin::query()->where('is_active', true)->whereIn('role', ['super_admin', 'property_verification'])->orderBy('name')->get(['id', 'name'])->map(static fn (Admin $a): array => ['id' => $a->id, 'name' => $a->name])->values()->all();

        return Inertia::render('admin/amenities/show-room-type', [
            'assignment' => [
                ...$assignment->toAdminQueueArray(),
                ...$assignment->toSummaryArray(),
                'internal_reviewer_notes' => $assignment->internal_reviewer_notes,
                'approved_snapshot' => $assignment->approved_snapshot,
            ],
            'events' => $events,
            'reviewers' => $reviewers,
            'permissions' => [
                'can_assign' => Gate::forUser($admin)->allows('assignByAdmin', $assignment),
                'can_start_review' => Gate::forUser($admin)->allows('startReviewByAdmin', $assignment),
                'can_request_information' => Gate::forUser($admin)->allows('requestInformationByAdmin', $assignment),
                'can_approve' => Gate::forUser($admin)->allows('approveByAdmin', $assignment),
                'can_reject' => Gate::forUser($admin)->allows('rejectByAdmin', $assignment),
            ],
        ]);
    }

    public function assignProperty(AssignAmenityReviewerRequest $request, PropertyAmenity $assignment, AssignPropertyAmenityReviewer $action): RedirectResponse
    {
        $admin = $this->resolveAdmin($request);
        Gate::forUser($admin)->authorize('assignByAdmin', $assignment);
        $reviewer = Admin::query()->findOrFail($request->integer('assigned_admin_id'));
        $action->execute($admin, $assignment, $reviewer);
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Reviewer assigned.')]);

        return back();
    }

    public function startReviewProperty(Request $request, PropertyAmenity $assignment, StartPropertyAmenityReview $action): RedirectResponse
    {
        $admin = $this->resolveAdmin($request);
        Gate::forUser($admin)->authorize('startReviewByAdmin', $assignment);
        $action->execute($admin, $assignment);
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Amenity assignment moved to Under Review.')]);

        return back();
    }

    public function requestInformationProperty(RequestAmenityInformationRequest $request, PropertyAmenity $assignment, RequestPropertyAmenityInformation $action): RedirectResponse
    {
        $admin = $this->resolveAdmin($request);
        Gate::forUser($admin)->authorize('requestInformationByAdmin', $assignment);
        $action->execute($admin, $assignment, $request->string('requested_information')->toString(), $request->input('internal_reviewer_notes'));
        Inertia::flash('toast', ['type' => 'info', 'message' => __('Requested information from partner.')]);

        return back();
    }

    public function approveProperty(ApproveAmenityAssignmentRequest $request, PropertyAmenity $assignment, ApprovePropertyAmenity $action): RedirectResponse
    {
        $admin = $this->resolveAdmin($request);
        Gate::forUser($admin)->authorize('approveByAdmin', $assignment);
        $action->execute($admin, $assignment, $request->input('decision_reason'), $request->input('internal_reviewer_notes'));
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Amenity assignment approved.')]);

        return back();
    }

    public function rejectProperty(RejectAmenityAssignmentRequest $request, PropertyAmenity $assignment, RejectPropertyAmenity $action): RedirectResponse
    {
        $admin = $this->resolveAdmin($request);
        Gate::forUser($admin)->authorize('rejectByAdmin', $assignment);
        $action->execute($admin, $assignment, $request->string('decision_reason')->toString(), $request->input('internal_reviewer_notes'));
        Inertia::flash('toast', ['type' => 'info', 'message' => __('Amenity assignment rejected.')]);

        return back();
    }

    public function assignRoomType(AssignAmenityReviewerRequest $request, PropertyRoomTypeAmenity $assignment, AssignPropertyRoomTypeAmenityReviewer $action): RedirectResponse
    {
        $admin = $this->resolveAdmin($request);
        Gate::forUser($admin)->authorize('assignByAdmin', $assignment);
        $reviewer = Admin::query()->findOrFail($request->integer('assigned_admin_id'));
        $action->execute($admin, $assignment, $reviewer);
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Reviewer assigned.')]);

        return back();
    }

    public function startReviewRoomType(Request $request, PropertyRoomTypeAmenity $assignment, StartPropertyRoomTypeAmenityReview $action): RedirectResponse
    {
        $admin = $this->resolveAdmin($request);
        Gate::forUser($admin)->authorize('startReviewByAdmin', $assignment);
        $action->execute($admin, $assignment);
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Room-type amenity assignment moved to Under Review.')]);

        return back();
    }

    public function requestInformationRoomType(RequestAmenityInformationRequest $request, PropertyRoomTypeAmenity $assignment, RequestPropertyRoomTypeAmenityInformation $action): RedirectResponse
    {
        $admin = $this->resolveAdmin($request);
        Gate::forUser($admin)->authorize('requestInformationByAdmin', $assignment);
        $action->execute($admin, $assignment, $request->string('requested_information')->toString(), $request->input('internal_reviewer_notes'));
        Inertia::flash('toast', ['type' => 'info', 'message' => __('Requested information from partner.')]);

        return back();
    }

    public function approveRoomType(ApproveAmenityAssignmentRequest $request, PropertyRoomTypeAmenity $assignment, ApprovePropertyRoomTypeAmenity $action): RedirectResponse
    {
        $admin = $this->resolveAdmin($request);
        Gate::forUser($admin)->authorize('approveByAdmin', $assignment);
        $action->execute($admin, $assignment, $request->input('decision_reason'), $request->input('internal_reviewer_notes'));
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Room-type amenity assignment approved.')]);

        return back();
    }

    public function rejectRoomType(RejectAmenityAssignmentRequest $request, PropertyRoomTypeAmenity $assignment, RejectPropertyRoomTypeAmenity $action): RedirectResponse
    {
        $admin = $this->resolveAdmin($request);
        Gate::forUser($admin)->authorize('rejectByAdmin', $assignment);
        $action->execute($admin, $assignment, $request->string('decision_reason')->toString(), $request->input('internal_reviewer_notes'));
        Inertia::flash('toast', ['type' => 'info', 'message' => __('Room-type amenity assignment rejected.')]);

        return back();
    }

    public function storeCategory(StoreAmenityCategoryRequest $request): RedirectResponse
    {
        $admin = $this->resolveAdmin($request);
        Gate::forUser($admin)->authorize('manageByAdmin', Amenity::class);

        AmenityCategory::query()->create([
            'code' => trim($request->string('code')->toString()),
            'name' => trim($request->string('name')->toString()),
            'slug' => Str::slug($request->string('slug')->toString()),
            'description' => $request->input('description'),
            'display_order' => $request->integer('display_order', 0),
            'is_active' => $request->boolean('is_active', true),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Amenity category created.')]);

        return back();
    }

    public function updateCategory(UpdateAmenityCategoryRequest $request, AmenityCategory $category): RedirectResponse
    {
        $admin = $this->resolveAdmin($request);
        Gate::forUser($admin)->authorize('manageByAdmin', Amenity::class);

        $isActive = $request->boolean('is_active', $category->is_active);
        if (! $isActive && $category->amenities()->where('is_active', true)->exists()) {
            throw ValidationException::withMessages([
                'is_active' => __('Deactivate or move active amenities before deactivating this category.'),
            ]);
        }

        $category->update([
            'code' => trim($request->string('code')->toString()),
            'name' => trim($request->string('name')->toString()),
            'slug' => Str::slug($request->string('slug')->toString()),
            'description' => $request->input('description'),
            'display_order' => $request->integer('display_order', $category->display_order),
            'is_active' => $isActive,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Amenity category updated.')]);

        return back();
    }

    public function storeAmenity(StoreAmenityRequest $request): RedirectResponse
    {
        $admin = $this->resolveAdmin($request);
        Gate::forUser($admin)->authorize('manageByAdmin', Amenity::class);

        Amenity::query()->create([
            'amenity_category_id' => $request->integer('amenity_category_id'),
            'code' => trim($request->string('code')->toString()),
            'name' => trim($request->string('name')->toString()),
            'slug' => Str::slug($request->string('slug')->toString()),
            'description' => $request->input('description'),
            'applicability_scope' => $request->string('applicability_scope')->toString(),
            'icon_key' => $request->input('icon_key'),
            'is_customer_visible' => $request->boolean('is_customer_visible', true),
            'requires_review' => $request->boolean('requires_review', true),
            'display_order' => $request->integer('display_order', 0),
            'is_active' => $request->boolean('is_active', true),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Amenity created.')]);

        return back();
    }

    public function updateAmenity(UpdateAmenityRequest $request, Amenity $amenity): RedirectResponse
    {
        $admin = $this->resolveAdmin($request);
        Gate::forUser($admin)->authorize('manageByAdmin', Amenity::class);

        $isActive = $request->boolean('is_active', $amenity->is_active);
        if (! $isActive && $amenity->isReferencedOrHistorical()) {
            throw ValidationException::withMessages([
                'is_active' => __('This amenity is referenced by existing assignments and cannot be physically removed or deactivated here.'),
            ]);
        }

        $amenity->update([
            'amenity_category_id' => $request->integer('amenity_category_id'),
            'code' => trim($request->string('code')->toString()),
            'name' => trim($request->string('name')->toString()),
            'slug' => Str::slug($request->string('slug')->toString()),
            'description' => $request->input('description'),
            'applicability_scope' => $request->string('applicability_scope')->toString(),
            'icon_key' => $request->input('icon_key'),
            'is_customer_visible' => $request->boolean('is_customer_visible', $amenity->is_customer_visible),
            'requires_review' => $request->boolean('requires_review', $amenity->requires_review),
            'display_order' => $request->integer('display_order', $amenity->display_order),
            'is_active' => $isActive,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Amenity updated.')]);

        return back();
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
