<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\Pricing;

use App\Actions\Owner\Availability\CancelPropertyAvailabilityBlock;
use App\Actions\Owner\Availability\CreatePropertyAvailabilityBlock;
use App\Enums\PropertyAvailabilityBlockScope;
use App\Enums\PropertyAvailabilityBlockStatus;
use App\Enums\PropertyAvailabilityBlockType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Availability\CancelAdminAvailabilityRestrictionRequest;
use App\Http\Requests\Admin\Availability\CreateAdminAvailabilityRestrictionRequest;
use App\Models\Admin;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyAvailabilityBlock;
use App\Models\PropertyRoom;
use App\Models\PropertyRoomType;
use App\Support\PropertyPortalData;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminPricingController extends Controller
{
    public function index(Request $request): Response
    {
        $admin = $this->resolveAdmin($request);

        $query = Property::query()
            ->with(['owner:id,name,email,status', 'category:id,name,slug,code', 'city:id,name,slug,state', 'roomTypes', 'availabilityBlocks'])
            ->orderByDesc('updated_at');

        $search = trim($request->string('search')->toString());
        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('property_reference', 'like', "%{$search}%");
            });
        }

        $properties = $query->paginate(20)->withQueryString()->through(function (Property $property): array {
            $roomTypes = $property->roomTypes->where('is_active', true);
            $configured = $roomTypes->filter(static fn (PropertyRoomType $rt): bool => $rt->hasAnyDirectRate())->count();
            $activeBlocks = $property->availabilityBlocks->filter(static fn (PropertyAvailabilityBlock $b): bool => $b->isEffective())->count();

            return array_merge(PropertyPortalData::adminQueueRow($property), [
                'active_room_types_count' => $roomTypes->count(),
                'configured_room_types_count' => $configured,
                'missing_pricing_count' => max(0, $roomTypes->count() - $configured),
                'active_availability_blocks_count' => $activeBlocks,
                'food_provided' => (bool) $property->food_provided,
            ]);
        });

        return Inertia::render('admin/pricing/index', [
            'properties' => $properties,
            'filters' => [
                'search' => $search,
            ],
        ]);
    }

    public function show(Request $request, Property $property): Response
    {
        $admin = $this->resolveAdmin($request);

        $property->load([
            'owner:id,name,email,status',
            'category:id,name,slug,code',
            'city:id,name,slug,state',
            'roomTypes' => fn ($q) => $q->where('is_active', true)->orderBy('display_order')->orderBy('name'),
            'availabilityBlocks.roomType',
            'availabilityBlocks.room',
            'rooms' => fn ($q) => $q->with('roomType')->orderBy('room_number')->orderBy('id'),
        ]);

        $roomTypes = $property->roomTypes->map(static fn (PropertyRoomType $roomType): array => [
            'id' => $roomType->id,
            'name' => $roomType->name,
            'accommodation_mode_label' => $roomType->accommodation_mode->label(),
            'pricing_basis' => $roomType->pricingBasis(),
            'is_air_conditioned' => $roomType->is_air_conditioned,
            'daily_rate_minor' => $roomType->daily_rate_minor,
            'weekly_rate_minor' => $roomType->weekly_rate_minor,
            'monthly_rate_minor' => $roomType->monthly_rate_minor,
            'has_any_direct_rate' => $roomType->hasAnyDirectRate(),
        ])->values()->all();

        $availabilityBlocks = $property->availabilityBlocks
            ->sortByDesc('start_date')
            ->sortByDesc('id')
            ->values()
            ->map(static fn (PropertyAvailabilityBlock $block): array => $block->toPortalArray(true))
            ->all();

        $configuredCount = $property->roomTypes->filter(static fn (PropertyRoomType $rt): bool => $rt->hasAnyDirectRate())->count();

        return Inertia::render('admin/pricing/show', [
            'property' => array_merge(PropertyPortalData::adminQueueRow($property), [
                'food' => $property->foodSummary(),
            ]),
            'roomTypes' => $roomTypes,
            'rooms' => $property->rooms->map(static fn (PropertyRoom $room): array => [
                'id' => $room->id,
                'room_number' => $room->room_number,
                'property_room_type_id' => $room->property_room_type_id,
                'room_type_name' => $room->roomType?->name,
            ])->values()->all(),
            'availabilityBlocks' => $availabilityBlocks,
            'evaluation' => [
                'active_room_types_count' => $property->roomTypes->count(),
                'configured_room_types_count' => $configuredCount,
                'missing_pricing_count' => max(0, $property->roomTypes->count() - $configuredCount),
            ],
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
            'canManageRestrictions' => $admin->role->isSuperAdmin() || $admin->hasPermission('pricing.manage_restrictions') || $admin->hasPermission('availability.manage_restrictions'),
        ]);
    }

    public function storeRestriction(
        CreateAdminAvailabilityRestrictionRequest $request,
        Property $property,
        CreatePropertyAvailabilityBlock $createBlock,
    ): RedirectResponse {
        $admin = $this->resolveAdmin($request);
        $owner = $this->resolvePropertyOwner($property);

        $createBlock->execute($owner, $property, $request->validated(), actorType: 'admin', actor: $admin, isAdminRestriction: true);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Availability restriction created.')]);

        return back()->with('status', 'restriction-created');
    }

    public function cancelRestriction(
        CancelAdminAvailabilityRestrictionRequest $request,
        Property $property,
        PropertyAvailabilityBlock $block,
        CancelPropertyAvailabilityBlock $cancelBlock,
    ): RedirectResponse {
        $admin = $this->resolveAdmin($request);
        $owner = $this->resolvePropertyOwner($property);

        if ($block->property_id !== $property->id) {
            abort(404);
        }

        $cancelBlock->execute($owner, $property, $block, $request->input('reason'), actorType: 'admin', actor: $admin);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Availability restriction cancelled.')]);

        return back()->with('status', 'restriction-cancelled');
    }

    private function resolveAdmin(Request $request): Admin
    {
        $admin = $request->user('admin');
        if (! $admin instanceof Admin) {
            abort(403);
        }

        return $admin;
    }

    private function resolvePropertyOwner(Property $property): Owner
    {
        $owner = $property->owner;
        if (! $owner instanceof Owner) {
            abort(422, 'Property owner is missing.');
        }

        return $owner;
    }
}
