<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Owner;

use App\Actions\Owner\Availability\CancelPropertyAvailabilityBlock;
use App\Actions\Owner\Availability\CreatePropertyAvailabilityBlock;
use App\Enums\PropertyAvailabilityBlockStatus;
use App\Http\Controllers\Api\V1\ApiController;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyAvailabilityBlock;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class OwnerAvailabilityBlockController extends ApiController
{
    /**
     * List availability blocks for the property.
     */
    public function index(Request $request, int|string $id): JsonResponse
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

        $blocks = PropertyAvailabilityBlock::query()
            ->where('property_id', $property->id)
            ->with(['roomType', 'room'])
            ->orderByDesc('start_date')
            ->orderByDesc('id')
            ->get();

        $data = $blocks->map(static fn (PropertyAvailabilityBlock $block): array => [
            'id' => $block->id,
            'property_id' => $block->property_id,
            'scope' => $block->scope->value,
            'scope_label' => $block->scope->label(),
            'block_type' => $block->block_type->value,
            'block_type_label' => $block->block_type->label(),
            'status' => $block->status->value,
            'status_label' => $block->status->label(),
            'is_active' => $block->status === PropertyAvailabilityBlockStatus::Active,
            'start_date' => $block->start_date->toDateString(),
            'end_date' => $block->end_date->toDateString(),
            'property_room_type_id' => $block->property_room_type_id,
            'room_type_name' => $block->roomType?->name,
            'property_room_id' => $block->property_room_id,
            'room_number' => $block->room?->room_number,
            'reason' => $block->reason,
            'is_admin_restriction' => (bool) $block->is_admin_restriction,
            'created_at' => $block->created_at?->toIso8601String(),
        ])->values()->all();

        return $this->success($data, 'Availability blocks retrieved successfully.');
    }

    /**
     * Create an availability block.
     */
    public function store(
        Request $request,
        int|string $id,
        CreatePropertyAvailabilityBlock $createBlock
    ): JsonResponse {
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

        $validated = $request->validate([
            'scope' => ['required', 'string'],
            'block_type' => ['required', 'string'],
            'start_date' => ['required', 'date_format:Y-m-d'],
            'end_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:start_date'],
            'property_room_type_id' => ['nullable', 'integer'],
            'property_room_id' => ['nullable', 'integer'],
            'reason' => ['required', 'string', 'max:500'],
        ]);

        try {
            $block = $createBlock->execute($owner, $property, $validated);
        } catch (ValidationException $e) {
            return $this->error($e->getMessage(), 'VALIDATION_ERROR', 422, $e->errors());
        }

        $block->load(['roomType', 'room']);

        return $this->success([
            'id' => $block->id,
            'property_id' => $block->property_id,
            'scope' => $block->scope->value,
            'scope_label' => $block->scope->label(),
            'block_type' => $block->block_type->value,
            'block_type_label' => $block->block_type->label(),
            'status' => $block->status->value,
            'status_label' => $block->status->label(),
            'is_active' => $block->status === PropertyAvailabilityBlockStatus::Active,
            'start_date' => $block->start_date->toDateString(),
            'end_date' => $block->end_date->toDateString(),
            'property_room_type_id' => $block->property_room_type_id,
            'room_type_name' => $block->roomType?->name,
            'property_room_id' => $block->property_room_id,
            'room_number' => $block->room?->room_number,
            'reason' => $block->reason,
            'is_admin_restriction' => (bool) $block->is_admin_restriction,
            'created_at' => $block->created_at?->toIso8601String(),
        ], 'Availability block created successfully.', 201);
    }

    /**
     * Cancel an availability block.
     */
    public function destroy(
        Request $request,
        int|string $id,
        int $blockId,
        CancelPropertyAvailabilityBlock $cancelBlock
    ): JsonResponse {
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

        $block = PropertyAvailabilityBlock::query()
            ->where('id', $blockId)
            ->where('property_id', $property->id)
            ->first();

        if ($block === null) {
            return $this->error("Availability block '{$blockId}' not found in property.", 'NOT_FOUND', 404);
        }

        $reason = $request->string('reason')->toString() ?: null;

        try {
            $cancelBlock->execute($owner, $property, $block, $reason);
        } catch (ValidationException $e) {
            return $this->error($e->getMessage(), 'VALIDATION_ERROR', 422, $e->errors());
        }

        return $this->success(null, 'Availability block cancelled successfully.');
    }
}
