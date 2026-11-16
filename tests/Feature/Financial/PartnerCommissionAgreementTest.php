<?php

declare(strict_types=1);

namespace Tests\Feature\Financial;

use App\Enums\AdminRole;
use App\Enums\CommissionAgreementStatus;
use App\Enums\CommissionBaseType;
use App\Enums\CommissionGstType;
use App\Models\Admin;
use App\Models\Owner;
use App\Models\PartnerCommissionAgreement;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class PartnerCommissionAgreementTest extends TestCase
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

    public function test_admin_can_create_commission_agreement(): void
    {
        $admin = $this->createFinanceAdmin();
        $owner = $this->createActiveOwner();

        $payload = [
            'owner_id' => $owner->id,
            'property_id' => null, // Owner-wide
            'commission_rate_bps' => 1250, // 12.50%
            'commission_base_type' => CommissionBaseType::GrossBooking->value,
            'commission_gst_type' => CommissionGstType::Exclusive->value,
            'effective_from' => CarbonImmutable::now()->toDateString(),
            'send_for_acceptance' => true,
        ];

        $response = $this->actingAs($admin, 'admin')
            ->post(route('admin.partner-commissions.store'), $payload);

        $response->assertRedirect(route('admin.partner-commissions.index'));
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('partner_commission_agreements', [
            'owner_id' => $owner->id,
            'commission_rate_bps' => 1250,
            'status' => CommissionAgreementStatus::PendingAcceptance->value,
            'created_by_admin_id' => $admin->id,
        ]);
    }

    public function test_terms_hash_computed_deterministically(): void
    {
        $admin = $this->createFinanceAdmin();
        $owner = $this->createActiveOwner();

        $agreement = PartnerCommissionAgreement::create([
            'agreement_reference' => 'TCA-2026-TEST001',
            'owner_id' => $owner->id,
            'property_id' => null,
            'commission_rate_bps' => 1000,
            'commission_base_type' => CommissionBaseType::GrossBooking,
            'commission_gst_type' => CommissionGstType::Exclusive,
            'terms_version' => '1.0',
            'status' => CommissionAgreementStatus::PendingAcceptance,
            'effective_from' => CarbonImmutable::now(),
            'created_by_admin_id' => $admin->id,
        ]);

        $hash1 = $agreement->generateTermsHash();
        $hash2 = $agreement->generateTermsHash();

        $this->assertSame($hash1, $hash2);
        $this->assertSame(64, strlen($hash1)); // SHA-256 length
    }

    public function test_owner_can_view_commission_agreements(): void
    {
        $admin = $this->createFinanceAdmin();
        $owner = $this->createActiveOwner();

        PartnerCommissionAgreement::create([
            'agreement_reference' => 'TCA-2026-VIEW001',
            'owner_id' => $owner->id,
            'property_id' => null,
            'commission_rate_bps' => 1000,
            'commission_base_type' => CommissionBaseType::GrossBooking,
            'commission_gst_type' => CommissionGstType::Exclusive,
            'terms_version' => '1.0',
            'status' => CommissionAgreementStatus::PendingAcceptance,
            'effective_from' => CarbonImmutable::now(),
            'created_by_admin_id' => $admin->id,
        ]);

        $response = $this->actingAs($owner, 'owner')
            ->get(route('owner.commission-agreements.index'));

        $response->assertOk();
        $response->assertSee('TCA-2026-VIEW001');
    }

    public function test_owner_can_electronically_accept_pending_agreement(): void
    {
        $admin = $this->createFinanceAdmin();
        $owner = $this->createActiveOwner();

        $agreement = PartnerCommissionAgreement::create([
            'agreement_reference' => 'TCA-2026-ACCEPT001',
            'owner_id' => $owner->id,
            'property_id' => null,
            'commission_rate_bps' => 1200,
            'commission_base_type' => CommissionBaseType::GrossBooking,
            'commission_gst_type' => CommissionGstType::Exclusive,
            'terms_version' => '1.0',
            'status' => CommissionAgreementStatus::PendingAcceptance,
            'effective_from' => CarbonImmutable::now(),
            'created_by_admin_id' => $admin->id,
        ]);

        $response = $this->actingAs($owner, 'owner')
            ->post(route('owner.commission-agreements.accept', $agreement));

        $response->assertRedirect(route('owner.commission-agreements.index'));
        $response->assertSessionHas('success');

        $agreement->refresh();
        $this->assertSame(CommissionAgreementStatus::Active, $agreement->status);
        $this->assertSame($owner->id, $agreement->accepted_by_owner_id);
        $this->assertNotNull($agreement->accepted_at);
        $this->assertNotNull($agreement->terms_hash);
    }

    public function test_accepting_new_agreement_supersedes_prior_active_agreement(): void
    {
        $admin = $this->createFinanceAdmin();
        $owner = $this->createActiveOwner();

        $priorAgreement = PartnerCommissionAgreement::create([
            'agreement_reference' => 'TCA-2026-PRIOR001',
            'owner_id' => $owner->id,
            'property_id' => null,
            'commission_rate_bps' => 1000,
            'commission_base_type' => CommissionBaseType::GrossBooking,
            'commission_gst_type' => CommissionGstType::Exclusive,
            'terms_version' => '1.0',
            'status' => CommissionAgreementStatus::Active,
            'effective_from' => CarbonImmutable::now()->subMonths(3),
            'accepted_at' => CarbonImmutable::now()->subMonths(3),
            'accepted_by_owner_id' => $owner->id,
            'created_by_admin_id' => $admin->id,
        ]);

        $newAgreement = PartnerCommissionAgreement::create([
            'agreement_reference' => 'TCA-2026-NEW002',
            'owner_id' => $owner->id,
            'property_id' => null,
            'commission_rate_bps' => 1100,
            'commission_base_type' => CommissionBaseType::GrossBooking,
            'commission_gst_type' => CommissionGstType::Exclusive,
            'terms_version' => '1.0',
            'status' => CommissionAgreementStatus::PendingAcceptance,
            'effective_from' => CarbonImmutable::now(),
            'created_by_admin_id' => $admin->id,
        ]);

        $this->actingAs($owner, 'owner')
            ->post(route('owner.commission-agreements.accept', $newAgreement));

        $priorAgreement->refresh();
        $newAgreement->refresh();

        $this->assertSame(CommissionAgreementStatus::Superseded, $priorAgreement->status);
        $this->assertSame(CommissionAgreementStatus::Active, $newAgreement->status);
    }
}
