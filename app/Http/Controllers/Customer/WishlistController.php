<?php

declare(strict_types=1);

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\CustomerWishlist;
use App\Models\Property;
use App\Models\User;
use App\Services\PropertySearchCustomerData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WishlistController extends Controller
{
    public function __construct(
        private readonly PropertySearchCustomerData $customerData,
    ) {}

    public function index(Request $request): Response|JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $properties = $user->wishlistedProperties()
            ->with([
                'city',
                'category',
                'media',
                'ratingSummary',
                'roomTypes' => fn ($q) => $q->where('is_active', true),
                'amenityAssignments.amenity.category',
            ])
            ->latest('customer_wishlists.created_at')
            ->paginate(12)
            ->through(fn (Property $property): array => $this->customerData->summaryCard($property));

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'data' => $properties,
            ]);
        }

        return Inertia::render('customer/wishlist', [
            'properties' => $properties,
        ]);
    }

    public function store(Request $request, Property $property): JsonResponse|RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();

        CustomerWishlist::query()->firstOrCreate([
            'user_id' => $user->id,
            'property_id' => $property->id,
        ]);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'wishlisted' => true,
                'property_id' => $property->id,
                'message' => 'Property added to wishlist.',
            ]);
        }

        return back()->with('status', 'Property added to wishlist.');
    }

    public function destroy(Request $request, Property $property): JsonResponse|RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();

        CustomerWishlist::query()
            ->where('user_id', $user->id)
            ->where('property_id', $property->id)
            ->delete();

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'wishlisted' => false,
                'property_id' => $property->id,
                'message' => 'Property removed from wishlist.',
            ]);
        }

        return back()->with('status', 'Property removed from wishlist.');
    }

    public function toggle(Request $request, Property $property): JsonResponse|RedirectResponse
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
            $message = 'Property removed from wishlist.';
        } else {
            CustomerWishlist::query()->create([
                'user_id' => $user->id,
                'property_id' => $property->id,
            ]);
            $wishlisted = true;
            $message = 'Property added to wishlist.';
        }

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'wishlisted' => $wishlisted,
                'property_id' => $property->id,
                'message' => $message,
            ]);
        }

        return back()->with('status', $message);
    }
}
