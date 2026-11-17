<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Customer;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\PropertyCardResource;
use App\Models\CustomerWishlist;
use App\Models\Property;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerWishlistController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $properties = $user->wishlistedProperties()
            ->with(['city', 'category', 'roomTypes', 'media', 'ratingSummary'])
            ->latest('customer_wishlists.created_at')
            ->paginate((int) $request->input('per_page', 15));

        $paginationMeta = [
            'current_page' => $properties->currentPage(),
            'last_page' => $properties->lastPage(),
            'per_page' => $properties->perPage(),
            'total' => $properties->total(),
        ];

        return response()->json([
            'success' => true,
            'data' => PropertyCardResource::collection($properties->items()),
            'meta' => array_merge([
                'request_id' => $request->header('X-Request-ID') ?? (string) str()->uuid(),
                'timestamp' => now()->toIso8601String(),
            ], $paginationMeta),
            'pagination' => $paginationMeta,
        ]);
    }

    public function store(Request $request, Property $property): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        CustomerWishlist::query()->firstOrCreate([
            'user_id' => $user->id,
            'property_id' => $property->id,
        ]);

        return response()->json([
            'success' => true,
            'wishlisted' => true,
            'property_id' => $property->id,
            'message' => 'Property added to wishlist.',
        ], 201);
    }

    public function toggle(Request $request, Property $property): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $existing = CustomerWishlist::query()
            ->where('user_id', $user->id)
            ->where('property_id', $property->id)
            ->first();

        if ($existing instanceof CustomerWishlist) {
            $existing->delete();
            $wishlisted = false;
        } else {
            CustomerWishlist::query()->create([
                'user_id' => $user->id,
                'property_id' => $property->id,
            ]);
            $wishlisted = true;
        }

        return response()->json([
            'success' => true,
            'wishlisted' => $wishlisted,
            'property_id' => $property->id,
        ]);
    }

    public function destroy(Request $request, Property $property): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        CustomerWishlist::query()
            ->where('user_id', $user->id)
            ->where('property_id', $property->id)
            ->delete();

        return response()->json([
            'success' => true,
            'wishlisted' => false,
            'property_id' => $property->id,
            'message' => 'Property removed from wishlist.',
        ]);
    }
}
