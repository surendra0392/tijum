<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\CaseStatus;
use App\Enums\PointsTransactionStatus;
use App\Enums\ReservationStatus;
use App\Models\CustomerPointsLedger;
use App\Models\CustomerPointsWallet;
use App\Models\CustomerProtectionCase;
use App\Models\Reservation;
use App\Models\User;
use App\Services\Notifications\NotificationDispatcher;
use App\Services\Reviews\ReviewEligibilityService;
use App\Services\StayTimingPolicy;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;

class SendScheduledNotificationRemindersCommand extends Command
{
    protected $signature = 'tijum:send-notification-reminders';

    protected $description = 'Send scheduled transactional reminders for pending payments, upcoming stays, and review invitations.';

    public function handle(
        NotificationDispatcher $dispatcher,
        StayTimingPolicy $timing,
        ReviewEligibilityService $reviewEligibility
    ): int {
        $tz = $timing->timezone();
        $now = CarbonImmutable::now($tz);

        // 1. Payment Deadline Reminders (approx 5 mins left before 15-min expiry)
        $this->sendPaymentDeadlineReminders($dispatcher, $now);

        // 2. Upcoming Stay Reminders (check-in tomorrow)
        $this->sendUpcomingStayReminders($dispatcher, $now, $timing);

        // 3. Review Invitations for Completed Stays
        $this->sendReviewInvitations($dispatcher, $now, $reviewEligibility);

        // 4. Grievance SLA Warnings for Admins
        $this->sendGrievanceSlaWarnings($dispatcher, $now);

        // 5. Points Expiring Reminders (expiring within 30 days)
        $this->sendPointsExpiringReminders($dispatcher, $now);

        return self::SUCCESS;
    }

    private function sendPaymentDeadlineReminders(NotificationDispatcher $dispatcher, CarbonImmutable $now): void
    {
        // 3 to 7 minutes remaining on awaiting payment
        $reservations = Reservation::query()
            ->where('status', ReservationStatus::AwaitingPayment->value)
            ->whereNotNull('payment_deadline_at')
            ->where('payment_deadline_at', '>', $now)
            ->where('payment_deadline_at', '<=', $now->addMinutes(7))
            ->with(['user', 'property'])
            ->get();

        foreach ($reservations as $res) {
            if ($res->user === null || $res->property === null) {
                continue;
            }

            $dispatcher->dispatch(
                eventType: 'reservation.payment_deadline_reminder',
                recipients: $res->user,
                variables: [
                    'customer_name' => $res->user->name,
                    'booking_reference' => $res->booking_reference,
                    'property_name' => $res->property->name,
                    'payment_deadline' => $res->payment_deadline_at?->setTimezone($now->getTimezone())->format('H:i').' IST',
                    'action_url' => route('reservations.show', $res),
                ],
                related: $res,
                relatedReference: $res->booking_reference,
                idempotencySeed: "{$res->booking_reference}:deadline_reminder"
            );
        }
    }

    private function sendUpcomingStayReminders(NotificationDispatcher $dispatcher, CarbonImmutable $now, StayTimingPolicy $timing): void
    {
        $tomorrowDate = $now->addDay()->toDateString();

        $reservations = Reservation::query()
            ->where('status', ReservationStatus::Confirmed->value)
            ->whereDate('check_in_date', $tomorrowDate)
            ->with(['user', 'property.owner', 'roomType'])
            ->get();

        $checkInTime = $timing->getStandardCheckInTime().' IST';

        foreach ($reservations as $res) {
            if ($res->user === null || $res->property === null) {
                continue;
            }

            $addressParts = array_filter([
                $res->property->address_line_1 ?? null,
                $res->snapshot_property_locality,
                $res->snapshot_property_city,
                $res->snapshot_property_state,
            ]);
            $propertyAddress = $addressParts !== [] ? implode(', ', $addressParts) : 'See reservation details';
            $owner = $res->property->owner;
            $contactInfo = $owner !== null
                ? trim($owner->name.($owner->phone ? ' ('.$owner->phone.')' : ''))
                : 'Available on your reservation details page';

            $dispatcher->dispatch(
                eventType: 'reservation.upcoming_stay',
                recipients: $res->user,
                variables: [
                    'customer_name' => $res->user->name,
                    'booking_reference' => $res->booking_reference,
                    'property_name' => $res->property->name,
                    'property_address' => $propertyAddress,
                    'check_in_date' => $res->check_in_date->format('d M Y'),
                    'check_in_time' => $checkInTime,
                    'contact_information' => $contactInfo,
                    'action_url' => route('reservations.show', $res),
                ],
                related: $res,
                relatedReference: $res->booking_reference,
                idempotencySeed: "{$res->booking_reference}:upcoming_stay_{$res->check_in_date->toDateString()}"
            );

            if ($owner !== null) {
                $dispatcher->dispatch(
                    eventType: 'partner.upcoming_checkin',
                    recipients: $owner,
                    variables: [
                        'owner_name' => $owner->name,
                        'booking_reference' => $res->booking_reference,
                        'property_name' => $res->property->name,
                        'check_in_date' => $res->check_in_date->format('d M Y'),
                        'guest_count' => (string) $res->guest_count,
                        'room_type' => $res->snapshot_room_type_name ?: $res->roomType->name,
                        'action_url' => route('owner.reservations.show', $res),
                    ],
                    related: $res,
                    relatedReference: $res->booking_reference,
                    idempotencySeed: "{$res->booking_reference}:partner_upcoming_checkin_{$res->check_in_date->toDateString()}"
                );
            }
        }
    }

    private function sendReviewInvitations(
        NotificationDispatcher $dispatcher,
        CarbonImmutable $now,
        ReviewEligibilityService $reviewEligibility
    ): void {
        // Find confirmed reservations checked out within last 3 days
        $candidates = Reservation::query()
            ->where('status', ReservationStatus::Confirmed->value)
            ->whereDate('checkout_date', '>=', $now->subDays(3)->toDateString())
            ->whereDate('checkout_date', '<=', $now->toDateString())
            ->with(['user', 'property', 'review'])
            ->get();

        foreach ($candidates as $res) {
            if ($res->user === null || $res->property === null || $res->review !== null) {
                continue;
            }

            $eligibility = $reviewEligibility->checkEligibility($res, $res->user);
            if (! $eligibility->isEligible) {
                continue;
            }

            $reviewUrl = route('reservations.review.create', $res);

            $dispatcher->dispatch(
                eventType: 'review.invitation',
                recipients: $res->user,
                variables: [
                    'customer_name' => $res->user->name,
                    'booking_reference' => $res->booking_reference,
                    'property_name' => $res->property->name,
                    'review_url' => $reviewUrl,
                    'action_url' => $reviewUrl,
                ],
                related: $res,
                relatedReference: $res->booking_reference,
                idempotencySeed: "{$res->booking_reference}:review_invitation"
            );
        }
    }

    private function sendGrievanceSlaWarnings(NotificationDispatcher $dispatcher, CarbonImmutable $now): void
    {
        $cases = CustomerProtectionCase::query()
            ->whereIn('status', [CaseStatus::Open->value, CaseStatus::UnderReview->value])
            ->where('priority', 'urgent')
            ->where('created_at', '<=', $now->subHours(24))
            ->with(['property', 'reservation'])
            ->limit(5)
            ->get();

        foreach ($cases as $case) {
            $dispatcher->dispatchToAdmins(
                eventType: 'admin.customer_protection_urgent',
                variables: [
                    'case_reference' => $case->case_reference,
                    'property_name' => $case->property->name,
                    'booking_reference' => $case->reservation->booking_reference,
                    'priority' => $case->priority->label(),
                    'action_url' => route('admin.customer-cases.show', $case->case_reference),
                ],
                related: $case,
                relatedReference: $case->case_reference,
                idempotencySeed: "urgent_sla_warning_{$case->id}_{$now->toDateString()}",
            );
        }
    }

    private function sendPointsExpiringReminders(NotificationDispatcher $dispatcher, CarbonImmutable $now): void
    {
        $entries = CustomerPointsLedger::query()
            ->where('status', PointsTransactionStatus::Available->value)
            ->where('points_remaining', '>', 0)
            ->whereNotNull('expires_at')
            ->where('expires_at', '>', $now)
            ->where('expires_at', '<=', $now->addDays(30))
            ->with('user')
            ->get()
            ->groupBy('user_id');

        foreach ($entries as $userId => $userEntries) {
            /** @var User|null $user */
            $user = $userEntries->first()?->user;
            if ($user === null) {
                continue;
            }

            $expiringPoints = (int) $userEntries->sum('points_remaining');
            if ($expiringPoints <= 0) {
                continue;
            }

            $earliestExpiry = $userEntries->min('expires_at');
            $expiryDate = $earliestExpiry instanceof CarbonImmutable
                ? $earliestExpiry
                : CarbonImmutable::parse((string) $earliestExpiry);

            $walletBalance = (int) (CustomerPointsWallet::query()->where('user_id', (int) $userId)->value('available_points') ?? $expiringPoints);

            $dispatcher->dispatch(
                eventType: 'rewards.points_expiring',
                recipients: $user,
                variables: [
                    'customer_name' => $user->name,
                    'points_balance' => number_format($walletBalance),
                    'expiring_points' => number_format($expiringPoints),
                    'expires_at' => $expiryDate->format('d M Y'),
                    'action_url' => url('/rewards'),
                ],
                related: $user,
                relatedReference: 'PTS-EXP-'.$expiryDate->format('Ymd'),
                idempotencySeed: "points_expiring_{$user->id}_{$expiryDate->toDateString()}"
            );
        }
    }
}
