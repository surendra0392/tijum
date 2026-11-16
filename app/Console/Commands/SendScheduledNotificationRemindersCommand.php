<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\CaseStatus;
use App\Enums\ReservationStatus;
use App\Models\CustomerProtectionCase;
use App\Models\Reservation;
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
        $this->sendUpcomingStayReminders($dispatcher, $now);

        // 3. Review Invitations for Completed Stays
        $this->sendReviewInvitations($dispatcher, $now, $reviewEligibility);

        // 4. Grievance SLA Warnings for Admins
        $this->sendGrievanceSlaWarnings($dispatcher, $now);

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
                    'payment_deadline' => $res->payment_deadline_at?->format('H:i').' IST',
                    'action_url' => url("/reservations/{$res->id}"),
                ],
                related: $res,
                relatedReference: $res->booking_reference,
                idempotencySeed: "{$res->booking_reference}:deadline_reminder"
            );
        }
    }

    private function sendUpcomingStayReminders(NotificationDispatcher $dispatcher, CarbonImmutable $now): void
    {
        $tomorrowDate = $now->addDay()->toDateString();

        $reservations = Reservation::query()
            ->where('status', ReservationStatus::Confirmed->value)
            ->whereDate('check_in_date', $tomorrowDate)
            ->with(['user', 'property'])
            ->get();

        foreach ($reservations as $res) {
            if ($res->user === null || $res->property === null) {
                continue;
            }

            $dispatcher->dispatch(
                eventType: 'reservation.upcoming_stay',
                recipients: $res->user,
                variables: [
                    'customer_name' => $res->user->name,
                    'booking_reference' => $res->booking_reference,
                    'property_name' => $res->property->name,
                    'check_in_date' => $res->check_in_date->format('d M Y'),
                    'action_url' => url("/reservations/{$res->id}"),
                ],
                related: $res,
                relatedReference: $res->booking_reference,
                idempotencySeed: "{$res->booking_reference}:upcoming_stay_{$res->check_in_date->toDateString()}"
            );
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

            $dispatcher->dispatch(
                eventType: 'review.invitation',
                recipients: $res->user,
                variables: [
                    'customer_name' => $res->user->name,
                    'booking_reference' => $res->booking_reference,
                    'property_name' => $res->property->name,
                    'action_url' => url("/reservations/{$res->id}/reviews/create"),
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
            ->with('property')
            ->limit(5)
            ->get();

        foreach ($cases as $case) {
            $dispatcher->dispatchToAdmins(
                eventType: 'admin.customer_protection_urgent',
                variables: [
                    'case_reference' => $case->case_reference,
                    'property_name' => $case->property?->name ?? 'Accommodation',
                    'action_url' => url("/admin/cases/{$case->id}"),
                ],
                related: $case,
                relatedReference: $case->case_reference,
            );
        }
    }
}
