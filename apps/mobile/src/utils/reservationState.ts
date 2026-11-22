import type { Reservation } from '../api/types.ts';

export type ReservationButtonTarget =
    | Reservation
    | {
          status: string;
          can_pay?: boolean;
          can_cancel?: boolean;
          is_cancellable?: boolean;
          is_payment_deadline_expired?: boolean;
          payment_deadline_at?: string | null;
          payment_window_expires_at?: string | null;
          requires_refund_review?: boolean;
          has_captured_payment?: boolean;
          is_reviewed?: boolean;
          review?: Record<string, unknown> | null;
          review_eligibility?: {
              is_eligible: boolean;
              reason?: string;
          } | null;
          refunds?: unknown[];
      };

export function canPayReservation(
    reservation: ReservationButtonTarget | null | undefined,
    nowMs: number = Date.now(),
): boolean {
    if (!reservation) {
        return false;
    }

    if (typeof reservation.can_pay === 'boolean') {
        return reservation.can_pay;
    }

    if (reservation.status !== 'awaiting_payment') {
        return false;
    }

    if (reservation.is_payment_deadline_expired === true) {
        return false;
    }

    const deadline =
        reservation.payment_deadline_at ||
        reservation.payment_window_expires_at;
    if (!deadline) {
        return true;
    }

    const expiresMs = new Date(deadline).getTime();
    return Number.isNaN(expiresMs) ? false : expiresMs > nowMs;
}

export function canCancelReservation(
    reservation: ReservationButtonTarget | null | undefined,
): boolean {
    if (!reservation) {
        return false;
    }

    if (typeof reservation.can_cancel === 'boolean') {
        return reservation.can_cancel;
    }

    if (typeof reservation.is_cancellable === 'boolean') {
        return reservation.is_cancellable;
    }

    return (
        reservation.status === 'awaiting_payment' ||
        reservation.status === 'confirmed'
    );
}

export function canSubmitReview(
    reservation: ReservationButtonTarget | null | undefined,
): boolean {
    if (!reservation) {
        return false;
    }

    if (reservation.is_reviewed || reservation.review) {
        return false;
    }

    return reservation.review_eligibility?.is_eligible === true;
}

export function shouldShowRefundSection(
    reservation: ReservationButtonTarget | null | undefined,
): boolean {
    if (!reservation) {
        return false;
    }

    return (
        reservation.status === 'cancelled' ||
        reservation.status === 'expired' ||
        Boolean(reservation.requires_refund_review) ||
        (reservation.refunds?.length ?? 0) > 0
    );
}

export function resolveRefundNotice(
    reservation: ReservationButtonTarget,
): string {
    if (reservation.requires_refund_review) {
        if (reservation.status === 'expired') {
            return 'A payment was received after this reservation expired or could not be fulfilled. TIJUM support is reviewing it for refund processing to your original payment method.';
        }

        return 'Refund review underway. Eligible amounts are processed to your original payment method in 5-7 banking days pursuant to our Cancellation Policy.';
    }

    if (reservation.status === 'expired' && !reservation.has_captured_payment) {
        return 'The 15-minute payment window expired before payment was completed. No charges were deducted.';
    }

    if (
        reservation.status === 'cancelled' &&
        !reservation.has_captured_payment
    ) {
        return 'Reservation was cancelled prior to payment capture. No charges were deducted.';
    }

    if (reservation.has_captured_payment) {
        return 'Payment was captured for this stay. Please contact TIJUM support if you need help with refund tracking.';
    }

    return 'No refund transactions are pending for this reservation.';
}

export function resolvePaymentVerifyAlert(
    reservation: Pick<Reservation, 'status' | 'requires_refund_review'>,
    serverMessage?: string,
): { title: string; message: string } {
    if (
        reservation.requires_refund_review ||
        reservation.status !== 'confirmed'
    ) {
        return {
            title: 'Payment Under Review',
            message:
                serverMessage ||
                'Payment was received, but this reservation could not be confirmed automatically and is under refund review.',
        };
    }

    return {
        title: 'Payment Successful',
        message:
            serverMessage ||
            'Your reservation is now fully confirmed. Enjoy your stay!',
    };
}

export function resolveReservationListActionRoute(reference: string): string {
    return `/(customer)/bookings/${reference}`;
}
