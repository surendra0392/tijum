<?php

declare(strict_types=1);

namespace App\Actions\Owner\Auth;

use App\Enums\OwnerStatus;
use App\Enums\PropertyGenderPolicy;
use App\Enums\PropertyOperationalStatus;
use App\Enums\PropertyRoomTypeMode;
use App\Models\City;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyRoomType;
use Illuminate\Support\Str;

final class RegisterOwner
{
    /**
     * Create a new property owner account in the owners table and an initial draft property.
     *
     * @param  array{
     *     name: string,
     *     email: string,
     *     phone: string,
     *     password: string,
     *     property_name?: string,
     *     property_category_id?: int,
     *     available_for?: string,
     *     city_id?: int,
     *     locality?: string,
     *     description?: string|null
     * }  $data
     */
    public function execute(array $data): Owner
    {
        $owner = new Owner;
        $owner->forceFill([
            'name' => trim($data['name']),
            'email' => Str::lower(trim($data['email'])),
            'phone' => trim($data['phone']),
            'password' => $data['password'],
            'status' => OwnerStatus::PendingVerification,
        ])->save();

        if (isset($data['property_name'], $data['property_category_id'], $data['city_id'])) {
            $city = City::query()->find($data['city_id']);
            $ref = sprintf('TJP-%s-%06d', now()->format('Y'), mt_rand(100000, 999999));
            $slug = Str::slug($data['property_name']).'-'.strtolower(Str::random(6));

            $availableFor = $data['available_for'] ?? 'both';
            $genderPolicy = match ($availableFor) {
                'male', 'male_only' => PropertyGenderPolicy::MaleOnly,
                'female', 'female_only' => PropertyGenderPolicy::FemaleOnly,
                default => PropertyGenderPolicy::AllGenders,
            };

            $locality = $data['locality'] ?? ($city?->name ?? 'Downtown');
            $address = $locality.', '.($city?->name ?? 'City');

            $property = new Property;
            $property->forceFill([
                'owner_id' => $owner->id,
                'property_category_id' => (int) $data['property_category_id'],
                'city_id' => (int) $data['city_id'],
                'property_reference' => $ref,
                'name' => trim($data['property_name']),
                'slug' => $slug,
                'description' => isset($data['description']) && trim($data['description']) !== ''
                    ? trim($data['description'])
                    : 'Welcome to '.trim($data['property_name']).'. Clean, safe accommodation with daily verified meal services.',
                'contact_person_name' => $owner->name,
                'contact_phone' => $owner->phone,
                'contact_email' => $owner->email,
                'address_line_1' => $address,
                'locality' => $locality,
                'postal_code' => '500001',
                'state' => $city?->state ?? 'Telangana',
                'country_code' => 'IN',
                'food_provided' => true,
                'breakfast_included' => true,
                'lunch_included' => false,
                'dinner_included' => false,
                'status' => PropertyOperationalStatus::Draft,
                'is_verified' => false,
                'booking_eligible' => false,
            ]);
            $property->save();

            // Create default initial room type reflecting gender policy
            $roomType = new PropertyRoomType;
            $roomType->forceFill([
                'property_id' => $property->id,
                'name' => 'Standard Sharing Room',
                'slug' => 'standard-sharing-'.$property->id,
                'description' => 'Standard room at '.$property->name,
                'accommodation_mode' => PropertyRoomTypeMode::Shared,
                'max_guests_per_room' => 2,
                'sharing_capacity' => 2,
                'gender_policy' => $genderPolicy,
                'guest_composition_policy' => ['individuals'],
                'early_check_in_enabled' => false,
                'is_approved_version' => false,
                'daily_rate_minor' => 50000,
                'weekly_rate_minor' => 300000,
                'monthly_rate_minor' => 900000,
                'is_active' => true,
                'display_order' => 1,
            ]);
            $roomType->save();
        }

        $owner->sendEmailVerificationNotification();

        return $owner;
    }
}
