<?php

declare(strict_types=1);

namespace App\Services\Protection;

use App\Models\CancellationRefundPolicy;
use App\Models\Reservation;
use Carbon\CarbonImmutable;

class CancellationPolicyService
{
    /**
     * Get the authoritative active published cancellation policy.
     */
    public function getActivePolicy(): CancellationRefundPolicy
    {
        /** @var CancellationRefundPolicy|null $policy */
        $policy = CancellationRefundPolicy::query()
            ->where('is_published', true)
            ->where('effective_from', '<=', CarbonImmutable::now())
            ->latest('effective_from')
            ->first();

        if ($policy instanceof CancellationRefundPolicy) {
            return $policy;
        }

        return $this->seedDefaultPolicy();
    }

    /**
     * @return array<string, mixed>
     */
    public function snapshotForReservation(?CancellationRefundPolicy $policy = null): array
    {
        $active = $policy ?? $this->getActivePolicy();

        return $active->toSnapshotArray();
    }

    /**
     * Resolve the cancellation policy that applied to this specific reservation.
     *
     * @return array<string, mixed>
     */
    public function policyForReservation(Reservation $reservation): array
    {
        if (is_array($reservation->cancellation_policy_snapshot) && ! empty($reservation->cancellation_policy_snapshot)) {
            return array_merge($reservation->cancellation_policy_snapshot, [
                'is_historical' => false,
            ]);
        }

        // Historical reservation notice without inventing retroactive percentages
        return [
            'version' => 'historical',
            'name' => 'Historical Booking Terms',
            'is_historical' => true,
            'summary' => 'Reserved under earlier marketplace baseline terms prior to policy versioning.',
            'customer_explanation' => 'This reservation was confirmed under earlier marketplace baseline terms. If you experience an issue or need to cancel, your case is reviewed directly by TIJUM administration without penalty deduction.',
            'cancellation_terms' => [
                'customer_cancellation' => 'Discretionary cancellation requests are reviewed individually by TIJUM customer operations.',
                'owner_non_fulfilment' => '100% refund or guaranteed alternative food-inclusive stay with customer consent.',
                'property_mismatch' => 'Eligible for immediate relocation or full refund review upon verification.',
            ],
        ];
    }

    /**
     * Seed baseline standard cancellation policy.
     */
    public function seedDefaultPolicy(): CancellationRefundPolicy
    {
        return CancellationRefundPolicy::firstOrCreate(
            ['version' => '2026.1'],
            [
                'name' => 'Standard Food-Inclusive Marketplace Policy (2026.1)',
                'effective_from' => CarbonImmutable::now()->subMonths(3),
                'summary' => 'Fair accommodation marketplace policy with food-inclusive protection and relocation guarantees.',
                'customer_explanation' => 'TIJUM protects your stay and dining inclusions. You may cancel prior to payment capture with zero penalty. In the event an owner cannot provide the booked room or food inclusions, TIJUM coordinates an equivalent alternative or full refund.',
                'cancellation_terms' => [
                    'awaiting_payment' => 'Cancellation terminates payment order with no charge.',
                    'confirmed_stay' => 'Cancellation submitted for administrative review based on check-in timing and circumstance.',
                    'owner_cancelled' => 'Full refund or guaranteed relocation with price protection.',
                    'food_not_provided' => 'Eligible for partial or full refund review if promised daily meals are omitted.',
                    'grievance_sla' => 'Complaints acknowledged within 48 hours and redressed within 30 days under Consumer Protection (E-Commerce) Rules.',
                ],
                'is_published' => true,
            ],
        );
    }
}
