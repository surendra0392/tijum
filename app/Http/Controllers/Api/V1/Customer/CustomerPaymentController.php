<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Customer;

use App\Actions\Payments\InitiatePaymentOrder;
use App\Actions\Payments\VerifyCheckoutPayment;
use App\Http\Controllers\Api\V1\ApiController;
use App\Http\Requests\Payments\VerifyPaymentRequest;
use App\Http\Resources\Api\V1\ReservationResource;
use App\Models\Reservation;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class CustomerPaymentController extends ApiController
{
    public function initiate(
        Request $request,
        string $reference,
        InitiatePaymentOrder $action
    ): JsonResponse {
        /** @var User $user */
        $user = $request->user();

        $reservation = Reservation::query()
            ->where('booking_reference', $reference)
            ->where('user_id', $user->id)
            ->first();

        if ($reservation === null) {
            return $this->error("Reservation '{$reference}' not found.", 'RESERVATION_NOT_FOUND', 404);
        }

        if ($reservation->status->value !== 'awaiting_payment') {
            return $this->error('This reservation is not currently awaiting payment.', 'NOT_AWAITING_PAYMENT', 422);
        }

        if ($reservation->payment_deadline_at !== null && $reservation->payment_deadline_at->isPast()) {
            return $this->error('The payment window for this reservation has expired.', 'PAYMENT_WINDOW_EXPIRED', 422);
        }

        try {
            $orderPayload = $action->execute($reservation, $user);

            return $this->success($orderPayload, 'Payment order initiated successfully.');
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 'PAYMENT_INITIATION_FAILED', 422);
        }
    }

    public function verify(
        VerifyPaymentRequest $request,
        string $reference,
        VerifyCheckoutPayment $action
    ): JsonResponse {
        /** @var User $user */
        $user = $request->user();

        $reservation = Reservation::query()
            ->where('booking_reference', $reference)
            ->where('user_id', $user->id)
            ->first();

        if ($reservation === null) {
            return $this->error("Reservation '{$reference}' not found.", 'RESERVATION_NOT_FOUND', 404);
        }

        $validated = $request->validated();

        try {
            $action->execute(
                $reservation,
                $user,
                (string) $validated['razorpay_order_id'],
                (string) $validated['razorpay_payment_id'],
                (string) $validated['razorpay_signature'],
            );

            $reservation->refresh();
            $reservation->loadMissing(['property.city', 'roomType', 'payments']);

            return $this->success(
                new ReservationResource($reservation),
                'Payment verified successfully. Reservation is confirmed.'
            );
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 'PAYMENT_VERIFICATION_FAILED', 422);
        }
    }

    public function status(Request $request, string $reference): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $reservation = Reservation::query()
            ->where('booking_reference', $reference)
            ->where('user_id', $user->id)
            ->with(['payments'])
            ->first();

        if ($reservation === null) {
            return $this->error("Reservation '{$reference}' not found.", 'RESERVATION_NOT_FOUND', 404);
        }

        $latestPayment = $reservation->payments()->latest('id')->first();

        return $this->success([
            'booking_reference' => $reservation->booking_reference,
            'status' => $reservation->status->value,
            'is_confirmed' => $reservation->status->value === 'confirmed',
            'payment_deadline_at' => $reservation->payment_deadline_at?->toIso8601String(),
            'is_deadline_expired' => $reservation->payment_deadline_at !== null && $reservation->payment_deadline_at->isPast(),
            'latest_payment' => $latestPayment ? [
                'id' => $latestPayment->id,
                'gateway' => $latestPayment->gateway,
                'status' => $latestPayment->status,
                'amount_paise' => $latestPayment->amount_paise,
                'captured_at' => $latestPayment->captured_at?->toIso8601String(),
            ] : null,
        ]);
    }
}
