<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\System;

use App\Enums\AdminRole;
use App\Http\Controllers\Controller;
use App\Models\Admin;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminRoleController extends Controller
{
    private function resolveAdmin(Request $request): Admin
    {
        $admin = $request->user('admin');
        if (! $admin instanceof Admin) {
            abort(401);
        }
        if (! $admin->isSuperAdmin()) {
            abort(403, 'Unauthorized to view system roles and permissions.');
        }

        return $admin;
    }

    public function index(Request $request): Response
    {
        $this->resolveAdmin($request);

        $adminCounts = Admin::query()
            ->selectRaw('role, count(*) as count')
            ->groupBy('role')
            ->pluck('count', 'role')
            ->all();

        $rolesData = array_map(function (AdminRole $role) use ($adminCounts): array {
            return [
                'value' => $role->value,
                'label' => $role->label(),
                'is_super_admin' => $role->isSuperAdmin(),
                'admin_count' => (int) ($adminCounts[$role->value] ?? 0),
                'permissions_count' => $role->isSuperAdmin() ? 'All (*)' : count($role->permissions()),
                'permissions' => $role->permissions(),
            ];
        }, AdminRole::cases());

        $permissionDomains = [
            [
                'domain' => 'Dashboard & System',
                'description' => 'System-wide monitoring, health, and executive access',
                'permissions' => [
                    ['key' => 'dashboard.view', 'label' => 'View Admin Dashboard'],
                ],
            ],
            [
                'domain' => 'Partner Verification',
                'description' => 'KYC, business profiles, and partner onboarding',
                'permissions' => [
                    ['key' => 'partners.view', 'label' => 'View Partners'],
                    ['key' => 'partners.review', 'label' => 'Review Partner Applications'],
                    ['key' => 'partners.assign', 'label' => 'Assign Reviewers to Partners'],
                    ['key' => 'partners.request_information', 'label' => 'Request More Information'],
                    ['key' => 'partners.approve', 'label' => 'Approve Partners'],
                    ['key' => 'partners.reject', 'label' => 'Reject Partners'],
                    ['key' => 'partners.view_documents', 'label' => 'View Sensitive KYC Documents'],
                    ['key' => 'owners.view', 'label' => 'View Owner Profiles'],
                    ['key' => 'owners.verify', 'label' => 'Verify Owners'],
                ],
            ],
            [
                'domain' => 'Properties & Listings',
                'description' => 'Listing verifications, media moderation, and operational control',
                'permissions' => [
                    ['key' => 'properties.view', 'label' => 'View Properties'],
                    ['key' => 'properties.review', 'label' => 'Review Property Submissions'],
                    ['key' => 'properties.assign', 'label' => 'Assign Property Reviewers'],
                    ['key' => 'properties.request_information', 'label' => 'Request Property Amendments'],
                    ['key' => 'properties.approve', 'label' => 'Approve Listings'],
                    ['key' => 'properties.reject', 'label' => 'Reject Listings'],
                    ['key' => 'properties.view_documents', 'label' => 'View Ownership & Deed Proofs'],
                    ['key' => 'properties.manage_status', 'label' => 'Toggle Operational Status'],
                ],
            ],
            [
                'domain' => 'Amenities & Verification',
                'description' => 'Property & room amenity verification workflows',
                'permissions' => [
                    ['key' => 'amenities.view', 'label' => 'View Amenities'],
                    ['key' => 'amenities.review', 'label' => 'Review Amenity Claims'],
                    ['key' => 'amenities.assign', 'label' => 'Assign Amenity Reviewer'],
                    ['key' => 'amenities.request_information', 'label' => 'Request Proof of Amenities'],
                    ['key' => 'amenities.approve', 'label' => 'Approve Amenities'],
                    ['key' => 'amenities.reject', 'label' => 'Reject Amenities'],
                ],
            ],
            [
                'domain' => 'Reservations & Operations',
                'description' => 'Live booking operations, check-in policies, and inventory',
                'permissions' => [
                    ['key' => 'bookings.view', 'label' => 'View Reservations'],
                    ['key' => 'bookings.manage', 'label' => 'Manage & Amend Bookings'],
                    ['key' => 'operations.manage', 'label' => 'Manage Marketplace Operations'],
                    ['key' => 'pricing.view', 'label' => 'View Pricing Structures'],
                    ['key' => 'pricing.review', 'label' => 'Review Custom Pricing'],
                    ['key' => 'pricing.manage_restrictions', 'label' => 'Set Pricing Restrictions'],
                    ['key' => 'availability.view', 'label' => 'View Inventory Availability'],
                    ['key' => 'availability.manage_restrictions', 'label' => 'Block/Unblock Inventory'],
                ],
            ],
            [
                'domain' => 'Settlements & Finance',
                'description' => 'Partner payouts, gateway refunds, commissions, and reconciliation',
                'permissions' => [
                    ['key' => 'settlements.view', 'label' => 'View Partner Settlements'],
                    ['key' => 'settlements.manage', 'label' => 'Approve/Hold Settlements'],
                    ['key' => 'settlements.release', 'label' => 'Release Payouts via Razorpay Route'],
                    ['key' => 'refunds.manage', 'label' => 'Process Customer Refunds'],
                    ['key' => 'partners.financial.view', 'label' => 'View Partner Bank & Virtual Accounts'],
                    ['key' => 'partners.financial.manage', 'label' => 'Manage Partner Financial Setup'],
                    ['key' => 'commissions.view', 'label' => 'View Marketplace Commissions'],
                    ['key' => 'commissions.manage', 'label' => 'Adjust Commission Rates'],
                    ['key' => 'financial.reconciliation', 'label' => 'Run Financial Reconciliation'],
                    ['key' => 'relocations.subsidies.manage', 'label' => 'Manage Relocation Subsidies'],
                ],
            ],
            [
                'domain' => 'Customer Support & Reviews',
                'description' => 'Guest disputes, redressal, review moderation, and SLA enforcement',
                'permissions' => [
                    ['key' => 'customers.view', 'label' => 'View Customer Accounts'],
                    ['key' => 'support.manage', 'label' => 'Manage Support Cases & Escalations'],
                    ['key' => 'reviews.view', 'label' => 'View Customer Reviews'],
                    ['key' => 'reviews.moderate', 'label' => 'Moderate & Publish Reviews'],
                    ['key' => 'review_reports.view', 'label' => 'View Reported Reviews'],
                    ['key' => 'review_reports.manage', 'label' => 'Act on Review Reports'],
                ],
            ],
            [
                'domain' => 'CMS, SEO & Marketing',
                'description' => 'Pages, blog, redirects, sitemaps, campaigns, and loyalty rewards',
                'permissions' => [
                    ['key' => 'content.view', 'label' => 'View Content Management'],
                    ['key' => 'content.manage', 'label' => 'Author & Edit CMS Articles'],
                    ['key' => 'content.publish', 'label' => 'Publish Content to Website'],
                    ['key' => 'seo.view', 'label' => 'View SEO Tools'],
                    ['key' => 'seo.manage', 'label' => 'Manage Redirects & Sitemaps'],
                    ['key' => 'marketing.view', 'label' => 'View Marketing Campaigns'],
                    ['key' => 'marketing.manage', 'label' => 'Create Banners & Promotions'],
                    ['key' => 'marketing.campaigns.send', 'label' => 'Broadcast Marketing Newsletters'],
                    ['key' => 'rewards.view', 'label' => 'View Loyalty Points & Coupons'],
                ],
            ],
        ];

        return Inertia::render('admin/system/roles/index', [
            'roles' => $rolesData,
            'permission_domains' => $permissionDomains,
            'permissionDomains' => $permissionDomains,
        ]);
    }
}
