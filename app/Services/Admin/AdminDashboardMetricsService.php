<?php

declare(strict_types=1);

namespace App\Services\Admin;

use App\Enums\CaseCategory;
use App\Enums\CasePriority;
use App\Enums\CaseStatus;
use App\Enums\FinancialOnboardingStatus;
use App\Enums\OwnerStatus;
use App\Enums\PaymentStatus;
use App\Enums\PropertyOperationalStatus;
use App\Enums\PropertyVerificationStatus;
use App\Enums\ProviderTransferStatus;
use App\Enums\RefundStatus;
use App\Enums\RelocationStatus;
use App\Enums\RelocationSubsidyStatus;
use App\Enums\ReservationStatus;
use App\Enums\ReviewReportStatus;
use App\Enums\ReviewStatus;
use App\Enums\SettlementStatus;
use App\Models\City;
use App\Models\CustomerProtectionCase;
use App\Models\Owner;
use App\Models\PartnerSettlement;
use App\Models\PlatformRelocationSubsidy;
use App\Models\Property;
use App\Models\PropertyCategory;
use App\Models\PropertyReview;
use App\Models\PropertyReviewReport;
use App\Models\PropertyVerificationApplication;
use App\Models\ProviderTransfer;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use App\Models\ReservationRefund;
use App\Models\ReservationRelocation;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;

class AdminDashboardMetricsService
{
    private string $timezone;

    public function __construct()
    {
        $this->timezone = (string) config('tijum.pricing.timezone', 'Asia/Kolkata');
    }

    /**
     * Parse date range filter into start and end timestamps in Asia/Kolkata.
     *
     * @return array{0: CarbonImmutable, 1: CarbonImmutable, 2: string}
     */
    public function resolveDateRange(?string $range = 'last_30_days', ?string $customFrom = null, ?string $customTo = null): array
    {
        $now = CarbonImmutable::now($this->timezone);

        return match ($range) {
            'today' => [
                $now->startOfDay(),
                $now->endOfDay(),
                'Today',
            ],
            'last_7_days' => [
                $now->subDays(6)->startOfDay(),
                $now->endOfDay(),
                'Last 7 Days',
            ],
            'this_month' => [
                $now->startOfMonth(),
                $now->endOfMonth(),
                'This Month',
            ],
            'previous_month' => [
                $now->subMonth()->startOfMonth(),
                $now->subMonth()->endOfMonth(),
                'Previous Month',
            ],
            'custom' => [
                $customFrom ? CarbonImmutable::parse($customFrom, $this->timezone)->startOfDay() : $now->subDays(29)->startOfDay(),
                $customTo ? CarbonImmutable::parse($customTo, $this->timezone)->endOfDay() : $now->endOfDay(),
                'Custom Range',
            ],
            default => [
                $now->subDays(29)->startOfDay(),
                $now->endOfDay(),
                'Last 30 Days',
            ],
        };
    }

    /**
     * @return array<string, mixed>
     */
    public function getMetrics(
        string $range = 'last_30_days',
        ?int $cityId = null,
        ?int $categoryId = null,
        ?string $customFrom = null,
        ?string $customTo = null,
    ): array {
        [$periodStart, $periodEnd, $rangeLabel] = $this->resolveDateRange($range, $customFrom, $customTo);

        return [
            'filter_metadata' => [
                'range' => $range,
                'range_label' => $rangeLabel,
                'period_start' => $periodStart->toIso8601String(),
                'period_end' => $periodEnd->toIso8601String(),
                'period_start_formatted' => $periodStart->format('d M Y'),
                'period_end_formatted' => $periodEnd->format('d M Y'),
                'city_id' => $cityId,
                'category_id' => $categoryId,
                'timezone' => $this->timezone,
            ],
            'marketplace_overview' => $this->getMarketplaceOverview($cityId, $categoryId),
            'reservation_metrics' => $this->getReservationMetrics($periodStart, $periodEnd, $cityId, $categoryId),
            'payment_metrics' => $this->getPaymentMetrics($periodStart, $periodEnd, $cityId, $categoryId),
            'revenue_breakdown' => $this->getRevenueBreakdown($periodStart, $periodEnd, $cityId, $categoryId),
            'customer_protection_metrics' => $this->getCustomerProtectionMetrics($periodStart, $periodEnd, $cityId),
            'financial_operations' => $this->getFinancialOperationsMetrics($periodStart, $periodEnd),
            'trends' => $this->getPerformanceTrends($periodStart, $periodEnd, $cityId, $categoryId),
            'city_distribution' => $this->getCityDistribution($periodStart, $periodEnd),
        ];
    }

    /**
     * Overall platform totals (all-time counts reflecting current inventory and user base).
     *
     * @return array<string, int>
     */
    public function getMarketplaceOverview(?int $cityId = null, ?int $categoryId = null): array
    {
        $propertyQuery = Property::query();
        if ($cityId !== null) {
            $propertyQuery->where('city_id', $cityId);
        }
        if ($categoryId !== null) {
            $propertyQuery->where('property_category_id', $categoryId);
        }

        $resQuery = Reservation::query();
        if ($cityId !== null || $categoryId !== null) {
            $resQuery->whereHas('property', function (Builder $q) use ($cityId, $categoryId): void {
                if ($cityId !== null) {
                    $q->where('city_id', $cityId);
                }
                if ($categoryId !== null) {
                    $q->where('property_category_id', $categoryId);
                }
            });
        }

        return [
            'total_customers' => User::query()->count(),
            'active_customers' => User::query()->whereNotNull('email_verified_at')->count(),
            'verified_partners' => Owner::query()->where('status', OwnerStatus::Active)->count(),
            'pending_partners' => Owner::query()->whereIn('status', [
                OwnerStatus::PendingVerification,
                OwnerStatus::PendingReview,
            ])->count(),
            'active_properties' => (clone $propertyQuery)
                ->where('status', PropertyOperationalStatus::Active)
                ->where('is_verified', true)
                ->count(),
            'pending_properties' => PropertyVerificationApplication::query()
                ->whereIn('status', [
                    PropertyVerificationStatus::Submitted->value,
                    PropertyVerificationStatus::UnderReview->value,
                ])
                ->when($cityId !== null, fn (Builder $q) => $q->whereHas('property', fn (Builder $pq) => $pq->where('city_id', $cityId)))
                ->count(),
            'suspended_properties' => (clone $propertyQuery)
                ->where('status', PropertyOperationalStatus::Suspended)
                ->count(),
            'total_reservations' => (clone $resQuery)->count(),
            'pending_reservations' => (clone $resQuery)->where('status', ReservationStatus::AwaitingPayment)->count(),
            'confirmed_reservations' => (clone $resQuery)->where('status', ReservationStatus::Confirmed)->count(),
            'completed_reservations' => (clone $resQuery)
                ->where('status', ReservationStatus::Confirmed)
                ->whereDate('checkout_date', '<', CarbonImmutable::now($this->timezone)->toDateString())
                ->count(),
            'cancelled_reservations' => (clone $resQuery)->where('status', ReservationStatus::Cancelled)->count(),
            'pending_reviews' => PropertyReview::query()->where('status', ReviewStatus::PendingModeration)->count(),
            'pending_review_reports' => PropertyReviewReport::query()->whereIn('status', [ReviewReportStatus::Submitted->value, ReviewReportStatus::UnderReview->value])->count(),
        ];
    }

    /**
     * Reservation metrics separated by booking creation date vs stay date.
     *
     * @return array<string, int>
     */
    public function getReservationMetrics(
        CarbonImmutable $start,
        CarbonImmutable $end,
        ?int $cityId = null,
        ?int $categoryId = null,
    ): array {
        $base = Reservation::query()
            ->when($cityId !== null || $categoryId !== null, function (Builder $q) use ($cityId, $categoryId): void {
                $q->whereHas('property', function (Builder $pq) use ($cityId, $categoryId): void {
                    if ($cityId !== null) {
                        $pq->where('city_id', $cityId);
                    }
                    if ($categoryId !== null) {
                        $pq->where('property_category_id', $categoryId);
                    }
                });
            });

        // Booked during period
        $periodBookings = (clone $base)->whereBetween('created_at', [$start, $end]);

        // Stays occurring during period (check-in <= end and checkout >= start)
        $staysInPeriod = (clone $base)
            ->whereDate('check_in_date', '<=', $end->toDateString())
            ->whereDate('checkout_date', '>=', $start->toDateString())
            ->where('status', ReservationStatus::Confirmed);

        return [
            'new_in_period' => (clone $periodBookings)->count(),
            'awaiting_payment' => (clone $periodBookings)->where('status', ReservationStatus::AwaitingPayment)->count(),
            'confirmed_in_period' => (clone $periodBookings)->where('status', ReservationStatus::Confirmed)->count(),
            'completed_in_period' => (clone $periodBookings)
                ->where('status', ReservationStatus::Confirmed)
                ->whereDate('checkout_date', '<', CarbonImmutable::now($this->timezone)->toDateString())
                ->count(),
            'cancelled_in_period' => (clone $periodBookings)->where('status', ReservationStatus::Cancelled)->count(),
            'expired_in_period' => (clone $periodBookings)->where('status', ReservationStatus::Expired)->count(),
            'active_stays_in_period' => $staysInPeriod->count(),
        ];
    }

    /**
     * Payment transactions and refunds in period.
     *
     * @return array<string, mixed>
     */
    public function getPaymentMetrics(
        CarbonImmutable $start,
        CarbonImmutable $end,
        ?int $cityId = null,
        ?int $categoryId = null,
    ): array {
        $paymentQuery = ReservationPayment::query()
            ->when($cityId !== null || $categoryId !== null, function (Builder $q) use ($cityId, $categoryId): void {
                $q->whereHas('reservation.property', function (Builder $pq) use ($cityId, $categoryId): void {
                    if ($cityId !== null) {
                        $pq->where('city_id', $cityId);
                    }
                    if ($categoryId !== null) {
                        $pq->where('property_category_id', $categoryId);
                    }
                });
            });

        $captured = (clone $paymentQuery)
            ->where('status', PaymentStatus::Captured)
            ->whereBetween('captured_at', [$start, $end]);

        $failed = (clone $paymentQuery)
            ->where('status', PaymentStatus::Failed)
            ->whereBetween('created_at', [$start, $end]);

        $refundsQuery = ReservationRefund::query()
            ->when($cityId !== null || $categoryId !== null, function (Builder $q) use ($cityId, $categoryId): void {
                $q->whereHas('reservation.property', function (Builder $pq) use ($cityId, $categoryId): void {
                    if ($cityId !== null) {
                        $pq->where('city_id', $cityId);
                    }
                    if ($categoryId !== null) {
                        $pq->where('property_category_id', $categoryId);
                    }
                });
            });

        $processedRefunds = (clone $refundsQuery)
            ->where('status', RefundStatus::Processed)
            ->where(function (Builder $q) use ($start, $end): void {
                $q->whereBetween('gateway_processed_at', [$start, $end])
                    ->orWhere(function (Builder $sq) use ($start, $end): void {
                        $sq->whereNull('gateway_processed_at')
                            ->whereBetween('created_at', [$start, $end]);
                    });
            });

        $pendingRefunds = (clone $refundsQuery)
            ->whereIn('status', [RefundStatus::Requested, RefundStatus::Approved, RefundStatus::Processing]);

        $failedRefunds = (clone $refundsQuery)
            ->where('status', RefundStatus::Failed);

        return [
            'captured_count' => (clone $captured)->count(),
            'captured_amount_minor' => (int) ((clone $captured)->sum('amount_minor') ?? 0),
            'failed_count' => $failed->count(),
            'refunds_processed_count' => (clone $processedRefunds)->count(),
            'refunds_processed_amount_minor' => (int) ((clone $processedRefunds)->sum('amount_minor') ?? 0),
            'refunds_pending_count' => $pendingRefunds->count(),
            'refunds_failed_count' => $failedRefunds->count(),
        ];
    }

    /**
     * Financial separation: Gross Booking Value vs TIJUM Commission Revenue.
     *
     * @return array<string, mixed>
     */
    public function getRevenueBreakdown(
        CarbonImmutable $start,
        CarbonImmutable $end,
        ?int $cityId = null,
        ?int $categoryId = null,
    ): array {
        $resQuery = Reservation::query()
            ->whereBetween('created_at', [$start, $end])
            ->when($cityId !== null || $categoryId !== null, function (Builder $q) use ($cityId, $categoryId): void {
                $q->whereHas('property', function (Builder $pq) use ($cityId, $categoryId): void {
                    if ($cityId !== null) {
                        $pq->where('city_id', $cityId);
                    }
                    if ($categoryId !== null) {
                        $pq->where('property_category_id', $categoryId);
                    }
                });
            });

        $grossBookingValue = (int) ((clone $resQuery)->sum('total_amount_minor') ?? 0);

        // Confirmed reservations establish contractual commission
        $confirmedQuery = (clone $resQuery)->where('status', ReservationStatus::Confirmed);
        $commissionEarned = (int) ((clone $confirmedQuery)->sum('commission_amount_minor') ?? 0);
        $commissionGst = (int) ((clone $confirmedQuery)->sum('commission_tax_amount_minor') ?? 0);

        // Captured payments in period
        $capturedAmount = (int) (ReservationPayment::query()
            ->where('status', PaymentStatus::Captured)
            ->whereBetween('captured_at', [$start, $end])
            ->when($cityId !== null || $categoryId !== null, function (Builder $q) use ($cityId, $categoryId): void {
                $q->whereHas('reservation.property', function (Builder $pq) use ($cityId, $categoryId): void {
                    if ($cityId !== null) {
                        $pq->where('city_id', $cityId);
                    }
                    if ($categoryId !== null) {
                        $pq->where('property_category_id', $categoryId);
                    }
                });
            })
            ->sum('amount_minor') ?? 0);

        // Net partner payable on confirmed bookings in period
        $netPartnerPayable = max(0, $grossBookingValue - $commissionEarned - $commissionGst);

        // Completed transfers via Razorpay Route
        $completedTransfers = (int) (ProviderTransfer::query()
            ->where('status', ProviderTransferStatus::Processed)
            ->whereBetween('processed_at', [$start, $end])
            ->sum('amount_minor') ?? 0);

        // Platform relocation subsidies incurred
        $relocationSubsidies = (int) (PlatformRelocationSubsidy::query()
            ->whereBetween('created_at', [$start, $end])
            ->sum('subsidy_amount_minor') ?? 0);

        // Completed customer refunds
        $completedRefunds = (int) (ReservationRefund::query()
            ->where('status', RefundStatus::Processed)
            ->where(function (Builder $q) use ($start, $end): void {
                $q->whereBetween('gateway_processed_at', [$start, $end])
                    ->orWhere(function (Builder $sq) use ($start, $end): void {
                        $sq->whereNull('gateway_processed_at')
                            ->whereBetween('created_at', [$start, $end]);
                    });
            })
            ->sum('amount_minor') ?? 0);

        return [
            'gross_booking_value_minor' => $grossBookingValue,
            'captured_payment_amount_minor' => $capturedAmount,
            'commission_earned_minor' => $commissionEarned,
            'commission_gst_minor' => $commissionGst,
            'platform_revenue_minor' => $commissionEarned, // Strict definition: Revenue = Marketplace Commission
            'net_partner_payable_minor' => $netPartnerPayable,
            'completed_transfers_minor' => $completedTransfers,
            'relocation_subsidies_minor' => $relocationSubsidies,
            'completed_refunds_minor' => $completedRefunds,
            'definition_notes' => [
                'revenue_disclosure' => 'Gross Booking Value is NOT TIJUM revenue. TIJUM revenue is strictly the contractual marketplace commission earned on fulfilled stays.',
                'currency' => 'INR',
            ],
        ];
    }

    /**
     * Customer protection cases and statutory SLA metrics.
     *
     * @return array<string, int>
     */
    public function getCustomerProtectionMetrics(CarbonImmutable $start, CarbonImmutable $end, ?int $cityId = null): array
    {
        $now = CarbonImmutable::now($this->timezone);

        $caseQuery = CustomerProtectionCase::query()
            ->when($cityId !== null, fn (Builder $q) => $q->whereHas('reservation.property', fn (Builder $pq) => $pq->where('city_id', $cityId)));

        $openCases = (clone $caseQuery)->whereNotIn('status', [CaseStatus::Resolved, CaseStatus::Closed]);

        $urgentCases = (clone $openCases)->where('priority', CasePriority::Urgent);
        $safetyCases = (clone $openCases)->where('category', CaseCategory::SafetyConcern);

        // Overdue SLAs
        $overdueAcknowledgement = (clone $openCases)
            ->whereNull('acknowledged_at');

        $overdueResolution = (clone $openCases)
            ->whereNotNull('sla_due_at')
            ->where('sla_due_at', '<', $now);

        // Pending relocation decisions
        $pendingRelocations = ReservationRelocation::query()
            ->where('status', RelocationStatus::Offered)
            ->when($cityId !== null, fn (Builder $q) => $q->whereHas('sourceReservation.property', fn (Builder $pq) => $pq->where('city_id', $cityId)));

        return [
            'open_cases_count' => $openCases->count(),
            'urgent_cases_count' => $urgentCases->count(),
            'safety_cases_count' => $safetyCases->count(),
            'overdue_acknowledgement_count' => $overdueAcknowledgement->count(),
            'overdue_resolution_count' => $overdueResolution->count(),
            'pending_relocations_count' => $pendingRelocations->count(),
            'resolved_in_period_count' => (clone $caseQuery)
                ->where('status', CaseStatus::Resolved)
                ->whereBetween('resolved_at', [$start, $end])
                ->count(),
        ];
    }

    /**
     * Financial operations overview (settlements, transfers, reconciliation).
     *
     * @return array<string, int>
     */
    public function getFinancialOperationsMetrics(CarbonImmutable $start, CarbonImmutable $end): array
    {
        return [
            'draft_settlements' => PartnerSettlement::query()->where('status', SettlementStatus::Draft)->count(),
            'pending_approval_settlements' => PartnerSettlement::query()->where('status', SettlementStatus::PendingApproval)->count(),
            'approved_settlements' => PartnerSettlement::query()->where('status', SettlementStatus::Approved)->count(),
            'processing_settlements' => PartnerSettlement::query()->where('status', SettlementStatus::TransferPending)->count(),
            'completed_settlements' => PartnerSettlement::query()->where('status', SettlementStatus::Settled)->count(),
            'failed_transfers' => ProviderTransfer::query()->where('status', ProviderTransferStatus::Failed)->count(),
            'pending_subsidies' => PlatformRelocationSubsidy::query()->where('status', RelocationSubsidyStatus::PendingApproval)->count(),
            'pending_financial_kyc' => Owner::query()->whereHas('financialProfile', function (Builder $q): void {
                $q->where('onboarding_status', FinancialOnboardingStatus::Submitted);
            })->count(),
        ];
    }

    /**
     * Daily trend aggregates for charts across the selected period.
     *
     * @return list<array{date: string, formatted_date: string, bookings_count: int, payments_amount_minor: int, commission_amount_minor: int}>
     */
    public function getPerformanceTrends(
        CarbonImmutable $start,
        CarbonImmutable $end,
        ?int $cityId = null,
        ?int $categoryId = null,
    ): array {
        $days = (int) $start->diffInDays($end) + 1;
        $maxPoints = min($days, 31); // Limit to 31 points for readable charts

        $points = [];
        $step = max(1, (int) ceil($days / $maxPoints));

        $cursor = $start;
        while ($cursor->lessThanOrEqualTo($end)) {
            $next = $cursor->addDays($step)->subSecond();
            if ($next->greaterThan($end)) {
                $next = $end;
            }

            $bookings = Reservation::query()
                ->whereBetween('created_at', [$cursor, $next])
                ->when($cityId !== null || $categoryId !== null, function (Builder $q) use ($cityId, $categoryId): void {
                    $q->whereHas('property', function (Builder $pq) use ($cityId, $categoryId): void {
                        if ($cityId !== null) {
                            $pq->where('city_id', $cityId);
                        }
                        if ($categoryId !== null) {
                            $pq->where('property_category_id', $categoryId);
                        }
                    });
                })
                ->count();

            $payments = (int) (ReservationPayment::query()
                ->where('status', PaymentStatus::Captured)
                ->whereBetween('captured_at', [$cursor, $next])
                ->when($cityId !== null || $categoryId !== null, function (Builder $q) use ($cityId, $categoryId): void {
                    $q->whereHas('reservation.property', function (Builder $pq) use ($cityId, $categoryId): void {
                        if ($cityId !== null) {
                            $pq->where('city_id', $cityId);
                        }
                        if ($categoryId !== null) {
                            $pq->where('property_category_id', $categoryId);
                        }
                    });
                })
                ->sum('amount_minor') ?? 0);

            $commission = (int) (Reservation::query()
                ->whereBetween('created_at', [$cursor, $next])
                ->where('status', ReservationStatus::Confirmed)
                ->when($cityId !== null || $categoryId !== null, function (Builder $q) use ($cityId, $categoryId): void {
                    $q->whereHas('property', function (Builder $pq) use ($cityId, $categoryId): void {
                        if ($cityId !== null) {
                            $pq->where('city_id', $cityId);
                        }
                        if ($categoryId !== null) {
                            $pq->where('property_category_id', $categoryId);
                        }
                    });
                })
                ->sum('commission_amount_minor') ?? 0);

            $points[] = [
                'date' => $cursor->toDateString(),
                'formatted_date' => $cursor->format('d M'),
                'bookings_count' => $bookings,
                'payments_amount_minor' => $payments,
                'commission_amount_minor' => $commission,
            ];

            $cursor = $cursor->addDays($step);
        }

        return $points;
    }

    /**
     * City distribution across launch cities: Hyderabad, Guntur, Vijayawada, Visakhapatnam.
     *
     * @return list<array{city_id: int, city_name: string, active_properties: int, bookings_count: int, payments_amount_minor: int}>
     */
    public function getCityDistribution(CarbonImmutable $start, CarbonImmutable $end): array
    {
        $cities = City::query()->orderBy('name')->get();

        $distribution = [];

        foreach ($cities as $city) {
            $propertiesCount = Property::query()
                ->where('city_id', $city->id)
                ->where('status', PropertyOperationalStatus::Active)
                ->where('is_verified', true)
                ->count();

            $resQuery = Reservation::query()
                ->whereHas('property', fn (Builder $q) => $q->where('city_id', $city->id))
                ->whereBetween('created_at', [$start, $end]);

            $bookingsCount = (clone $resQuery)->count();

            $payments = (int) (ReservationPayment::query()
                ->where('status', PaymentStatus::Captured)
                ->whereBetween('captured_at', [$start, $end])
                ->whereHas('reservation.property', fn (Builder $q) => $q->where('city_id', $city->id))
                ->sum('amount_minor') ?? 0);

            $distribution[] = [
                'city_id' => $city->id,
                'city_name' => $city->name,
                'active_properties' => $propertiesCount,
                'bookings_count' => $bookingsCount,
                'payments_amount_minor' => $payments,
            ];
        }

        return $distribution;
    }

    /**
     * @return array{
     *     categories: list<array{
     *         category_id: int,
     *         name: string,
     *         slug: string,
     *         code: string,
     *         properties_count: int,
     *         active_properties_count: int,
     *     }>,
     *     total_properties: int,
     * }
     */
    public function inventoryDistributionSummary(): array
    {
        $categories = PropertyCategory::query()->ordered()->get();
        $categoriesData = [];

        foreach ($categories as $category) {
            $totalCount = Property::query()->where('property_category_id', $category->id)->count();
            $activeCount = Property::query()
                ->where('property_category_id', $category->id)
                ->where('status', PropertyOperationalStatus::Active)
                ->where('is_verified', true)
                ->count();

            $categoriesData[] = [
                'category_id' => $category->id,
                'name' => $category->name,
                'slug' => $category->slug,
                'code' => $category->code,
                'properties_count' => $totalCount,
                'active_properties_count' => $activeCount,
            ];
        }

        return [
            'categories' => $categoriesData,
            'total_properties' => Property::query()->count(),
        ];
    }
}
