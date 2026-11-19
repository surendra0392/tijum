<?php

declare(strict_types=1);

namespace App\Http\Controllers\Customer;

use App\Actions\Payments\InitiatePaymentOrder;
use App\Actions\Payments\VerifyCheckoutPayment;
use App\Http\Controllers\Controller;
use App\Http\Requests\Payments\VerifyPaymentRequest;
use App\Models\Reservation;
use App\Services\ReservationData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use InvalidArgumentException;
use RuntimeException;

class CustomerPaymentController extends Controller
{
    public function initiate(
        Request $request,
        Reservation $reservation,
        InitiatePaymentOrder $action,
    ): JsonResponse {
        $user = $request->user();
        if ($user === null || $reservation->user_id !== $user->id) {
            abort(403);
        }

        if ($reservation->status->value !== 'awaiting_payment') {
            return response()->json([
                'message' => 'This reservation is not awaiting payment.',
            ], 422);
        }

        if ($reservation->payment_deadline_at !== null && $reservation->payment_deadline_at->isPast()) {
            return response()->json([
                'message' => 'The payment window for this reservation has expired.',
            ], 422);
        }

        try {
            $orderPayload = $action->execute($reservation, $user);

            return response()->json($orderPayload);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        } catch (RuntimeException $e) {
            $status = $e->getCode() === 401 ? 401 : 500;

            return response()->json([
                'message' => $e->getMessage(),
            ], $status);
        }
    }

    public function verify(
        VerifyPaymentRequest $request,
        Reservation $reservation,
        VerifyCheckoutPayment $action,
    ): RedirectResponse {
        $user = $request->user();
        if ($user === null || $reservation->user_id !== $user->id) {
            abort(403);
        }

        $validated = $request->validated();

        $action->execute(
            $reservation,
            $user,
            (string) $validated['razorpay_order_id'],
            (string) $validated['razorpay_payment_id'],
            (string) $validated['razorpay_signature'],
        );

        return redirect()
            ->route('reservations.show', $reservation)
            ->with('status', 'Payment successful! Your stay reservation is confirmed.');
    }

    public function receipt(
        Request $request,
        Reservation $reservation,
        ReservationData $reservationData,
    ): Response {
        $user = $request->user();
        if ($user === null || $reservation->user_id !== $user->id) {
            abort(403);
        }

        $reservation->loadMissing(['payments', 'successfulPayment', 'property', 'roomType']);

        return Inertia::render('reservations/receipt', [
            'reservation' => $reservationData->detail($reservation, 'customer'),
        ]);
    }
}
