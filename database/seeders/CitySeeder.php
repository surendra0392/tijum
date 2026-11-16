<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CitySeeder extends Seeder
{
    /**
     * @return list<array{
     *     name: string,
     *     slug: string,
     *     state: string,
     *     state_code: string,
     *     country_code: string,
     *     is_active: bool,
     *     sort_order: int
     * }>
     */
    public static function launchCities(): array
    {
        return [
            [
                'name' => 'Hyderabad',
                'slug' => 'hyderabad',
                'state' => 'Telangana',
                'state_code' => 'TG',
                'country_code' => 'IN',
                'is_active' => true,
                'sort_order' => 1,
            ],
            [
                'name' => 'Guntur',
                'slug' => 'guntur',
                'state' => 'Andhra Pradesh',
                'state_code' => 'AP',
                'country_code' => 'IN',
                'is_active' => true,
                'sort_order' => 2,
            ],
            [
                'name' => 'Vijayawada',
                'slug' => 'vijayawada',
                'state' => 'Andhra Pradesh',
                'state_code' => 'AP',
                'country_code' => 'IN',
                'is_active' => true,
                'sort_order' => 3,
            ],
            [
                'name' => 'Visakhapatnam',
                'slug' => 'visakhapatnam',
                'state' => 'Andhra Pradesh',
                'state_code' => 'AP',
                'country_code' => 'IN',
                'is_active' => true,
                'sort_order' => 4,
            ],
        ];
    }

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $now = now();

        $rows = array_map(
            static fn (array $city): array => [
                ...$city,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            self::launchCities(),
        );

        DB::table('cities')->upsert(
            $rows,
            ['slug'],
            ['name', 'state', 'state_code', 'country_code', 'is_active', 'sort_order', 'updated_at'],
        );
    }
}
