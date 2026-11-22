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
use App\Models\Property;
use App\Models\PropertyRoomType;
use App\Models\Reservation;
use App\Models\User;
use App\Services\PropertySearchCustomerData;
use App\Services\ReservationData;
use App\Services\ReservationQuoteService;
use App\Services\StayTimingPolicy;
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
            'submissionToken' => (string) Str::uuid(),
        ]);
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
