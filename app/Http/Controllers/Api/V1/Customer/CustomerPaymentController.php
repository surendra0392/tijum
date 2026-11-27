<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Customer;

use App\Actions\Payments\InitiatePaymentOrder;
use App\Actions\Payments\VerifyCheckoutPayment;
use App\Enums\ReservationStatus;
use App\Http\Controllers\Api\V1\ApiController;
use App\Http\Requests\Payments\VerifyPaymentRequest;
use App\Http\Resources\Api\V1\ReservationResource;
use App\Models\Reservation;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;
use RuntimeException;
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
            $rawKey = $request->header('Idempotency-Key') ?? $request->input('idempotency_key');
            $idempotencyKey = is_string($rawKey) && trim($rawKey) !== '' ? trim($rawKey) : null;
            $orderPayload = $action->execute($reservation, $user, $idempotencyKey);

            return $this->success($orderPayload, 'Payment order initiated successfully.');
        } catch (ValidationException $e) {
            return $this->error($e->getMessage(), 'PAYMENT_INITIATION_FAILED', 422, $e->errors());
        } catch (InvalidArgumentException|RuntimeException $e) {
            return $this->error($e->getMessage(), 'PAYMENT_INITIATION_FAILED', 422);
        } catch (Throwable $e) {
            Log::error('API payment initiation failed unexpectedly: '.$e->getMessage(), [
                'exception' => $e,
                'booking_reference' => $reference,
            ]);

            return $this->error('Unable to initiate payment right now. Please try again.', 'PAYMENT_INITIATION_ERROR', 500);
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
            $reservation = $action->execute(
                $reservation,
                $user,
                (string) $validated['razorpay_order_id'],
                (string) $validated['razorpay_payment_id'],
                (string) $validated['razorpay_signature'],
            );

            $reservation->loadMissing(['property.city', 'property.media', 'roomType', 'payments', 'refunds', 'review', 'user']);

            return $this->success(
                new ReservationResource($reservation),
                $reservation->requires_refund_review || $reservation->status !== ReservationStatus::Confirmed
                    ? 'Payment received. Your reservation requires manual review.'
                    : 'Payment verified successfully. Reservation is confirmed.'
            );
        } catch (ValidationException $e) {
            return $this->error($e->getMessage(), 'PAYMENT_VERIFICATION_FAILED', 422, $e->errors());
        } catch (InvalidArgumentException|RuntimeException $e) {
            return $this->error($e->getMessage(), 'PAYMENT_VERIFICATION_FAILED', 422);
        } catch (Throwable $e) {
            Log::error('API payment verification failed unexpectedly: '.$e->getMessage(), [
                'exception' => $e,
                'booking_reference' => $reference,
            ]);

            return $this->error('Unable to verify payment right now. Please check your booking status shortly.', 'PAYMENT_VERIFICATION_ERROR', 500);
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
        $hasCapturedPayment = $reservation->successfulPayment()->exists();

        return $this->success([
            'booking_reference' => $reservation->booking_reference,
            'status' => $reservation->status->value,
            'status_label' => $reservation->status->label(),
            'can_pay' => $reservation->canAcceptPayment(),
            'is_confirmed' => $reservation->status === ReservationStatus::Confirmed,
            'requires_refund_review' => (bool) $reservation->requires_refund_review,
            'has_captured_payment' => $hasCapturedPayment,
            'payment_deadline_at' => $reservation->payment_deadline_at?->toIso8601String(),
            'is_deadline_expired' => $reservation->isPaymentDeadlineExpired(),
            'latest_payment' => $latestPayment ? [
                'id' => $latestPayment->id,
                'gateway' => $latestPayment->gateway,
                'status' => $latestPayment->status->value,
                'status_label' => $latestPayment->status->label(),
                'amount_minor' => (int) $latestPayment->amount_minor,
                'amount_paise' => (int) $latestPayment->amount_minor,
                'refunded_amount_minor' => (int) $latestPayment->refunded_amount_minor,
                'failure_reason' => $latestPayment->failure_reason,
                'captured_at' => $latestPayment->captured_at?->toIso8601String(),
                'failed_at' => $latestPayment->failed_at?->toIso8601String(),
            ] : null,
        ]);
    }
}
