<?php

declare(strict_types=1);

namespace App\Http\Controllers\Customer;

use App\Actions\Reservations\CreateReservation;
use App\Enums\PropertyGenderPolicy;
use App\Enums\PropertyGuestComposition;
use App\Enums\PropertyRoomTypeMode;
use App\Enums\ReservationQuantityBasis;
use App\Enums\ReservationStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Reservations\QuoteReservationRequest;
use App\Http\Requests\Reservations\ReservationFilterRequest;
use App\Http\Requests\Reservations\StoreReservationRequest;
use App\Models\CouponCode;
use App\Models\Property;
use App\Models\PropertyRoomType;
use App\Models\Reservation;
use App\Models\RewardsSetting;
use App\Models\User;
use App\Services\Promotions\CouponValidationService;
use App\Services\PropertySearchCustomerData;
use App\Services\ReservationData;
use App\Services\ReservationQuoteService;
use App\Services\Rewards\LoyaltyPointsService;
use App\Services\StayTimingPolicy;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\RedirectResponse;

class ReservationController extends Controller
{
    public function __construct(
        private readonly ReservationData $data,
        private readonly ReservationQuoteService $quotes,
        private readonly PropertySearchCustomerData $customerData,
        private readonly StayTimingPolicy $timing,
    ) {}

    public function index(ReservationFilterRequest $request): Response
    {
        $user = $this->customer($request->user());
        $filters = $request->validated();
        $query = Reservation::query()
            ->where('user_id', $user->id)
            ->with(['property', 'roomType', 'successfulPayment', 'review'])
            ->latest('created_at')
            ->latest('id');

        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (isset($filters['from'])) {
            $query->whereDate('check_in_date', '>=', $filters['from']);
        }
        if (isset($filters['to'])) {
            $query->whereDate('check_in_date', '<=', $filters['to']);
        }

        $reservations = $query->paginate((int) ($filters['per_page'] ?? 12))->withQueryString();

        return Inertia::render('reservations/index', [
            'reservations' => $this->pagination($reservations),
            'filters' => ['status' => $filters['status'] ?? null],
            'statusOptions' => $this->statusOptions(),
        ]);
    }

    public function create(QuoteReservationRequest $request, Property $property): Response
    {
        $user = $request->user();
        $validated = $request->validated();
        $roomType = PropertyRoomType::query()
            ->where('property_id', $property->id)
            ->whereKey((int) $validated['property_room_type_id'])
            ->firstOrFail();
        $quoteResult = $this->quotes->quote(
            $property,
            $roomType,
            (string) $validated['check_in_date'],
            (string) $validated['duration_type'],
            (int) $validated['duration_quantity'],
            (int) $validated['quantity'],
        );

        if (! $quoteResult['eligible'] || ! is_array($quoteResult['quote']) || ! is_array($quoteResult['availability'])) {
            throw ValidationException::withMessages([
                'reservation' => implode(' ', $quoteResult['errors']),
            ]);
        }

        $quote = $quoteResult['quote'];
        $property->loadMissing(['category', 'city', 'roomTypeAmenityAssignments.amenity.category']);
        $isShared = $roomType->accommodation_mode === PropertyRoomTypeMode::Shared;
        $allowedGenders = [
            ['value' => 'male', 'label' => 'Male'],
            ['value' => 'female', 'label' => 'Female'],
            ['value' => 'mixed', 'label' => 'Both'],
        ];
        [$preferredGender, $preferredGenderLabel, $strictGenderPreference] = match ($roomType->gender_policy) {
            PropertyGenderPolicy::MaleOnly => ['male', 'Male', true],
            PropertyGenderPolicy::FemaleOnly => ['female', 'Female', true],
            PropertyGenderPolicy::AllGenders, PropertyGenderPolicy::NotApplicable => ['mixed', 'Both', false],
        };
        $allowedCompositions = [
            [
                'value' => PropertyGuestComposition::Individuals->value,
                'label' => PropertyGuestComposition::Individuals->label(),
            ],
        ];

        $availableCoupons = [];
        $loyaltyBalance = [
            'available_points' => 0,
            'max_redeemable_points' => 0,
            'min_balance' => (int) RewardsSetting::get('points_redemption_min_balance', 100),
            'max_percentage' => (int) RewardsSetting::get('points_redemption_max_percentage', 50),
            'redemption_rate_paise' => max(1, (int) RewardsSetting::get('points_redemption_rate_paise', 100)),
        ];

        if ($user instanceof User) {
            $pointsService = app(LoyaltyPointsService::class);
            $wallet = $pointsService->getOrCreateWallet($user);
            $loyaltyBalance['available_points'] = $wallet->available_points;
            $loyaltyBalance['max_redeemable_points'] = $pointsService->getMaxRedeemablePoints($user, (int) $quote['total_amount_minor']);

            $couponValidator = app(CouponValidationService::class);
            $activeCoupons = CouponCode::query()
                ->active()
                ->with('campaign')
                ->latest('id')
                ->limit(15)
                ->get();

            foreach ($activeCoupons as $coupon) {
                $check = $couponValidator->validate(
                    code: $coupon->code,
                    user: $user,
                    property: $property,
                    bookingSubtotalMinor: (int) $quote['total_amount_minor'],
                    stayDays: (int) $quote['total_stay_days'],
                );
                if ($check['is_valid']) {
                    $availableCoupons[] = [
                        'code' => $coupon->code,
                        'description' => $coupon->description ?: $coupon->code,
                        'discount_minor' => $check['discount_amount_minor'],
                        'bonus_points' => $check['bonus_points'],
                        'offer_type' => $coupon->offer_type->value,
                    ];
                }
            }
        }

        return Inertia::render('reservations/create', [
            'quote' => [
                'property_id' => $property->id,
                'property_slug' => $property->slug,
                'property_name' => $property->name,
                'property_locality' => implode(', ', array_filter([$property->locality, $property->city?->name])),
                'property_category' => $property->category->name,
                'room_type_id' => $roomType->id,
                'room_type_name' => $roomType->name,
                'room_type_ac_label' => $roomType->is_air_conditioned ? 'AC' : 'Non-AC',
                'sharing_label' => $isShared
                    ? sprintf('%d Sharing', (int) ($roomType->sharing_capacity ?? $roomType->max_guests_per_room))
                    : 'Private Room',
                'room_type_amenities' => $this->customerData->approvedRoomTypeAmenities($property, $roomType),
                'check_in_date' => $quote['check_in_date'],
                'checkout_date' => $quote['check_out_date'],
                'duration_type' => $quote['duration_type'],
                'duration_quantity' => $quote['duration_quantity'],
                'duration_label' => sprintf('%d %s unit%s', $quote['duration_quantity'], $quote['duration_type'], $quote['duration_quantity'] === 1 ? '' : 's'),
                'total_stay_days' => $quote['total_stay_days'],
                'quantity' => $quote['quantity'],
                'quantity_basis' => $quote['quantity_basis'],
                'quantity_basis_label' => ReservationQuantityBasis::from($quote['quantity_basis'])->label(),
                'guest_count' => $quote['guest_count'],
                'available_quantity' => $quoteResult['availability']['minimum_remaining'],
                'unit_rate_minor' => $quote['unit_rate_minor'],
                'rate_unit' => $quote['rate_unit'],
                'rate_unit_label' => $isShared ? 'Rate per guest' : 'Rate per private room',
                'total_amount_minor' => $quote['total_amount_minor'],
                'currency_code' => $quote['currency_code'],
                'breakfast_included' => (bool) $property->breakfast_included,
                'lunch_included' => (bool) $property->lunch_included,
                'dinner_included' => (bool) $property->dinner_included,
                'early_check_in_allowed' => (bool) $roomType->early_check_in_enabled,
                'allowed_guest_genders' => $allowedGenders,
                'preferred_guest_gender' => $preferredGender,
                'preferred_guest_gender_label' => $preferredGenderLabel,
                'strict_gender_preference' => $strictGenderPreference,
                'allowed_guest_compositions' => $allowedCompositions,
                'default_guest_composition' => PropertyGuestComposition::Individuals->value,
                'timing' => $this->timing->timingSummary(),
            ],
            'customer' => [
                'name' => $user instanceof User ? $user->name : '',
                'email' => $user instanceof User ? $user->email : '',
                'phone' => $user instanceof User ? $user->phone : null,
            ],
            'availableCoupons' => $availableCoupons,
            'loyaltyBalance' => $loyaltyBalance,
            'submissionToken' => (string) Str::uuid(),
        ]);
    }

    public function quotePromotions(
        Request $request,
        CouponValidationService $couponValidator,
        LoyaltyPointsService $pointsService,
    ): JsonResponse {
        $user = $this->customer($request->user());

        $validated = $request->validate([
            'property_id' => ['required', 'integer', 'exists:properties,id'],
            'booking_amount_minor' => ['required', 'integer', 'min:0'],
            'stay_days' => ['nullable', 'integer', 'min:1'],
            'coupon_code' => ['nullable', 'string', 'max:50'],
            'points_to_redeem' => ['nullable', 'integer', 'min:0'],
        ]);

        $property = Property::query()->findOrFail((int) $validated['property_id']);
        $subtotalMinor = (int) $validated['booking_amount_minor'];
        $stayDays = (int) ($validated['stay_days'] ?? 1);
        $couponCode = isset($validated['coupon_code']) ? strtoupper(trim((string) $validated['coupon_code'])) : '';

        $couponDiscountMinor = 0;
        $couponError = null;
        $appliedCouponCode = null;
        $bonusPoints = 0;

        if ($couponCode !== '') {
            $check = $couponValidator->validate(
                code: $couponCode,
                user: $user,
                property: $property,
                bookingSubtotalMinor: $subtotalMinor,
                stayDays: $stayDays,
            );

            if (! $check['is_valid']) {
                $couponError = $check['error'];
            } else {
                $appliedCouponCode = $couponCode;
                $couponDiscountMinor = $check['discount_amount_minor'];
                $bonusPoints = $check['bonus_points'];
            }
        }

        $afterCouponMinor = max(0, $subtotalMinor - $couponDiscountMinor);
        $maxRedeemablePoints = $pointsService->getMaxRedeemablePoints($user, $afterCouponMinor);
        $requestedPoints = (int) ($validated['points_to_redeem'] ?? 0);
        $pointsRedeemed = min($requestedPoints, $maxRedeemablePoints);
        $pointsDiscountMinor = min($afterCouponMinor, $pointsService->convertPointsToInrMinor($pointsRedeemed));
        $finalPayableMinor = max(0, $afterCouponMinor - $pointsDiscountMinor);

        return response()->json([
            'valid' => $couponError === null,
            'error' => $couponError,
            'coupon_code' => $appliedCouponCode,
            'coupon_discount_minor' => $couponDiscountMinor,
            'bonus_points' => $bonusPoints,
            'points_redeemed' => $pointsRedeemed,
            'points_discount_minor' => $pointsDiscountMinor,
            'max_redeemable_points' => $maxRedeemablePoints,
            'final_payable_minor' => $finalPayableMinor,
        ], $couponError !== null ? 422 : 200);
    }

    public function store(StoreReservationRequest $request, CreateReservation $action): RedirectResponse
    {
        $reservation = $action->execute(
            $this->customer($request->user()),
            $request->validated(),
        );

        $message = $reservation->status === ReservationStatus::Confirmed
            ? 'Reservation confirmed.'
            : 'Reservation created. Complete payment within 15 minutes to confirm your booking.';

        return to_route('reservations.show', $reservation)
            ->with('status', $message);
    }

    public function show(mixed $reservation): Response
    {
        $user = $this->customer(request()->user());
        $model = Reservation::query()
            ->where('user_id', $user->id)
            ->where('booking_reference', (string) $reservation)
            ->firstOrFail();

        return Inertia::render('reservations/show', [
            'reservation' => $this->data->detail($model, 'customer'),
            'status' => request()->session()->get('status'),
        ]);
    }

    /**
     * @param  LengthAwarePaginator<int, Reservation>  $paginator
     * @return array<string, mixed>
     */
    private function pagination(LengthAwarePaginator $paginator): array
    {
        return [
            'data' => collect($paginator->items())
                ->map(fn (Reservation $reservation): array => $this->data->summary($reservation))
                ->values()
                ->all(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
            ],
        ];
    }

    /** @return list<array{value: string, label: string}> */
    private function statusOptions(): array
    {
        return array_map(
            static fn (ReservationStatus $status): array => [
                'value' => $status->value,
                'label' => $status->label(),
            ],
            ReservationStatus::cases(),
        );
    }

    private function customer(mixed $user): User
    {
        abort_unless($user instanceof User, 401);

        return $user;
    }
}
