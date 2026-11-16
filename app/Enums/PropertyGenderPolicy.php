<?php

declare(strict_types=1);

namespace App\Enums;

enum PropertyGenderPolicy: string
{
    case MaleOnly = 'male_only';
    case FemaleOnly = 'female_only';
    case AllGenders = 'all_genders';
    case NotApplicable = 'not_applicable';

    public function label(): string
    {
        return match ($this) {
            self::MaleOnly => 'Male Only',
            self::FemaleOnly => 'Female Only',
            self::AllGenders => 'All Genders',
            self::NotApplicable => 'Not Applicable',
        };
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(
            static fn (self $policy): string => $policy->value,
            self::cases(),
        );
    }
}
