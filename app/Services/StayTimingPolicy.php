<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\PlatformSetting;
use App\Models\PropertyRoomType;
use Carbon\CarbonImmutable;
use InvalidArgumentException;

/**
 * Central, reusable stay timing and early-check-in policy for TIJUM.
 *
 * Source of truth: config('tijum.pricing.*') with Asia/Kolkata timezone.
 * No booking/occupancy records are integrated in this phase.
 */
class StayTimingPolicy
{
    public const OUTCOME_STANDARD_ARRIVAL = 'standard_arrival';

    public const OUTCOME_EARLY_BEFORE_PERMITTED_TIME = 'early_arrival_before_permitted_time';

    public const OUTCOME_EARLY_NOT_PERMITTED_BY_ROOM_TYPE = 'early_arrival_not_permitted_by_room_type';

    public const OUTCOME_EARLY_PERMITTED_SUBJECT_TO_AVAILABILITY = 'early_arrival_permitted_subject_to_availability';

    public const OUTCOME_AVAILABILITY_NOT_YET_VERIFIABLE = 'actual_arrival_availability_not_yet_verifiable';

    public function timezone(): string
    {
        return (string) PlatformSetting::get('localization.timezone') ?: (string) config('tijum.pricing.timezone', 'Asia/Kolkata');
    }

    public function getStandardCheckInTime(): string
    {
        return (string) PlatformSetting::get('timings.check_in_time') ?: (string) config('tijum.pricing.check_in_time', '09:00');
    }

    public function getStandardCheckOutTime(): string
    {
        return (string) PlatformSetting::get('timings.check_out_time') ?: (string) config('tijum.pricing.check_out_time', '08:00');
    }

    public function getEarliestEarlyCheckInTime(): string
    {
        return (string) PlatformSetting::get('timings.earliest_early_check_in_time') ?: (string) config('tijum.pricing.earliest_early_check_in_time', '07:00');
    }

    /**
     * @return array{daily:int, weekly:int, monthly:int}
     */
    public function durationDaysMap(): array
    {
        $durations = config('tijum.pricing.durations', []);

        return [
            'daily' => (int) data_get($durations, 'daily.days', 1),
            'weekly' => (int) data_get($durations, 'weekly.days', 7),
            'monthly' => (int) data_get($durations, 'monthly.days', 30),
        ];
    }

    public function durationDays(string $durationType): int
    {
        $days = $this->durationDaysMap()[$durationType] ?? null;
        if (! is_int($days) || $days < 1) {
            throw new InvalidArgumentException('Unsupported stay duration type.');
        }

        return $days;
    }

    /**
     * Calculate checkout date (exclusive end date in day terms) from check-in and duration.
     * Uses configured duration days (daily=1, weekly=7, monthly=30 by default).
     */
    public function calculateCheckoutDate(string|CarbonImmutable $checkInDate, string $durationType, int $durationCount = 1): CarbonImmutable
    {
        if ($durationCount < 1) {
            throw new InvalidArgumentException('Duration count must be at least 1.');
        }

        $checkIn = $this->normalizeDate($checkInDate);
        $days = $this->durationDays($durationType) * $durationCount;

        return $checkIn->addDays($days);
    }

    public function calculateArrivalTimestamp(string|CarbonImmutable $checkInDate, ?string $arrivalTime = null): CarbonImmutable
    {
        $date = $this->normalizeDate($checkInDate);
        [$hour, $minute] = $this->parseTime($arrivalTime ?? $this->getStandardCheckInTime());

        return $date->setTime($hour, $minute, 0);
    }

    public function calculateCheckoutTimestamp(string|CarbonImmutable $checkInDate, string $durationType, int $durationCount = 1): CarbonImmutable
    {
        $checkoutDate = $this->calculateCheckoutDate($checkInDate, $durationType, $durationCount);
        [$hour, $minute] = $this->parseTime($this->getStandardCheckOutTime());

        return $checkoutDate->setTime($hour, $minute, 0);
    }

    public function isValidEarlyCheckInTime(string $time): bool
    {
        $candidate = $this->minutes($time);
        $earliest = $this->minutes($this->getEarliestEarlyCheckInTime());
        $standard = $this->minutes($this->getStandardCheckInTime());

        return $candidate >= $earliest && $candidate < $standard;
    }

    public function isRoomTypeEarlyCheckInEnabled(PropertyRoomType $roomType): bool
    {
        return (bool) $roomType->early_check_in_enabled;
    }

    /**
     * Evaluate early-check-in eligibility from requested arrival time and room-type permission.
     * This does not confirm physical-room readiness or occupancy (booking integration deferred).
     *
     * @return array{
     *     outcome: string,
     *     label: string,
     *     permitted: bool,
     *     is_early_arrival: bool,
     *     requires_availability_confirmation: bool,
     *     availability_verifiable: bool,
     *     standard_check_in_time: string,
     *     standard_check_out_time: string,
     *     earliest_early_check_in_time: string,
     *     timezone: string,
     *     message: string
     * }
     */
    public function evaluateEarlyCheckInEligibility(PropertyRoomType $roomType, string $requestedArrivalTime): array
    {
        $requested = $this->minutes($requestedArrivalTime);
        $earliest = $this->minutes($this->getEarliestEarlyCheckInTime());
        $standard = $this->minutes($this->getStandardCheckInTime());
        $enabled = $this->isRoomTypeEarlyCheckInEnabled($roomType);

        $base = [
            'is_early_arrival' => false,
            'permitted' => false,
            'requires_availability_confirmation' => false,
            'availability_verifiable' => false,
            'standard_check_in_time' => $this->getStandardCheckInTime(),
            'standard_check_out_time' => $this->getStandardCheckOutTime(),
            'earliest_early_check_in_time' => $this->getEarliestEarlyCheckInTime(),
            'timezone' => $this->timezone(),
        ];

        if ($requested >= $standard) {
            return array_merge($base, [
                'outcome' => self::OUTCOME_STANDARD_ARRIVAL,
                'label' => 'Standard arrival',
                'permitted' => true,
                'message' => 'Arrival is within the standard check-in window.',
            ]);
        }

        if ($requested < $earliest) {
            return array_merge($base, [
                'outcome' => self::OUTCOME_EARLY_BEFORE_PERMITTED_TIME,
                'label' => 'Early arrival before permitted time',
                'is_early_arrival' => true,
                'message' => sprintf('Arrival before %s is not permitted.', $this->getEarliestEarlyCheckInTime()),
            ]);
        }

        // 07:00-08:59 window
        if (! $enabled) {
            return array_merge($base, [
                'outcome' => self::OUTCOME_EARLY_NOT_PERMITTED_BY_ROOM_TYPE,
                'label' => 'Early arrival not permitted by room type',
                'is_early_arrival' => true,
                'message' => sprintf('Early check-in is not offered for this room type. Standard check-in begins at %s.', $this->getStandardCheckInTime()),
            ]);
        }

        return array_merge($base, [
            'outcome' => self::OUTCOME_EARLY_PERMITTED_SUBJECT_TO_AVAILABILITY,
            'label' => 'Early arrival permitted subject to availability',
            'is_early_arrival' => true,
            'permitted' => true,
            'requires_availability_confirmation' => true,
            'availability_verifiable' => false,
            'message' => sprintf('Guests may request early check-in from %s, subject to room availability and operational readiness. Actual arrival availability is not yet verifiable because reservation occupancy is not integrated.', $this->getEarliestEarlyCheckInTime()),
        ]);
    }

    /**
     * Validate a stay window and return canonical timestamps/dates.
     *
     * @return array{
     *     timezone:string,
     *     check_in_date:string,
     *     check_out_date:string,
     *     check_in_at:string,
     *     check_out_at:string,
     *     duration_type:string,
     *     duration_count:int,
     *     total_days:int
     * }
     */
    public function validateStayWindow(string|CarbonImmutable $checkInDate, string $durationType, int $durationCount = 1): array
    {
        $checkIn = $this->normalizeDate($checkInDate);
        $checkoutDate = $this->calculateCheckoutDate($checkIn, $durationType, $durationCount);
        $arrival = $this->calculateArrivalTimestamp($checkIn);
        $departure = $this->calculateCheckoutTimestamp($checkIn, $durationType, $durationCount);

        if (! $departure->greaterThan($arrival)) {
            throw new InvalidArgumentException('Checkout must follow check-in.');
        }

        return [
            'timezone' => $this->timezone(),
            'check_in_date' => $checkIn->toDateString(),
            'check_out_date' => $checkoutDate->toDateString(),
            'check_in_at' => $arrival->toIso8601String(),
            'check_out_at' => $departure->toIso8601String(),
            'duration_type' => $durationType,
            'duration_count' => $durationCount,
            'total_days' => $this->durationDays($durationType) * $durationCount,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function timingSummary(): array
    {
        return [
            'timezone' => $this->timezone(),
            'standard_check_in_time' => $this->getStandardCheckInTime(),
            'standard_check_out_time' => $this->getStandardCheckOutTime(),
            'earliest_early_check_in_time' => $this->getEarliestEarlyCheckInTime(),
            'durations' => $this->durationDaysMap(),
        ];
    }

    private function normalizeDate(string|CarbonImmutable $date): CarbonImmutable
    {
        try {
            $parsed = $date instanceof CarbonImmutable
                ? $date->setTimezone($this->timezone())
                : CarbonImmutable::parse($date, $this->timezone());
        } catch (\Throwable $e) {
            throw new InvalidArgumentException('Invalid check-in date.', 0, $e);
        }

        return $parsed->startOfDay();
    }

    /**
     * @return array{0:int,1:int}
     */
    private function parseTime(string $time): array
    {
        if (preg_match('/^([01]?\d|2[0-3]):([0-5]\d)$/', trim($time), $m) !== 1) {
            throw new InvalidArgumentException('Invalid time format.');
        }

        return [(int) $m[1], (int) $m[2]];
    }

    private function minutes(string $time): int
    {
        [$h, $m] = $this->parseTime($time);

        return ($h * 60) + $m;
    }
}
