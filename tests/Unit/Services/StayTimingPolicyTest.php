<?php

declare(strict_types=1);

namespace Tests\Unit\Services;

use App\Models\PropertyRoomType;
use App\Services\StayTimingPolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class StayTimingPolicyTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function it_exposes_configured_standard_times_and_timezone(): void
    {
        $policy = app(StayTimingPolicy::class);

        $this->assertSame('09:00', $policy->getStandardCheckInTime());
        $this->assertSame('08:00', $policy->getStandardCheckOutTime());
        $this->assertSame('07:00', $policy->getEarliestEarlyCheckInTime());
        $this->assertSame('Asia/Kolkata', $policy->timezone());
        $this->assertSame(['daily' => 1, 'weekly' => 7, 'monthly' => 30], $policy->durationDaysMap());
    }

    #[Test]
    public function it_uses_only_the_canonical_pricing_timing_configuration(): void
    {
        config()->set('tijum.pricing.check_in_time', '10:15');
        config()->set('tijum.pricing.check_out_time', '07:45');
        config()->set('tijum.pricing.earliest_early_check_in_time', '08:00');
        config()->set('tijum.property_management.early_check_in', [
            'standard_check_in_time' => '05:00',
            'standard_checkout_time' => '04:00',
            'earliest_early_check_in_time' => '03:00',
        ]);

        $policy = app(StayTimingPolicy::class);

        $this->assertSame('10:15', $policy->getStandardCheckInTime());
        $this->assertSame('07:45', $policy->getStandardCheckOutTime());
        $this->assertSame('08:00', $policy->getEarliestEarlyCheckInTime());
    }

    #[Test]
    public function it_calculates_checkout_dates_using_fixed_duration_days(): void
    {
        $policy = app(StayTimingPolicy::class);

        $this->assertSame('2026-11-13', $policy->calculateCheckoutDate('2026-11-12', 'daily')->toDateString());
        $this->assertSame('2026-11-19', $policy->calculateCheckoutDate('2026-11-12', 'weekly')->toDateString());
        $this->assertSame('2026-12-12', $policy->calculateCheckoutDate('2026-11-12', 'monthly')->toDateString());
    }

    #[Test]
    public function it_calculates_checkout_timestamp_with_standard_checkout_time(): void
    {
        $policy = app(StayTimingPolicy::class);
        $checkout = $policy->calculateCheckoutTimestamp('2026-11-12', 'daily');

        $this->assertSame('2026-11-13 08:00:00', $checkout->format('Y-m-d H:i:s'));
        $this->assertSame('Asia/Kolkata', $checkout->getTimezone()->getName());
    }

    #[Test]
    public function it_rejects_invalid_duration_or_dates(): void
    {
        $policy = app(StayTimingPolicy::class);

        $this->expectException(InvalidArgumentException::class);
        $policy->calculateCheckoutDate('2026-11-12', 'yearly');
    }

    #[Test]
    public function it_validates_early_check_in_window_boundaries(): void
    {
        $policy = app(StayTimingPolicy::class);

        $this->assertTrue($policy->isValidEarlyCheckInTime('07:00'));
        $this->assertTrue($policy->isValidEarlyCheckInTime('08:59'));
        $this->assertFalse($policy->isValidEarlyCheckInTime('06:59'));
        $this->assertFalse($policy->isValidEarlyCheckInTime('09:00'));
    }

    #[Test]
    public function it_evaluates_standard_arrival(): void
    {
        $policy = app(StayTimingPolicy::class);
        $rt = new PropertyRoomType(['early_check_in_enabled' => true]);

        $result = $policy->evaluateEarlyCheckInEligibility($rt, '09:00');

        $this->assertSame(StayTimingPolicy::OUTCOME_STANDARD_ARRIVAL, $result['outcome']);
        $this->assertTrue($result['permitted']);
        $this->assertFalse($result['is_early_arrival']);
    }

    #[Test]
    public function it_rejects_arrival_before_earliest_permitted_time(): void
    {
        $policy = app(StayTimingPolicy::class);
        $rt = new PropertyRoomType(['early_check_in_enabled' => true]);

        $result = $policy->evaluateEarlyCheckInEligibility($rt, '06:30');

        $this->assertSame(StayTimingPolicy::OUTCOME_EARLY_BEFORE_PERMITTED_TIME, $result['outcome']);
        $this->assertFalse($result['permitted']);
        $this->assertTrue($result['is_early_arrival']);
    }

    #[Test]
    public function it_blocks_early_arrival_when_room_type_not_permitted(): void
    {
        $policy = app(StayTimingPolicy::class);
        $rt = new PropertyRoomType(['early_check_in_enabled' => false]);

        $result = $policy->evaluateEarlyCheckInEligibility($rt, '07:30');

        $this->assertSame(StayTimingPolicy::OUTCOME_EARLY_NOT_PERMITTED_BY_ROOM_TYPE, $result['outcome']);
        $this->assertFalse($result['permitted']);
    }

    #[Test]
    public function it_permits_early_arrival_only_subject_to_availability_when_enabled(): void
    {
        $policy = app(StayTimingPolicy::class);
        $rt = new PropertyRoomType(['early_check_in_enabled' => true]);

        $result = $policy->evaluateEarlyCheckInEligibility($rt, '07:00');

        $this->assertSame(StayTimingPolicy::OUTCOME_EARLY_PERMITTED_SUBJECT_TO_AVAILABILITY, $result['outcome']);
        $this->assertTrue($result['permitted']);
        $this->assertTrue($result['requires_availability_confirmation']);
        $this->assertFalse($result['availability_verifiable']);
    }

    #[Test]
    public function it_validates_stay_window_and_returns_canonical_values(): void
    {
        $policy = app(StayTimingPolicy::class);
        $window = $policy->validateStayWindow('2026-11-12', 'weekly', 1);

        $this->assertSame('2026-11-12', $window['check_in_date']);
        $this->assertSame('2026-11-19', $window['check_out_date']);
        $this->assertSame(7, $window['total_days']);
        $this->assertSame('Asia/Kolkata', $window['timezone']);
    }
}
