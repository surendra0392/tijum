<?php

declare(strict_types=1);

namespace App\Enums;

enum BannerPlacement: string
{
    case HomepageHero = 'homepage_hero';
    case HomepageStrip = 'homepage_strip';
    case CityPage = 'city_page';
    case BlogPage = 'blog_page';

    public function label(): string
    {
        return match ($this) {
            self::HomepageHero => 'Homepage Hero Section',
            self::HomepageStrip => 'Homepage Promotional Strip',
            self::CityPage => 'City Landing Pages',
            self::BlogPage => 'Blog & Content Hub',
        };
    }
}
