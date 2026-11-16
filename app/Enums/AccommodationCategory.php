<?php

declare(strict_types=1);

namespace App\Enums;

enum AccommodationCategory: string
{
    case HostelsPg = 'hostels-pg';
    case Homestays = 'homestays';
    case CoLiving = 'co-living';

    /**
     * Human-readable display label.
     */
    public function label(): string
    {
        return match ($this) {
            self::HostelsPg => 'Hostels/PG',
            self::Homestays => 'Homestays',
            self::CoLiving => 'Co-Living',
        };
    }

    /**
     * Machine-readable database code.
     */
    public function code(): string
    {
        return match ($this) {
            self::HostelsPg => 'hostel_pg',
            self::Homestays => 'homestay',
            self::CoLiving => 'coliving',
        };
    }

    /**
     * Canonical icon name.
     */
    public function iconName(): string
    {
        return match ($this) {
            self::HostelsPg => 'Building2',
            self::Homestays => 'Home',
            self::CoLiving => 'Users',
        };
    }

    /**
     * Canonical sort ordering.
     */
    public function sortOrder(): int
    {
        return match ($this) {
            self::HostelsPg => 1,
            self::Homestays => 2,
            self::CoLiving => 3,
        };
    }

    /**
     * Canonical category narrative description.
     */
    public function description(): string
    {
        return match ($this) {
            self::HostelsPg => 'Explore hostel and paying guest accommodation with room options, amenities and meal arrangements shown for each property.',
            self::Homestays => 'Explore accommodation in residential homes, with property details, room options and available services shown for each property.',
            self::CoLiving => 'Explore shared-living accommodation with room options, property details and available amenities shown for each space.',
        };
    }

    /**
     * Resolve legacy category strings, slugs, or codes to canonical enum.
     */
    public static function tryFromLegacy(string $identifier): ?self
    {
        $normalized = strtolower(trim($identifier));
        $normalized = str_replace(['_', ' '], '-', $normalized);

        return match ($normalized) {
            'hostels-pg', 'hostel-pg', 'hostels_pg', 'hostel_pg', 'hostels/pg', 'hostels-and-pg', 'hostels-pgs',
            'independent-hostel', 'independent_hostel', 'hostel', 'hostels',
            'pg-accommodation', 'pg_accommodation', 'pg', 'paying-guest', 'paying_guest' => self::HostelsPg,

            'homestays', 'homestay', 'home-stay', 'home_stay' => self::Homestays,

            'co-living', 'coliving', 'co_living', 'co-live', 'community-living', 'shared-living' => self::CoLiving,

            default => self::tryFrom($identifier),
        };
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /**
     * @return list<array{
     *     value: string,
     *     label: string,
     *     code: string,
     *     icon: string,
     *     description: string,
     *     sort_order: int
     * }>
     */
    public static function options(): array
    {
        return array_map(
            static fn (self $category): array => [
                'value' => $category->value,
                'label' => $category->label(),
                'code' => $category->code(),
                'icon' => $category->iconName(),
                'description' => $category->description(),
                'sort_order' => $category->sortOrder(),
            ],
            self::cases(),
        );
    }
}
