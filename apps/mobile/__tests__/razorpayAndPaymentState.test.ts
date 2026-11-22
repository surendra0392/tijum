import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    RazorpayPaymentService,
    classifyRazorpayError,
} from '../src/payments/RazorpayService.ts';
import {
    canCancelReservation,
    canPayReservation,
    canSubmitReview,
    shouldShowRefundSection,
} from '../src/utils/reservationState.ts';

describe('Behavioral Suite 3: Razorpay Payment Checkout & Reservation Lifecycle Guards', () => {
    it('fails closed when native Razorpay module is unavailable', async () => {
        RazorpayPaymentService.setNativeModuleForTesting(null);
        try {
            assert.equal(RazorpayPaymentService.isAvailable(), false);
            await assert.rejects(
                async () => {
                    await RazorpayPaymentService.openCheckout({
                        key_id: 'rzp_test_123',
                        order_id: 'order_test_123',
                        amount_minor: 150000,
                        currency: 'INR',
                        booking_reference: 'TIJ-2026-0001',
                        business_name: 'TIJUM',
                        description: 'Stay Reservation',
                        payment_deadline_at: '2026-11-23T12:00:00Z',
                    });
                },
                /Native payment checkout is unavailable/i,
            );
        } finally {
            RazorpayPaymentService.setNativeModuleForTesting(undefined);
        }
    });

    it('verifies complete signature payload returned by mocked native Razorpay SDK', async () => {
        RazorpayPaymentService.setNativeModuleForTesting({
            open: async () => ({
                razorpay_order_id: 'order_test_999',
                razorpay_payment_id: 'pay_test_888',
                razorpay_signature: 'sig_hmac_sha256_valid',
            }),
        });

        try {
            assert.equal(RazorpayPaymentService.isAvailable(), true);
            const sig = await RazorpayPaymentService.openCheckout(
                {
                    key_id: 'rzp_test_123',
                    order_id: 'order_test_999',
                    amount_minor: 250000,
                    currency: 'INR',
                    booking_reference: 'TIJ-2026-0099',
                    business_name: 'TIJUM',
                    description: 'Stay Reservation',
                    payment_deadline_at: '2026-11-23T12:00:00Z',
                },
                {
                    name: 'Aarav',
                    email: 'aarav@example.com',
                    phone: '9876543210',
                },
            );
            assert.equal(sig.razorpay_order_id, 'order_test_999');
            assert.equal(sig.razorpay_payment_id, 'pay_test_888');
            assert.equal(sig.razorpay_signature, 'sig_hmac_sha256_valid');
        } finally {
            RazorpayPaymentService.setNativeModuleForTesting(undefined);
        }
    });

    it('classifies user dismissal vs network/gateway errors accurately on Android and iOS', () => {
        const androidCancel = classifyRazorpayError(
            { code: 2, description: 'Payment cancelled by user' },
            'android',
        );
        assert.equal(androidCancel.cancelled, true);

        const androidNetworkErr = classifyRazorpayError(
            { code: 0, description: 'Network error occurred' },
            'android',
        );
        assert.equal(androidNetworkErr.cancelled, false);

        const iosCancel = classifyRazorpayError(
            { code: 0, description: 'Checkout dismissed' },
            'ios',
        );
        assert.equal(iosCancel.cancelled, true);
    });

    it('enforces reservation payment, cancellation, refund, and review eligibility transitions', () => {
        const pendingRes = {
            status: 'awaiting_payment',
            is_payment_deadline_expired: false,
        };
        assert.equal(canPayReservation(pendingRes), true);
        assert.equal(canCancelReservation(pendingRes), true);
        assert.equal(canSubmitReview(pendingRes), false);

        const expiredRes = {
            status: 'awaiting_payment',
            is_payment_deadline_expired: true,
        };
        assert.equal(canPayReservation(expiredRes), false);

        const completedEligibleRes = {
            status: 'completed',
            is_reviewed: false,
            review_eligibility: { is_eligible: true },
        };
        assert.equal(canSubmitReview(completedEligibleRes), true);

        const cancelledWithRefund = {
            status: 'cancelled',
            refunds: [{ id: 1 }],
        };
        assert.equal(shouldShowRefundSection(cancelledWithRefund), true);
    });
});
