<?php

declare(strict_types=1);

namespace App\Actions\Owner\Properties;

use App\Enums\AccommodationCategory;
use App\Enums\PropertyOwnershipArrangement;
use App\Enums\PropertyVerificationEventType;
use App\Models\City;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyCategory;
use App\Models\PropertyVerificationApplication;
use App\Models\PropertyVerificationEvent;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class UpdatePropertyDetails
{
    public function __construct(
        public readonly CreatePropertyApplicationRecord $createApplicationRecord,
    ) {}

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function execute(Owner $owner, Property $property, array $attributes): Property
    {
        $catIdOrSlug = $attributes['property_category_id'] ?? $attributes['category_id'] ?? $attributes['category'] ?? null;
        $category = null;
        if (is_numeric($catIdOrSlug)) {
            $category = PropertyCategory::query()->active()->find((int) $catIdOrSlug);
        } elseif (is_string($catIdOrSlug) && trim($catIdOrSlug) !== '') {
            $enum = AccommodationCategory::tryFromLegacy($catIdOrSlug);
            $slug = $enum?->value ?? trim($catIdOrSlug);
            $category = PropertyCategory::query()->active()->where('slug', $slug)->first();
        }

        if (! $category instanceof PropertyCategory) {
            throw ValidationException::withMessages([
                'property_category_id' => 'Select an active accommodation category (Hostels/PG, Homestays, or Co-Living).',
            ]);
        }

        $city = City::query()
            ->active()
            ->find((int) ($attributes['city_id'] ?? 0));

        if (! $city instanceof City) {
            throw ValidationException::withMessages([
                'city_id' => 'Select an active TIJUM launch city.',
            ]);
        }

        return DB::transaction(function () use ($owner, $property, $category, $city, $attributes): Property {
            $lockedProperty = Property::query()
                ->whereKey($property->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedProperty->owner_id !== $owner->id || ! $owner->canPublishProperties()) {
                throw ValidationException::withMessages([
                    'property' => 'You are not authorised to modify this property.',
                ]);
            }

            $activeApp = $lockedProperty->activeVerificationApplication()
                ->lockForUpdate()
                ->first();

            if (! $lockedProperty->canEditDirectlyWithoutAmendment($activeApp instanceof PropertyVerificationApplication ? $activeApp : null)) {
                throw ValidationException::withMessages([
                    'property' => $lockedProperty->hasApprovedBaseline()
                        ? 'Approved property details are locked. Start a Re-Verification Amendment to make verification-sensitive edits.'
                        : 'Property details cannot be edited while an application is currently submitted or under review.',
                ]);
            }

            $arrangement = PropertyOwnershipArrangement::tryFrom(
                (string) ($attributes['ownership_arrangement']
                    ?? ($activeApp instanceof PropertyVerificationApplication
                        ? $activeApp->ownership_arrangement->value
                        : PropertyOwnershipArrangement::OwnerOperator->value)),
            ) ?? PropertyOwnershipArrangement::OwnerOperator;

            $hasCoordinateInput = array_key_exists('latitude', $attributes) || array_key_exists('longitude', $attributes);
            if ($hasCoordinateInput) {
                [$resolvedLat, $resolvedLng] = $this->resolveCoordinatePair(
                    $attributes['latitude'] ?? null,
                    $attributes['longitude'] ?? null,
                );
            } else {
                $existingCoords = $lockedProperty->resolvedCoordinates();
                $resolvedLat = $existingCoords['latitude'] ?? null;
                $resolvedLng = $existingCoords['longitude'] ?? null;
            }

            $name = trim((string) $attributes['name']);
            $fieldsPayload = [
                'property_category_id' => $category->id,
                'category_name' => $category->name,
                'city_id' => $city->id,
                'city_name' => $city->name,
                'name' => $name,
                'description' => trim((string) $attributes['description']),
                'contact_person_name' => trim((string) $attributes['contact_person_name']),
                'contact_phone' => trim((string) $attributes['contact_phone']),
                'contact_email' => $this->nullableTrimmed($attributes['contact_email'] ?? null),
                'address_line_1' => trim((string) $attributes['address_line_1']),
                'address_line_2' => $this->nullableTrimmed($attributes['address_line_2'] ?? null),
                'locality' => trim((string) $attributes['locality']),
                'landmark' => $this->nullableTrimmed($attributes['landmark'] ?? null),
                'postal_code' => trim((string) $attributes['postal_code']),
                'state' => $city->state,
                'country_code' => $city->country_code,
                'latitude' => $resolvedLat,
                'longitude' => $resolvedLng,
            ];

            if (! $lockedProperty->hasApprovedBaseline()) {
                $lockedProperty->forceFill([
                    'property_category_id' => $category->id,
                    'city_id' => $city->id,
                    'name' => $name,
                    'slug' => Str::slug($name).'-'.Str::lower($lockedProperty->property_reference),
                    'description' => $fieldsPayload['description'],
                    'contact_person_name' => $fieldsPayload['contact_person_name'],
                    'contact_phone' => $fieldsPayload['contact_phone'],
                    'contact_email' => $fieldsPayload['contact_email'],
                    'address_line_1' => $fieldsPayload['address_line_1'],
                    'address_line_2' => $fieldsPayload['address_line_2'],
                    'locality' => $fieldsPayload['locality'],
                    'landmark' => $fieldsPayload['landmark'],
                    'postal_code' => $fieldsPayload['postal_code'],
                    'state' => $city->state,
                    'country_code' => $city->country_code,
                    'latitude' => $fieldsPayload['latitude'],
                    'longitude' => $fieldsPayload['longitude'],
                ])->save();

                if (! $activeApp instanceof PropertyVerificationApplication) {
                    $latestRev = (int) $lockedProperty->verificationApplications()->max('revision_number');
                    $activeApp = $this->createApplicationRecord->execute(
                        property: $lockedProperty,
                        revisionNumber: max(1, $latestRev + 1),
                        isAmendment: false,
                        arrangement: $arrangement,
                    );
                } else {
                    $activeApp->forceFill([
                        'ownership_arrangement' => $arrangement,
                    ])->save();
                }

                PropertyVerificationEvent::record(
                    property: $lockedProperty,
                    application: $activeApp,
                    eventType: PropertyVerificationEventType::PropertyUpdated,
                    actorType: 'owner',
                    actorId: $owner->id,
                    actorName: $owner->name,
                    notes: 'Updated property overview, category, city, and address details.',
                );
            } else {
                // Approved snapshot columns stay untouched; stage proposed edits inside active amendment.
                if (! $activeApp instanceof PropertyVerificationApplication) {
                    throw ValidationException::withMessages([
                        'property' => 'Active amendment application required before saving changes.',
                    ]);
                }

                $activeApp->forceFill([
                    'ownership_arrangement' => $arrangement,
                    'proposed_property_data' => $fieldsPayload,
                ])->save();

                PropertyVerificationEvent::record(
                    property: $lockedProperty,
                    application: $activeApp,
                    eventType: PropertyVerificationEventType::AmendmentUpdated,
                    actorType: 'owner',
                    actorId: $owner->id,
                    actorName: $owner->name,
                    notes: 'Updated proposed verification-sensitive property details inside amendment revision #'.$activeApp->revision_number.'.',
                );
            }

            return $lockedProperty->fresh(['category', 'city', 'activeVerificationApplication']) ?? $lockedProperty;
        });
    }

    /**
     * @return array{0: float|null, 1: float|null}
     */
    private function resolveCoordinatePair(mixed $rawLatitude, mixed $rawLongitude): array
    {
        $latEmpty = $rawLatitude === null || (is_string($rawLatitude) && trim($rawLatitude) === '');
        $lngEmpty = $rawLongitude === null || (is_string($rawLongitude) && trim($rawLongitude) === '');

        if ($latEmpty && $lngEmpty) {
            return [null, null];
        }

        if ($latEmpty || $lngEmpty || ! Property::areValidCoordinates($rawLatitude, $rawLongitude)) {
            throw ValidationException::withMessages([
                'latitude' => 'Provide valid paired latitude and longitude coordinates, or leave both blank.',
            ]);
        }

        return [(float) $rawLatitude, (float) $rawLongitude];
    }

    private function nullableTrimmed(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        return $trimmed === '' ? null : $trimmed;
    }
}
