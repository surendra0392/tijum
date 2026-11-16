<?php

declare(strict_types=1);

namespace App\Enums;

enum AdminRole: string
{
    case SuperAdmin = 'super_admin';
    case PropertyVerification = 'property_verification';
    case Operations = 'operations';
    case Finance = 'finance';
    case CustomerSupport = 'customer_support';

    public function label(): string
    {
        return match ($this) {
            self::SuperAdmin => 'Super Admin',
            self::PropertyVerification => 'Property Verification',
            self::Operations => 'Operations',
            self::Finance => 'Finance',
            self::CustomerSupport => 'Customer Support',
        };
    }

    public function isSuperAdmin(): bool
    {
        return $this === self::SuperAdmin;
    }

    /**
     * @return list<string>
     */
    public function permissions(): array
    {
        return match ($this) {
            self::SuperAdmin => ['*'],
            self::PropertyVerification => [
                'dashboard.view',
                'owners.view',
                'owners.verify',
                'properties.verify',
                'partners.view',
                'partners.review',
                'partners.assign',
                'partners.request_information',
                'partners.approve',
                'partners.reject',
                'partners.view_documents',
                'properties.view',
                'properties.review',
                'properties.assign',
                'properties.request_information',
                'properties.approve',
                'properties.reject',
                'properties.view_documents',
                'amenities.view',
                'amenities.review',
                'amenities.assign',
                'amenities.request_information',
                'amenities.approve',
                'amenities.reject',
                'pricing.view',
                'pricing.review',
            ],
            self::Operations => [
                'dashboard.view',
                'owners.view',
                'bookings.manage',
                'operations.manage',
                'partners.view',
                'properties.view',
                'properties.manage_status',
                'amenities.view',
                'pricing.view',
                'pricing.manage_restrictions',
                'availability.view',
                'availability.manage_restrictions',
                'reviews.view',
                'reviews.moderate',
                'review_reports.view',
                'review_reports.manage',
                'content.view',
                'content.manage',
                'content.publish',
                'seo.view',
                'seo.manage',
                'marketing.view',
                'marketing.manage',
                'marketing.campaigns.send',
            ],
            self::Finance => [
                'dashboard.view',
                'settlements.view',
                'settlements.manage',
                'settlements.release',
                'refunds.manage',
                'partners.financial.view',
                'partners.financial.manage',
                'commissions.view',
                'commissions.manage',
                'financial.reconciliation',
                'relocations.subsidies.manage',
                'amenities.view',
                'pricing.view',
            ],
            self::CustomerSupport => [
                'dashboard.view',
                'customers.view',
                'bookings.view',
                'support.manage',
                'amenities.view',
                'pricing.view',
                'availability.view',
                'reviews.view',
                'reviews.moderate',
                'review_reports.view',
                'review_reports.manage',
                'content.view',
                'marketing.view',
            ],
        };
    }

    public function hasPermission(string $permission): bool
    {
        if ($this === self::SuperAdmin) {
            return true;
        }

        return in_array($permission, $this->permissions(), true);
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(
            static fn (self $role): string => $role->value,
            self::cases(),
        );
    }
}
