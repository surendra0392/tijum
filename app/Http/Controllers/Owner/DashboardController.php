<?php

declare(strict_types=1);

namespace App\Http\Controllers\Owner;

use App\Enums\CaseStatus;
use App\Enums\OwnerStatus;
use App\Enums\OwnerVerificationStatus;
use App\Enums\ReservationStatus;
use App\Enums\ReviewStatus;
use App\Enums\SettlementStatus;
use App\Http\Controllers\Controller;
use App\Models\City;
use App\Models\CustomerProtectionCase;
use App\Models\Owner;
use App\Models\OwnerVerificationApplication;
use App\Models\PropertyReview;
use App\Models\PropertyRoom;
use App\Models\PropertyRoomType;
use App\Models\Reservation;
use App\Services\PartnerVerificationChecklist;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(
        public readonly PartnerVerificationChecklist $checklist,
    ) {}

    public function __invoke(Request $request): Response
    {
        /** @var Owner $owner */
        $owner = $request->user('owner');
        $owner->loadMissing(['businessProfile', 'operatingCities']);

        $application = $owner->activeVerificationApplication()->with('documents')->first()
            ?? $owner->latestVerificationApplication()->with('documents')->first();

        $propertiesCount = $owner->properties()->count();
        $verifiedPropertiesCount = $owner->properties()->where('is_verified', true)->count();
        $roomTypesCount = PropertyRoomType::query()
            ->whereHas('property', static fn ($q) => $q->where('owner_id', $owner->id))
            ->count();
        $roomsCount = PropertyRoom::query()
            ->whereHas('property', static fn ($q) => $q->where('owner_id', $owner->id))
            ->count();

        $emailVerified = $owner->hasVerifiedEmail();
        $evaluation = $this->checklist->evaluate($owner, $application);

        $nextAction = $this->resolveNextAction($owner, $application, $evaluation, $emailVerified, $propertiesCount);

        $propertyApprovalStatus = match ($owner->status) {
            OwnerStatus::PendingVerification => 'Blocked until partner email verification is completed',
            OwnerStatus::PendingReview => $application instanceof OwnerVerificationApplication
                ? sprintf('Partner verification status: %s (properties stay locked until partner approval)', $application->status->label())
                : 'Partner verification application not yet submitted',
            OwnerStatus::Active => $propertiesCount === 0
                ? 'Partner approved — ready to register your first hostel, PG, or homestay property'
                : sprintf('%d property registered (%d independently verified by TIJUM)', $propertiesCount, $verifiedPropertiesCount),
            OwnerStatus::Rejected => 'Partner account rejected',
            OwnerStatus::Suspended => 'Partner operations suspended',
        };

        $today = CarbonImmutable::now('Asia/Kolkata')->toDateString();

        $todayArrivals = Reservation::query()
            ->whereHas('property', static fn ($p) => $p->where('owner_id', $owner->id))
            ->where('status', ReservationStatus::Confirmed)
            ->whereDate('check_in_date', '<=', $today)
            ->whereNull('checked_in_at')
            ->count();

        $todayDepartures = Reservation::query()
            ->whereHas('property', static fn ($p) => $p->where('owner_id', $owner->id))
            ->where('status', ReservationStatus::Confirmed)
            ->whereDate('checkout_date', '<=', $today)
            ->whereNotNull('checked_in_at')
            ->whereNull('checked_out_at')
            ->count();

        $inHouseGuests = Reservation::query()
            ->whereHas('property', static fn ($p) => $p->where('owner_id', $owner->id))
            ->where('status', ReservationStatus::Confirmed)
            ->whereNotNull('checked_in_at')
            ->whereNull('checked_out_at')
            ->count();

        $activeReservations = Reservation::query()
            ->whereHas('property', static fn ($p) => $p->where('owner_id', $owner->id))
            ->where('status', ReservationStatus::Confirmed)
            ->whereDate('checkout_date', '>=', $today)
            ->count();

        $pendingReviews = PropertyReview::query()
            ->whereHas('property', static fn ($p) => $p->where('owner_id', $owner->id))
            ->where('status', ReviewStatus::Published)
            ->whereDoesntHave('response')
            ->count();

        $openComplaints = CustomerProtectionCase::query()
            ->where('owner_id', $owner->id)
            ->whereNotIn('status', [CaseStatus::Resolved, CaseStatus::Closed])
            ->count();

        $unsettledPayoutMinor = (int) $owner->settlements()
            ->whereIn('status', [SettlementStatus::Draft, SettlementStatus::PendingApproval, SettlementStatus::Approved])
            ->sum('net_settlement_amount_minor');

        return Inertia::render('owner/dashboard', [
            'status' => $request->session()->get('status'),
            'operationsSummary' => [
                'todayArrivals' => $todayArrivals,
                'todayDepartures' => $todayDepartures,
                'inHouseGuests' => $inHouseGuests,
                'activeReservations' => $activeReservations,
                'pendingReviews' => $pendingReviews,
                'openComplaints' => $openComplaints,
                'unsettledPayoutMinor' => $unsettledPayoutMinor,
            ],
            'propertySummary' => [
                'propertiesTotal' => $propertiesCount,
                'verifiedProperties' => $verifiedPropertiesCount,
                'roomTypesTotal' => $roomTypesCount,
                'roomsTotal' => $roomsCount,
            ],
            'onboarding' => [
                'emailVerified' => $emailVerified,
                'accountStatus' => $owner->status->value,
                'accountStatusLabel' => $owner->status->label(),
                'canPublishProperties' => $owner->canPublishProperties(),
                'propertyApprovalStatus' => $propertyApprovalStatus,
                'nextAction' => $nextAction,
                'steps' => [
                    [
                        'key' => 'account_created',
                        'label' => 'Partner account created',
                        'completed' => true,
                    ],
                    [
                        'key' => 'email_verified',
                        'label' => 'Email address verified',
                        'completed' => $emailVerified,
                    ],
                    [
                        'key' => 'partner_approved',
                        'label' => 'Partner verification approved',
                        'completed' => $owner->status === OwnerStatus::Active,
                    ],
                ],
            ],
            'application' => $application?->toOwnerArray(),
            'evaluation' => $evaluation,
            'businessProfile' => $owner->businessProfile?->toPortalArray(),
            'operatingCities' => $owner->operatingCities
                ->map(static fn (City $city): array => $city->toSelectorArray())
                ->values()
                ->all(),
        ]);
    }

    /**
     * @param  array{ready_for_submission: bool}  $evaluation
     * @return array{title: string, description: string, actionLabel: string, actionHref: string}
     */
    private function resolveNextAction(
        Owner $owner,
        ?OwnerVerificationApplication $application,
        array $evaluation,
        bool $emailVerified,
        int $propertiesCount = 0,
    ): array {
        if (! $emailVerified) {
            return [
                'title' => 'Verify your partner email address',
                'description' => 'Confirm your email link before submitting your TIJUM partner verification application.',
                'actionLabel' => 'Open verification screen',
                'actionHref' => route('owner.verification.notice'),
            ];
        }

        if ($owner->status === OwnerStatus::Active) {
            if ($propertiesCount === 0) {
                return [
                    'title' => 'Register your first accommodation property',
                    'description' => 'Your partner account is approved. Add an Independent Hostel, PG Accommodation, or Homestay, configure AC/Non-AC room types, list physical rooms, upload photos, and submit for property verification.',
                    'actionLabel' => 'Add First Property',
                    'actionHref' => route('owner.properties.create'),
                ];
            }

            return [
                'title' => 'Manage your properties & physical rooms',
                'description' => 'Track individual property verification progress, configure room types, maintain physical room availability, and manage uploaded photographs.',
                'actionLabel' => 'My Properties',
                'actionHref' => route('owner.properties.index'),
            ];
        }

        if (! $application instanceof OwnerVerificationApplication || $application->status === OwnerVerificationStatus::Draft) {
            return [
                'title' => $evaluation['ready_for_submission']
                    ? 'Review and submit your partner application'
                    : 'Complete your partner onboarding checklist',
                'description' => $evaluation['ready_for_submission']
                    ? 'All required profile details, launch cities, and documents are uploaded. Confirm the declaration to submit for TIJUM review.'
                    : 'Complete your business profile, choose intended operating cities, and upload required verification evidence.',
                'actionLabel' => $evaluation['ready_for_submission'] ? 'Review & Submit' : 'Continue Onboarding',
                'actionHref' => $evaluation['ready_for_submission']
                    ? route('owner.onboarding.review')
                    : route('owner.onboarding.index'),
            ];
        }

        return match ($application->status) {
            OwnerVerificationStatus::Submitted => [
                'title' => 'Application submitted and queued',
                'description' => "Application {$application->application_number} has been received and awaits assignment to a verification specialist.",
                'actionLabel' => 'View Application Status',
                'actionHref' => route('owner.onboarding.status'),
            ],
            OwnerVerificationStatus::UnderReview => [
                'title' => 'Application currently under review',
                'description' => "TIJUM reviewers are inspecting {$application->application_number}. No edits are needed unless requested.",
                'actionLabel' => 'Track Progress',
                'actionHref' => route('owner.onboarding.status'),
            ],
            OwnerVerificationStatus::NeedsInformation => [
                'title' => 'Action needed: provide requested updates',
                'description' => $application->requested_information ?? 'The TIJUM team requested corrections before continuing verification.',
                'actionLabel' => 'Respond & Resubmit',
                'actionHref' => route('owner.onboarding.status'),
            ],
            OwnerVerificationStatus::Approved => [
                'title' => 'Partner application approved',
                'description' => 'Your TIJUM partner verification has been approved.',
                'actionLabel' => 'View Approval Details',
                'actionHref' => route('owner.onboarding.status'),
            ],
            OwnerVerificationStatus::Rejected => [
                'title' => 'Previous application not approved',
                'description' => $application->decision_reason ?? 'Review the verification feedback and start a corrected revision when ready.',
                'actionLabel' => 'Review Decision Details',
                'actionHref' => route('owner.onboarding.status'),
            ],
            OwnerVerificationStatus::Withdrawn => [
                'title' => 'Previous application withdrawn',
                'description' => 'You withdrew your earlier submission. Your saved business profile and cities remain ready for a new revision.',
                'actionLabel' => 'Review & Restart Onboarding',
                'actionHref' => route('owner.onboarding.status'),
            ],
        };
    }
}
