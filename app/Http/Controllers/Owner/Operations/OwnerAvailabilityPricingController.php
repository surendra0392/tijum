<?php

declare(strict_types=1);

namespace App\Http\Controllers\Owner\Operations;

use App\Actions\Owner\Availability\CancelPropertyAvailabilityBlock;
use App\Actions\Owner\Availability\CreatePropertyAvailabilityBlock;
use App\Enums\PropertyAvailabilityBlockScope;
use App\Enums\PropertyAvailabilityBlockStatus;
use App\Enums\PropertyAvailabilityBlockType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Owner\Availability\CancelPropertyAvailabilityBlockRequest;
use App\Http\Requests\Owner\Availability\CreatePropertyAvailabilityBlockRequest;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyAvailabilityBlock;
use App\Models\PropertyRoom;
use App\Models\PropertyRoomType;
use App\Support\PropertyPortalData;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class OwnerAvailabilityPricingController extends Controller
{
    public function index(Request $request): Response
    {
        $owner = $this->resolveOwner($request);

        $properties = Property::query()
            ->where('owner_id', $owner->id)
            ->with(['city'])
            ->withCount([
                'rooms',
                'roomTypes' => fn ($q) => $q->where('is_active', true),
                'availabilityBlocks' => fn ($q) => $q->where('status', PropertyAvailabilityBlockStatus::Active),
            ])
            ->orderBy('name')
            ->get();

        $selectedPropertyId = $request->integer('property_id') ?: $properties->first()?->id;
        $selectedProperty = $selectedPropertyId
            ? $properties->firstWhere('id', $selectedPropertyId)
            : null;

        $roomTypes = [];
        $availabilityBlocks = [];
        $rooms = [];
        $evaluation = [
            'active_room_types_count' => 0,
            'configured_room_types_count' => 0,
            'missing_pricing_count' => 0,
            'has_food_configuration' => false,
        ];

        if ($selectedProperty instanceof Property) {
            $selectedProperty->load([
                'roomTypes' => fn ($q) => $q->where('is_active', true)->orderBy('display_order')->orderBy('name'),
                'availabilityBlocks.roomType',
                'availabilityBlocks.room',
                'rooms' => fn ($q) => $q->with('roomType')->orderBy('room_number')->orderBy('id'),
            ]);

            $roomTypes = $selectedProperty->roomTypes->map(static fn (PropertyRoomType $roomType): array => [
                'id' => $roomType->id,
                'name' => $roomType->name,
                'accommodation_mode' => $roomType->accommodation_mode->value,
                'accommodation_mode_label' => $roomType->accommodation_mode->label(),
                'pricing_basis' => $roomType->pricingBasis(),
                'max_guests_per_room' => $roomType->max_guests_per_room,
                'is_air_conditioned' => $roomType->is_air_conditioned,
                'is_active' => $roomType->is_active,
                'daily_rate_minor' => $roomType->daily_rate_minor,
                'weekly_rate_minor' => $roomType->weekly_rate_minor,
                'monthly_rate_minor' => $roomType->monthly_rate_minor,
            ])->values()->all();

            $availabilityBlocks = $selectedProperty->availabilityBlocks
                ->sortByDesc('start_date')
                ->sortByDesc('id')
                ->values()
                ->map(static fn (PropertyAvailabilityBlock $block): array => $block->toPortalArray(true))
                ->all();

            $rooms = $selectedProperty->rooms->map(static fn (PropertyRoom $room): array => [
                'id' => $room->id,
                'room_number' => $room->room_number,
                'property_room_type_id' => $room->property_room_type_id,
                'room_type_name' => $room->roomType?->name,
            ])->values()->all();

            $configuredCount = $selectedProperty->roomTypes->filter(static fn (PropertyRoomType $rt): bool => $rt->hasAnyDirectRate())->count();

            $evaluation = [
                'active_room_types_count' => $selectedProperty->roomTypes->count(),
                'configured_room_types_count' => $configuredCount,
                'missing_pricing_count' => max(0, $selectedProperty->roomTypes->count() - $configuredCount),
                'has_food_configuration' => (bool) $selectedProperty->food_provided,
            ];
        }

        $propertySummaries = $properties->map(static fn (Property $prop): array => [
            'id' => $prop->id,
            'name' => $prop->name,
            'property_reference' => $prop->property_reference,
            'city_name' => $prop->city?->name,
            'operational_status' => $prop->status->value,
            'rooms_count' => $prop->rooms_count,
            'room_types_count' => $prop->room_types_count,
            'active_blocks_count' => $prop->availability_blocks_count,
            'food_provided' => (bool) $prop->food_provided,
        ])->values()->all();

        return Inertia::render('owner/availability/index', [
            'properties' => $propertySummaries,
            'selectedPropertyId' => $selectedPropertyId,
            'property' => $selectedProperty ? array_merge(PropertyPortalData::ownerSummary($selectedProperty), [
                'food' => $selectedProperty->foodSummary(),
            ]) : null,
            'roomTypes' => $roomTypes,
            'availabilityBlocks' => $availabilityBlocks,
            'rooms' => $rooms,
            'evaluation' => $evaluation,
            'options' => [
                'blockScopes' => array_map(
                    static fn (PropertyAvailabilityBlockScope $scope): array => ['value' => $scope->value, 'label' => $scope->label()],
                    PropertyAvailabilityBlockScope::cases(),
                ),
                'blockTypes' => array_map(
                    static fn (PropertyAvailabilityBlockType $type): array => ['value' => $type->value, 'label' => $type->label()],
                    PropertyAvailabilityBlockType::cases(),
                ),
                'blockStatuses' => array_map(
                    static fn (PropertyAvailabilityBlockStatus $status): array => ['value' => $status->value, 'label' => $status->label()],
                    PropertyAvailabilityBlockStatus::cases(),
                ),
                'currencyCode' => (string) config('tijum.pricing.currency_code', 'INR'),
            ],
            'canManage' => $owner->canPublishProperties(),
            'status' => $request->session()->get('status'),
        ]);
    }

    public function updatePricing(Request $request, Property $property): RedirectResponse
    {
        $owner = $this->resolveOwner($request);
        Gate::forUser($owner)->authorize('updateByOwner', $property);

        $property->loadMissing('roomTypes');

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

        if ($property->owner_id !== $owner->id || ! $owner->canPublishProperties()) {
            abort(403);
        }

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

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Pricing and food details saved.')]);

        return back()->with('status', 'pricing-saved');
    }

    public function storeBlock(
        CreatePropertyAvailabilityBlockRequest $request,
        Property $property,
        CreatePropertyAvailabilityBlock $createBlock,
    ): RedirectResponse {
        $owner = $this->resolveOwner($request);
        Gate::forUser($owner)->authorize('createByOwner', [PropertyAvailabilityBlock::class, $property]);

        $createBlock->execute($owner, $property, $request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Availability block created.')]);

        return back()->with('status', 'availability-block-created');
    }

    public function cancelBlock(
        CancelPropertyAvailabilityBlockRequest $request,
        Property $property,
        PropertyAvailabilityBlock $block,
        CancelPropertyAvailabilityBlock $cancelBlock,
    ): RedirectResponse {
        $owner = $this->resolveOwner($request);
        if ($block->property_id !== $property->id) {
            abort(404);
        }
        Gate::forUser($owner)->authorize('cancelByOwner', $block);

        $cancelBlock->execute($owner, $property, $block, $request->input('reason'));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Availability block cancelled.')]);

        return back()->with('status', 'availability-block-cancelled');
    }

    private function resolveOwner(Request $request): Owner
    {
        $owner = $request->user('owner');
        if (! $owner instanceof Owner) {
            abort(401);
        }

        return $owner;
    }
}
