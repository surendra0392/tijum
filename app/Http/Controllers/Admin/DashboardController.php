<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\City;
use App\Models\PropertyCategory;
use App\Services\Admin\AdminActivityFeedService;
use App\Services\Admin\AdminDashboardMetricsService;
use App\Services\Admin\AdminOperationsQueueService;
use App\Services\Admin\AdminSystemHealthService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(
        private readonly AdminDashboardMetricsService $metricsService,
        private readonly AdminOperationsQueueService $queueService,
        private readonly AdminActivityFeedService $activityFeedService,
        private readonly AdminSystemHealthService $healthService,
    ) {}

    public function __invoke(Request $request): Response
    {
        /** @var Admin $admin */
        $admin = $request->user('admin');

        $range = (string) $request->query('range', 'last_30_days');
        $cityId = $request->filled('city_id') ? (int) $request->query('city_id') : null;
        $categoryId = $request->filled('category_id') ? (int) $request->query('category_id') : null;
        $customFrom = $request->query('from') ? (string) $request->query('from') : null;
        $customTo = $request->query('to') ? (string) $request->query('to') : null;

        // Permissions
        $canViewFinance = $admin->hasPermission('*') || $admin->hasPermission('settlements.view') || $admin->hasPermission('partners.financial.view');
        $canViewOperations = $admin->hasPermission('*') || $admin->hasPermission('operations.manage') || $admin->hasPermission('properties.view') || $admin->hasPermission('properties.verify');
        $canViewProtection = $admin->hasPermission('*') || $admin->hasPermission('support.manage') || $admin->hasPermission('operations.manage');
        $canViewReservations = $admin->hasPermission('*') || $admin->hasPermission('bookings.view') || $admin->hasPermission('bookings.manage');
        $canViewPartners = $admin->hasPermission('*') || $admin->hasPermission('partners.view');
        $canViewProperties = $admin->hasPermission('*') || $admin->hasPermission('properties.view');

        // Metrics
        $metrics = $this->metricsService->getMetrics(
            range: $range,
            cityId: $cityId,
            categoryId: $categoryId,
            customFrom: $customFrom,
            customTo: $customTo,
        );

        // Sanitize financial metrics if admin is not authorized to view finance
        if (! $canViewFinance) {
            $metrics['revenue_breakdown'] = null;
            $metrics['payment_metrics'] = null;
            $metrics['financial_operations'] = null;
        }

        // Operational queues
        $queues = $this->queueService->getQueues();
        if (! $canViewFinance) {
            $queues['financial_operations'] = [];
            $queues['payment_operations'] = [];
        }
        if (! $canViewOperations && ! $canViewPartners) {
            $queues['partner_onboarding'] = [];
            $queues['property_approval'] = [];
        }
        if (! $canViewProtection) {
            $queues['customer_protection'] = [];
        }
        if (! $canViewReservations) {
            $queues['reservation_operations'] = [];
        }

        // Activity feed & System health
        $activities = $this->activityFeedService->getRecentActivities(20);
        $systemHealth = $this->healthService->getHealthSummary();

        // Reference lists for filter controls
        $cities = City::query()->select(['id', 'name', 'state'])->orderBy('name')->get();
        $categories = PropertyCategory::query()->select(['id', 'name'])->orderBy('name')->get();

        return Inertia::render('admin/dashboard', [
            'filters' => [
                'range' => $range,
                'city_id' => $cityId,
                'category_id' => $categoryId,
                'from' => $customFrom,
                'to' => $customTo,
            ],
            'filterMetadata' => $metrics['filter_metadata'],
            'marketplaceOverview' => $metrics['marketplace_overview'],
            'reservationMetrics' => $metrics['reservation_metrics'],
            'paymentMetrics' => $metrics['payment_metrics'],
            'revenueBreakdown' => $metrics['revenue_breakdown'],
            'customerProtectionMetrics' => $metrics['customer_protection_metrics'],
            'financialOperations' => $metrics['financial_operations'],
            'trends' => $metrics['trends'],
            'cityDistribution' => $metrics['city_distribution'],
            'queues' => $queues,
            'recentActivities' => $activities,
            'systemHealth' => $systemHealth,
            'cities' => $cities,
            'categories' => $categories,
            'securitySummary' => [
                'twoFactorEnabled' => $admin->hasTwoFactorEnabled(),
                'twoFactorConfirmedAt' => $admin->two_factor_confirmed_at?->toISOString(),
                'recoveryCodesRemaining' => count($admin->recoveryCodes()),
                'guard' => 'admin',
            ],
            'capabilities' => [
                'canViewFinance' => $canViewFinance,
                'canViewOperations' => $canViewOperations,
                'canViewProtection' => $canViewProtection,
                'canViewReservations' => $canViewReservations,
                'canViewPartners' => $canViewPartners,
                'canViewProperties' => $canViewProperties,
            ],
        ]);
    }
}
