<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\OwnerStatus;
use App\Enums\PropertyAvailabilityBlockStatus;
use App\Enums\PropertyOperationalStatus;
use App\Enums\PropertyRoomStatus;
use App\Enums\PropertyRoomTypeMode;
use App\Models\Amenity;
use App\Models\City;
use App\Models\Property;
use App\Models\PropertyAvailabilityBlock;
use App\Models\PropertyCategory;
use App\Models\PropertyRoomType;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class PropertySearchEligibility
{
    public function __construct(private readonly StayTimingPolicy $timing) {}

    /**
     * @param  array<string, mixed>  $filters
     * @return Builder<Property>
     */
    public function eligiblePropertiesQuery(array $filters): Builder
    {
        $query = Property::query()
            ->where('is_verified', true)
            ->where('status', PropertyOperationalStatus::Active->value)
            ->where('food_provided', true)
            ->whereHas('owner', static function (Builder $q): void {
                $q->where('status', OwnerStatus::Active->value);
            })
            ->whereHas('city', static function (Builder $q): void {
                $q->where('is_active', true);
            })
            ->whereHas('category', static function (Builder $q): void {
                $q->where('is_active', true);
            });

        if (isset($filters['city']) && $filters['city'] !== '' && (int) $filters['city'] > 0) {
            $query->where('city_id', (int) $filters['city']);
        }

        $categories = $filters['category'] ?? [];
        if (is_array($categories) && $categories !== []) {
            $query->whereIn('property_category_id', $categories);
        }

        $genderPref = $filters['gender_preference'] ?? null;
        if ($genderPref === 'male') {
            $query->whereHas('roomTypes', static fn (Builder $rt) => $rt->where('gender_policy', 'male_only'));
        } elseif ($genderPref === 'female') {
            $query->whereHas('roomTypes', static fn (Builder $rt) => $rt->where('gender_policy', 'female_only'));
        } elseif ($genderPref === 'both') {
            $query->whereHas('roomTypes', static fn (Builder $rt) => $rt->where('gender_policy', 'all_genders'));
        }
        // If $genderPref is 'all', 'any', or not set, no restriction is applied (shows all properties)

        return $query;
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return Builder<Property>
     */
    public function basePropertyQuery(array $filters): Builder
    {
        $checkIn = CarbonImmutable::parse((string) $filters['check_in'], $this->timezone())->startOfDay();
        $checkOut = $this->checkoutDate($filters);
        $durationType = (string) $filters['duration_type'];

        $query = Property::query()
            ->where('is_verified', true)
            ->where('booking_eligible', true)
            ->whereNotNull('latest_approved_application_id')
            ->where('status', PropertyOperationalStatus::Active->value)
            ->where('food_provided', true)
            ->where(static function (Builder $q): void {
                $q->where('breakfast_included', true)
                    ->orWhere('lunch_included', true)
                    ->orWhere('dinner_included', true);
            })
            ->whereHas('owner', static function (Builder $q): void {
                $q->where('status', OwnerStatus::Active->value)
                    ->whereNotNull('email_verified_at');
            })
            ->whereHas('city', static function (Builder $q): void {
                $q->where('is_active', true);
            })
            ->whereHas('category', static function (Builder $q): void {
                $q->where('is_active', true);
            });

        if (! empty($filters['city']) && (int) $filters['city'] > 0) {
            $query->where('city_id', (int) $filters['city']);
        }

        $query->whereDoesntHave('availabilityBlocks', function (Builder $q) use ($checkIn, $checkOut): void {
            $this->applyOverlap($q, $checkIn, $checkOut);
            $q->where('scope', 'property')
                ->where('status', PropertyAvailabilityBlockStatus::Active->value);
        });

        $query->whereHas('roomTypes', function (Builder $rt) use ($filters, $checkIn, $checkOut, $durationType): void {
            $this->applyRoomTypeEligibility($rt, $filters, $checkIn, $checkOut, $durationType);
        });

        $locality = isset($filters['locality']) && is_string($filters['locality']) ? trim($filters['locality']) : '';
        if ($locality !== '') {
            $like = '%'.addcslashes($locality, '%_\\').'%';
            $query->where('locality', 'like', $like);
        }

        $categories = $filters['category'] ?? [];
        if (is_array($categories) && $categories !== []) {
            $query->whereIn('property_category_id', $categories);
        }

        $meals = $filters['food_meals'] ?? [];
        if (is_array($meals)) {
            foreach ($meals as $meal) {
                if ($meal === 'breakfast') {
                    $query->where('breakfast_included', true);
                }
                if ($meal === 'lunch') {
                    $query->where('lunch_included', true);
                }
                if ($meal === 'dinner') {
                    $query->where('dinner_included', true);
                }
            }
        }

        return $query;
    }

    /**
     * @param  Builder<PropertyRoomType>  $rt
     * @param  array<string, mixed>  $filters
     */
    public function applyRoomTypeEligibility(Builder $rt, array $filters, CarbonImmutable $checkIn, CarbonImmutable $checkOut, string $durationType): void
    {
        $rt->where('is_active', true)
            ->whereNotNull($this->priceColumn($durationType))
            ->where($this->priceColumn($durationType), '>', 0);

        $genderPref = $filters['gender_preference'] ?? null;
        if ($genderPref === 'male') {
            $rt->where('gender_policy', 'male_only');
        } elseif ($genderPref === 'female') {
            $rt->where('gender_policy', 'female_only');
        } elseif ($genderPref === 'both') {
            $rt->where('gender_policy', 'all_genders');
        }
        // If $genderPref is 'all', 'any', or not set, no restriction is applied

        $sharing = $filters['sharing_capacity'] ?? [];
        if (is_array($sharing) && $sharing !== []) {
            $wantsSingle = in_array(1, $sharing, true);
            $sharedCaps = array_values(array_filter(array_map('intval', $sharing), static fn (int $v): bool => in_array($v, [2, 3, 4], true)));
            $rt->where(function (Builder $q) use ($wantsSingle, $sharedCaps): void {
                $applied = false;
                if ($sharedCaps !== []) {
                    $q->where(function (Builder $s) use ($sharedCaps): void {
                        $s->where('accommodation_mode', PropertyRoomTypeMode::Shared->value)
                            ->whereIn('sharing_capacity', $sharedCaps);
                    });
                    $applied = true;
                }
                if ($wantsSingle) {
                    if ($applied) {
                        $q->orWhere('accommodation_mode', PropertyRoomTypeMode::Private->value);
                    } else {
                        $q->where('accommodation_mode', PropertyRoomTypeMode::Private->value);
                    }
                }
            });
        }

        $ac = $filters['ac'] ?? [];
        if (is_array($ac) && $ac !== []) {
            $hasAc = in_array('ac', $ac, true);
            $hasNon = in_array('non_ac', $ac, true);
            if ($hasAc && ! $hasNon) {
                $rt->where('is_air_conditioned', true);
            } elseif ($hasNon && ! $hasAc) {
                $rt->where('is_air_conditioned', false);
            }
        }

        if (($filters['early_check_in'] ?? false) === true) {
            $rt->where('early_check_in_enabled', true);
        }

        $amenityIds = $filters['amenities'] ?? [];
        if (is_array($amenityIds) && $amenityIds !== []) {
            $amenityIds = array_values(array_unique(array_map('intval', $amenityIds)));
            $amenities = Amenity::query()->whereIn('id', $amenityIds)->get(['id', 'applicability_scope']);
            $propertyAmenityIds = $amenities->filter(static fn (Amenity $a): bool => $a->applicability_scope->appliesToProperty())->pluck('id')->all();
            $roomTypeAmenityIds = $amenities->filter(static fn (Amenity $a): bool => $a->applicability_scope->appliesToRoomType())->pluck('id')->all();

            foreach ($propertyAmenityIds as $aid) {
                $rt->whereHas('property.amenityAssignments', function (Builder $q) use ($aid): void {
                    $q->where('amenity_id', $aid)
                        ->where('is_current', true)
                        ->where('status', 'approved')
                        ->where('is_customer_visible', true)
                        ->where('availability', '!=', 'not_available')
                        ->whereHas('amenity', static function (Builder $a): void {
                            $a->where('is_active', true)->where('is_customer_visible', true);
                        });
                });
            }

            foreach ($roomTypeAmenityIds as $aid) {
                $rt->whereHas('amenityAssignments', function (Builder $q) use ($aid): void {
                    $q->where('amenity_id', $aid)
                        ->where('is_current', true)
                        ->where('status', 'approved')
                        ->where('is_customer_visible', true)
                        ->where('availability', '!=', 'not_available')
                        ->whereHas('amenity', static function (Builder $a): void {
                            $a->where('is_active', true)->where('is_customer_visible', true);
                        });
                });
            }
        }

        $rt->whereDoesntHave('property.availabilityBlocks', function (Builder $q) use ($checkIn, $checkOut): void {
            $this->applyOverlap($q, $checkIn, $checkOut);
            $q->where('status', PropertyAvailabilityBlockStatus::Active->value)
                ->where('scope', 'room_type')
                ->whereColumn('property_availability_blocks.property_room_type_id', 'property_room_types.id');
        });

        $rt->whereHas('rooms', function (Builder $room) use ($checkIn, $checkOut): void {
            $room->where('operational_status', PropertyRoomStatus::Active->value)
                ->whereDoesntHave('property.availabilityBlocks', function (Builder $q) use ($checkIn, $checkOut): void {
                    $this->applyOverlap($q, $checkIn, $checkOut);
                    $q->where('status', PropertyAvailabilityBlockStatus::Active->value)
                        ->where('scope', 'room')
                        ->whereColumn('property_availability_blocks.property_room_id', 'property_rooms.id');
                });
        });

        $rt->where(function (Builder $q): void {
            $q->where(function (Builder $shared): void {
                $shared->where('accommodation_mode', PropertyRoomTypeMode::Shared->value)
                    ->where('max_guests_per_room', '>=', 1);
            })->orWhere(function (Builder $priv): void {
                $priv->where('accommodation_mode', PropertyRoomTypeMode::Private->value);
            });
        });

        $max = $filters['max_price'] ?? null;
        if (is_int($max)) {
            $col = $this->priceColumn($durationType);
            $rt->where($col, '<=', $max);
        }
    }

    /**
     * @param  Builder<PropertyAvailabilityBlock>  $q
     */
    public function applyOverlap(Builder $q, CarbonImmutable $checkIn, CarbonImmutable $checkOutExclusive): void
    {
        $start = $checkIn->toDateString();
        $endInclusive = $checkOutExclusive->subDay()->toDateString();
        $q->whereDate('start_date', '<=', $endInclusive)
            ->whereDate('end_date', '>=', $start);
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    public function checkoutDate(array $filters): CarbonImmutable
    {
        $type = (string) ($filters['duration_type'] ?? 'daily');
        $count = max(1, (int) ($filters['duration_count'] ?? 1));

        return $this->timing->calculateCheckoutDate((string) $filters['check_in'], $type, $count);
    }

    public function priceColumn(string $durationType): string
    {
        return match ($durationType) {
            'weekly' => 'weekly_rate_minor',
            'monthly' => 'monthly_rate_minor',
            default => 'daily_rate_minor',
        };
    }

    public function timezone(): string
    {
        return $this->timing->timezone();
    }

    /**
     * @return array<int, array{id:int,name:string,slug:string,state:?string}>
     */
    public function activeCities(): array
    {
        return City::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'state'])
            ->map(static fn (City $c): array => [
                'id' => $c->id,
                'name' => $c->name,
                'slug' => $c->slug,
                'state' => $c->state,
            ])->all();
    }

    /**
     * @param  array<int, array{id:int,name:string,slug:string,state:?string}>  $cities
     * @return array<int, array{
     *     id:string,
     *     name:string,
     *     type:'city'|'locality'|'landmark',
     *     secondary_text:string,
     *     city:string,
     *     locality:?string,
     *     lat:?float,
     *     lng:?float
     * }>
     */
    public function searchLocations(array $cities): array
    {
        if (app()->environment('testing')) {
            return $this->buildSearchLocations($cities);
        }

        $cacheKey = 'public_search_locations_v1:'.md5(serialize($cities));

        return Cache::remember($cacheKey, 300, fn (): array => $this->buildSearchLocations($cities));
    }

    /**
     * @param  array<int, array{id:int,name:string,slug:string,state:?string}>  $cities
     * @return array<int, array{
     *     id:string,
     *     name:string,
     *     type:'city'|'locality'|'landmark',
     *     secondary_text:string,
     *     city:string,
     *     locality:?string,
     *     lat:?float,
     *     lng:?float
     * }>
     */
    private function buildSearchLocations(array $cities): array
    {
        $searchablePlaces = Property::query()
            ->join('cities', 'cities.id', '=', 'properties.city_id')
            ->join('owners', 'owners.id', '=', 'properties.owner_id')
            ->join('property_categories', 'property_categories.id', '=', 'properties.property_category_id')
            ->where('properties.is_verified', true)
            ->where('properties.booking_eligible', true)
            ->whereNotNull('properties.latest_approved_application_id')
            ->where('properties.status', PropertyOperationalStatus::Active->value)
            ->where('properties.food_provided', true)
            ->where(static function (Builder $query): void {
                $query->where('properties.breakfast_included', true)
                    ->orWhere('properties.lunch_included', true)
                    ->orWhere('properties.dinner_included', true);
            })
            ->where('owners.status', OwnerStatus::Active->value)
            ->whereNotNull('owners.email_verified_at')
            ->where('cities.is_active', true)
            ->where('property_categories.is_active', true)
            ->whereHas('roomTypes', static function (Builder $roomType): void {
                $roomType->where('is_active', true)
                    ->where(static function (Builder $prices): void {
                        $prices->where('daily_rate_minor', '>', 0)
                            ->orWhere('weekly_rate_minor', '>', 0)
                            ->orWhere('monthly_rate_minor', '>', 0);
                    })
                    ->whereHas('rooms', static function (Builder $room): void {
                        $room->where('operational_status', PropertyRoomStatus::Active->value);
                    });
            })
            ->select([
                'properties.city_id',
                'properties.locality',
                'properties.landmark',
            ])
            ->selectRaw('AVG(properties.latitude) as average_latitude')
            ->selectRaw('AVG(properties.longitude) as average_longitude')
            ->groupBy('properties.city_id', 'properties.locality', 'properties.landmark')
            ->orderBy('properties.locality')
            ->orderBy('properties.landmark')
            ->get()
            ->groupBy(static fn (Property $property): int => (int) $property->city_id);

        $locations = [];

        foreach ($cities as $city) {
            $cityId = $city['id'];
            $cityName = $city['name'];
            $cityState = $city['state'];
            $cityPlaces = $searchablePlaces->get($cityId, collect());

            $locations[] = [
                'id' => 'city:'.$cityId,
                'name' => $cityName,
                'type' => 'city',
                'secondary_text' => $cityState ? $cityState.', India' : 'India',
                'city' => $city['slug'],
                'locality' => null,
                'lat' => null,
                'lng' => null,
            ];

            $localities = $cityPlaces
                ->filter(static fn (Property $property): bool => trim((string) $property->locality) !== '')
                ->unique(static fn (Property $property): string => Str::lower(trim((string) $property->locality)));

            foreach ($localities as $place) {
                $locality = trim((string) $place->locality);
                $locations[] = [
                    'id' => 'locality:'.$cityId.':'.Str::slug($locality),
                    'name' => $locality,
                    'type' => 'locality',
                    'secondary_text' => $cityState ? $cityName.', '.$cityState : $cityName,
                    'city' => $city['slug'],
                    'locality' => $locality,
                    'lat' => is_numeric($place->getAttribute('average_latitude')) ? (float) $place->getAttribute('average_latitude') : null,
                    'lng' => is_numeric($place->getAttribute('average_longitude')) ? (float) $place->getAttribute('average_longitude') : null,
                ];
            }

            $landmarks = $cityPlaces
                ->filter(static fn (Property $property): bool => trim((string) $property->landmark) !== '')
                ->unique(static fn (Property $property): string => Str::lower(trim((string) $property->landmark)));

            foreach ($landmarks as $place) {
                $landmark = trim((string) $place->landmark);
                $locality = trim((string) $place->locality);
                $locations[] = [
                    'id' => 'landmark:'.$cityId.':'.Str::slug($landmark),
                    'name' => $landmark,
                    'type' => 'landmark',
                    'secondary_text' => $locality !== '' ? $locality.', '.$cityName : $cityName,
                    'city' => $city['slug'],
                    'locality' => $locality !== '' ? $locality : null,
                    'lat' => is_numeric($place->getAttribute('average_latitude')) ? (float) $place->getAttribute('average_latitude') : null,
                    'lng' => is_numeric($place->getAttribute('average_longitude')) ? (float) $place->getAttribute('average_longitude') : null,
                ];
            }
        }

        return $locations;
    }

    /**
     * @return array<int, array{id:int,name:string,slug:string,code:string}>
     */
    public function activeCategories(): array
    {
        return PropertyCategory::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'code'])
            ->map(static fn (PropertyCategory $c): array => [
                'id' => $c->id,
                'name' => $c->name,
                'slug' => $c->slug,
                'code' => $c->code,
            ])->all();
    }

    public function timingPolicy(): StayTimingPolicy
    {
        return $this->timing;
    }
}
