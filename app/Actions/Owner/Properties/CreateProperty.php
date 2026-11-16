<?php

declare(strict_types=1);

namespace App\Actions\Owner\Properties;

use App\Enums\AccommodationCategory;
use App\Enums\PropertyOperationalStatus;
use App\Enums\PropertyOwnershipArrangement;
use App\Enums\PropertyVerificationEventType;
use App\Enums\PropertyVerificationStatus;
use App\Models\City;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyCategory;
use App\Models\PropertyVerificationEvent;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CreateProperty
{
    public function __construct(
        public readonly CreatePropertyApplicationRecord $createApplicationRecord,
    ) {}

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function execute(Owner $owner, array $attributes): Property
    {
        if (! $owner->canPublishProperties()) {
            throw ValidationException::withMessages([
                'owner' => 'Only verified, Active partners may register properties on TIJUM.',
            ]);
        }

        $maxLimit = (int) config('tijum.property_management.max_properties_per_owner', 0);
        if ($maxLimit > 0 && $owner->properties()->count() >= $maxLimit) {
            throw ValidationException::withMessages([
                'owner' => sprintf('Platform property creation limit (%d) reached for this account.', $maxLimit),
            ]);
        }

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
                'property_category_id' => 'Select one of TIJUM’s active accommodation categories (Hostels/PG, Homestays, or Co-Living).',
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

        $arrangement = PropertyOwnershipArrangement::tryFrom(
            (string) ($attributes['ownership_arrangement'] ?? PropertyOwnershipArrangement::OwnerOperator->value),
        ) ?? PropertyOwnershipArrangement::OwnerOperator;

        return DB::transaction(function () use ($owner, $category, $city, $attributes, $arrangement): Property {
            $name = trim((string) $attributes['name']);
            $tmpUlid = Str::ulid()->toString();

            $property = new Property;
            $property->forceFill([
                'owner_id' => $owner->id,
                'property_category_id' => $category->id,
                'city_id' => $city->id,
                'property_reference' => 'TMP-'.$tmpUlid,
                'name' => $name,
                'slug' => Str::slug($name).'-'.Str::lower(substr($tmpUlid, -6)),
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
                'latitude' => $attributes['latitude'] ?? null,
                'longitude' => $attributes['longitude'] ?? null,
                'status' => PropertyOperationalStatus::Draft,
                'is_verified' => false,
                'booking_eligible' => false,
            ]);
            $property->save();

            $reference = sprintf('TJP-%s-%06d', now()->format('Y'), $property->id);
            $slug = Str::slug($name).'-'.Str::lower($reference);

            $property->forceFill([
                'property_reference' => $reference,
                'slug' => $slug,
            ])->save();

            $application = $this->createApplicationRecord->execute(
                property: $property,
                revisionNumber: 1,
                isAmendment: false,
                arrangement: $arrangement,
            );

            PropertyVerificationEvent::record(
                property: $property,
                application: $application,
                eventType: PropertyVerificationEventType::DraftCreated,
                actorType: 'owner',
                actorId: $owner->id,
                actorName: $owner->name,
                newStatus: PropertyVerificationStatus::Draft,
                notes: sprintf('Property draft %s (%s) created.', $reference, $name),
                metadata: [
                    'property_reference' => $reference,
                    'category_slug' => $category->slug,
                    'city_slug' => $city->slug,
                ],
            );

            return $property->fresh(['category', 'city', 'activeVerificationApplication']) ?? $property;
        });
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
