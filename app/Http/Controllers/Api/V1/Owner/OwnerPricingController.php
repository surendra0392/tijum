<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Owner;

use App\Http\Controllers\Api\V1\ApiController;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyRoomType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class OwnerPricingController extends ApiController
{
    /**
     * Get pricing and food configuration for the property.
     */
    public function show(Request $request, int|string $id): JsonResponse
    {
        /** @var Owner $owner */
        $owner = $request->user();

        $property = Property::query()
            ->where('owner_id', $owner->id)
            ->where(function ($query) use ($id): void {
                if (is_numeric($id)) {
                    $query->where('id', (int) $id);
                } else {
                    $query->where('slug', (string) $id);
                }
            })
            ->with([
                'roomTypes' => fn ($q) => $q->where('is_active', true)->orderBy('display_order')->orderBy('name'),
            ])
            ->first();

        if ($property === null) {
            return $this->error("Property '{$id}' not found or unauthorized.", 'NOT_FOUND', 404);
        }

        $roomTypes = $property->roomTypes->map(static fn (PropertyRoomType $roomType): array => [
            'id' => $roomType->id,
            'name' => $roomType->name,
            'accommodation_mode' => $roomType->accommodation_mode->value,
            'accommodation_mode_label' => $roomType->accommodation_mode->label(),
            'pricing_basis' => $roomType->pricingBasis(),
            'max_guests_per_room' => (int) $roomType->max_guests_per_room,
            'sharing_capacity' => (int) ($roomType->sharing_capacity ?? $roomType->max_guests_per_room),
            'is_air_conditioned' => (bool) $roomType->is_air_conditioned,
            'is_active' => (bool) $roomType->is_active,
            'daily_rate_minor' => $roomType->daily_rate_minor !== null ? (int) $roomType->daily_rate_minor : null,
            'weekly_rate_minor' => $roomType->weekly_rate_minor !== null ? (int) $roomType->weekly_rate_minor : null,
            'monthly_rate_minor' => $roomType->monthly_rate_minor !== null ? (int) $roomType->monthly_rate_minor : null,
        ])->values()->all();

        $configuredCount = $property->roomTypes->filter(static fn (PropertyRoomType $rt): bool => $rt->hasAnyDirectRate())->count();

        return $this->success([
            'property_id' => $property->id,
            'property_name' => $property->name,
            'food' => [
                'provided' => (bool) $property->food_provided,
                'breakfast' => (bool) $property->breakfast_included,
                'lunch' => (bool) $property->lunch_included,
                'dinner' => (bool) $property->dinner_included,
            ],
            'room_types' => $roomTypes,
            'evaluation' => [
                'active_room_types_count' => $property->roomTypes->count(),
                'configured_room_types_count' => $configuredCount,
                'missing_pricing_count' => max(0, $property->roomTypes->count() - $configuredCount),
                'has_food_configuration' => (bool) $property->food_provided,
            ],
            'currency_code' => (string) config('tijum.pricing.currency_code', 'INR'),
        ], 'Property pricing retrieved successfully.');
    }

    /**
     * Update room type rate plans and food configuration.
     */
    public function update(Request $request, int|string $id): JsonResponse
    {
        /** @var Owner $owner */
        $owner = $request->user();

        $property = Property::query()
            ->where('owner_id', $owner->id)
            ->where(function ($query) use ($id): void {
                if (is_numeric($id)) {
                    $query->where('id', (int) $id);
                } else {
                    $query->where('slug', (string) $id);
                }
            })
            ->first();

        if ($property === null) {
            return $this->error("Property '{$id}' not found or unauthorized.", 'NOT_FOUND', 404);
        }

        if (! $owner->canPublishProperties()) {
            return $this->error('Only active verified partners can update rates.', 'FORBIDDEN', 403);
        }

        $data = $request->validate([
            'food_provided' => ['required', 'boolean'],
            'breakfast_included' => ['sometimes', 'boolean'],
            'lunch_included' => ['sometimes', 'boolean'],
            'dinner_included' => ['sometimes', 'boolean'],
            'room_types' => ['required', 'array'],
            'room_types.*.id' => ['required', 'integer', Rule::exists('property_room_types', 'id')->where('property_id', $property->id)],
            'room_types.*.daily_rate_minor' => ['nullable', 'integer', 'min:0'],
            'room_types.*.weekly_rate_minor' => ['nullable', 'integer', 'min:0'],
            'room_types.*.monthly_rate_minor' => ['nullable', 'integer', 'min:0'],
        ]);

        try {
            DB::transaction(function () use ($property, $data): void {
                $locked = Property::query()->whereKey($property->id)->lockForUpdate()->firstOrFail();

                $foodProvided = (bool) $data['food_provided'];
                $breakfast = $foodProvided && (bool) ($data['breakfast_included'] ?? false);
                $lunch = $foodProvided && (bool) ($data['lunch_included'] ?? false);
                $dinner = $foodProvided && (bool) ($data['dinner_included'] ?? false);

                if ($foodProvided && ! $breakfast && ! $lunch && ! $dinner) {
                    throw ValidationException::withMessages([
                        'food_provided' => 'Select at least one included meal when food is provided, or turn food off.',
                    ]);
                }

                $locked->forceFill([
                    'food_provided' => $foodProvided,
                    'breakfast_included' => $breakfast,
                    'lunch_included' => $lunch,
                    'dinner_included' => $dinner,
                ])->save();

                foreach ($data['room_types'] as $row) {
                    $roomType = PropertyRoomType::query()
                        ->where('id', (int) $row['id'])
                        ->where('property_id', $locked->id)
                        ->lockForUpdate()
                        ->first();

                    if (! $roomType instanceof PropertyRoomType) {
                        continue;
                    }

                    $daily = array_key_exists('daily_rate_minor', $row) && $row['daily_rate_minor'] !== null && $row['daily_rate_minor'] !== ''
                        ? (int) $row['daily_rate_minor'] : null;
                    $weekly = array_key_exists('weekly_rate_minor', $row) && $row['weekly_rate_minor'] !== null && $row['weekly_rate_minor'] !== ''
                        ? (int) $row['weekly_rate_minor'] : null;
                    $monthly = array_key_exists('monthly_rate_minor', $row) && $row['monthly_rate_minor'] !== null && $row['monthly_rate_minor'] !== ''
                        ? (int) $row['monthly_rate_minor'] : null;

                    $roomType->forceFill([
                        'daily_rate_minor' => $daily,
                        'weekly_rate_minor' => $weekly,
                        'monthly_rate_minor' => $monthly,
                    ])->save();
                }
            });
        } catch (ValidationException $e) {
            return $this->error($e->getMessage(), 'VALIDATION_ERROR', 422, $e->errors());
        }

        return $this->show($request, $id);
    }
}
