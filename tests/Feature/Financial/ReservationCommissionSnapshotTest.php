<?php

declare(strict_types=1);

namespace Tests\Feature\Financial;

use App\Enums\AdminRole;
use App\Enums\CommissionAgreementStatus;
use App\Enums\CommissionBaseType;
use App\Enums\CommissionGstType;
use App\Enums\CommissionSnapshotStatus;
use App\Models\Admin;
use App\Models\PartnerCommissionAgreement;
use App\Models\Reservation;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class ReservationCommissionSnapshotTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    private function createFinanceAdmin(): Admin
    {
        return Admin::factory()->create([
            'role' => AdminRole::Finance,
            'is_active' => true,
            'two_factor_confirmed_at' => now(),
            'two_factor_secret' => 'test-secret',
        ]);
    }

    public function test_booking_creation_records_commission_snapshot_with_active_agreement(): void
    {
        $admin = $this->createFinanceAdmin();
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 100000); // ₹1,000 / day
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        // Create active agreement for owner: 1200 bps (12%)
        PartnerCommissionAgreement::create([
            'agreement_reference' => 'TCA-2026-ACTIVE01',
            'owner_id' => $owner->id,
            'property_id' => null,
            'commission_rate_bps' => 1200,
            'commission_base_type' => CommissionBaseType::GrossBooking,
            'commission_gst_type' => CommissionGstType::Exclusive,
            'terms_version' => '1.0',
            'status' => CommissionAgreementStatus::Active,
            'effective_from' => CarbonImmutable::now()->subDays(5),
            'accepted_at' => CarbonImmutable::now()->subDays(5),
            'accepted_by_owner_id' => $owner->id,
            'created_by_admin_id' => $admin->id,
        ]);

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(3)->toDateString();
        $payload = $this->validReservationPayload($property, $roomType, $checkIn, durationQuantity: 1);

        $this->submitReservation($user, $payload)->assertRedirect();

        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        $this->assertSame(CommissionSnapshotStatus::Snapshotted, $reservation->commission_status);
        $this->assertSame(1200, $reservation->commission_rate_bps);
        $this->assertSame(100000, $reservation->commissionable_base_minor);
        $this->assertSame(12000, $reservation->commission_amount_minor); // 12% of ₹1,000 = ₹120 (12,000 paise)
        $this->assertSame(2160, $reservation->commission_tax_amount_minor); // 18% GST on ₹120 = ₹21.60 (2,160 paise)
        $this->assertSame(85840, $reservation->net_partner_payable_minor); // ₹1,000 - ₹120 - ₹21.60 = ₹858.40 (85,840 paise)
    }

    public function test_booking_without_agreement_marks_status_unassigned(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 100000);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(3)->toDateString();
        $payload = $this->validReservationPayload($property, $roomType, $checkIn, durationQuantity: 1);

        $this->submitReservation($user, $payload)->assertRedirect();

        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        $this->assertSame(CommissionSnapshotStatus::Unassigned, $reservation->commission_status);
        $this->assertNull($reservation->commission_rate_bps);
        $this->assertSame(100000, $reservation->net_partner_payable_minor);
    }

    public function test_subsequent_agreement_changes_do_not_mutate_prior_snapshots(): void
    {
        $admin = $this->createFinanceAdmin();
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 100000);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        // 1. Initial agreement: 1000 bps (10%)
        $initialAgreement = PartnerCommissionAgreement::create([
            'agreement_reference' => 'TCA-2026-INIT01',
            'owner_id' => $owner->id,
            'property_id' => null,
            'commission_rate_bps' => 1000,
            'commission_base_type' => CommissionBaseType::GrossBooking,
            'commission_gst_type' => CommissionGstType::Exclusive,
            'terms_version' => '1.0',
            'status' => CommissionAgreementStatus::Active,
            'effective_from' => CarbonImmutable::now()->subDays(10),
            'accepted_at' => CarbonImmutable::now()->subDays(10),
            'accepted_by_owner_id' => $owner->id,
            'created_by_admin_id' => $admin->id,
        ]);

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(3)->toDateString();
        $payload = $this->validReservationPayload($property, $roomType, $checkIn, durationQuantity: 1);
        $this->submitReservation($user, $payload)->assertRedirect();
        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        $this->assertSame(1000, $reservation->commission_rate_bps);
        $this->assertSame(10000, $reservation->commission_amount_minor);

        // 2. Later, agreement rate increases to 2000 bps (20%)
        PartnerCommissionAgreement::create([
            'agreement_reference' => 'TCA-2026-NEW02',
            'owner_id' => $owner->id,
            'property_id' => null,
            'commission_rate_bps' => 2000,
            'commission_base_type' => CommissionBaseType::GrossBooking,
            'commission_gst_type' => CommissionGstType::Exclusive,
            'terms_version' => '2.0',
            'status' => CommissionAgreementStatus::Active,
            'effective_from' => CarbonImmutable::now(),
            'accepted_at' => CarbonImmutable::now(),
            'accepted_by_owner_id' => $owner->id,
            'created_by_admin_id' => $admin->id,
        ]);

        // Prior reservation snapshot must be preserved identically
        $reservation->refresh();
        $this->assertSame(1000, $reservation->commission_rate_bps);
        $this->assertSame(10000, $reservation->commission_amount_minor);
        $this->assertSame(1800, $reservation->commission_tax_amount_minor);
        $this->assertSame(88200, $reservation->net_partner_payable_minor);
    }
}
