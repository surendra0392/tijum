import { CustomerApi } from '../api/customer';
import { PaymentOrderPayload, Reservation } from '../api/types';

// Safe dynamic loader for native Razorpay SDK supporting New Architecture TurboModule
let NativeRazorpay: any = null;
try {
    const RZ = require('react-native-razorpay');
    NativeRazorpay = RZ.default || RZ;
} catch {
    // Graceful fallback when running in non-native or test environments
    NativeRazorpay = null;
}

export interface PaymentCheckoutResult {
    success: boolean;
    reservation?: Reservation;
    error?: string;
    cancelled?: boolean;
    deferred?: boolean;
}

export interface RazorpaySignatureResponse {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
}

/**
 * Razorpay Payment Service (Phase 20A - Stabilized Native Module Integration).
 *
 * NOTE: Live payment verification is explicitly DEFERRED pending production merchant credentials.
 * This service provides compile-time verification, native TurboModule linking, and safe error boundaries
 * without invoking live monetary transactions.
 */
export class RazorpayPaymentService {
    /**
     * Check whether native Razorpay module is linked and available at runtime.
     */
    static isAvailable(): boolean {
        return Boolean(
            NativeRazorpay && typeof NativeRazorpay.open === 'function',
        );
    }

    /**
     * Open the native Razorpay checkout sheet with server-generated order payload.
     */
    static async openCheckout(
        payload: PaymentOrderPayload,
        customerDetails?: { name?: string; email?: string; phone?: string },
    ): Promise<RazorpaySignatureResponse> {
        if (!this.isAvailable()) {
            throw new Error(
                'Razorpay Native Checkout module is not available in this environment. Live payment confirmation is DEFERRED.',
            );
        }

        const options: any = {
            key: payload.key_id,
            amount: payload.amount_minor,
            currency: payload.currency || 'INR',
            name: payload.business_name || 'TIJUM',
            description:
                payload.description ||
                `Stay Reservation ${payload.booking_reference}`,
            order_id: payload.order_id,
            theme: {
                color: '#442F41', // Deep Plum
            },
        };

        if (customerDetails) {
            options.prefill = {
                name: customerDetails.name,
                email: customerDetails.email,
                contact: customerDetails.phone,
            };
        }

        return new Promise<RazorpaySignatureResponse>((resolve, reject) => {
            NativeRazorpay.open(options)
                .then((data: any) => {
                    resolve({
                        razorpay_order_id: data.razorpay_order_id,
                        razorpay_payment_id: data.razorpay_payment_id,
                        razorpay_signature: data.razorpay_signature,
                    });
                })
                .catch((err: any) => {
                    reject(err);
                });
        });
    }

    /**
     * Execute full backend-authoritative payment flow:
     * 1. Initiate order on backend
     * 2. Open native checkout sheet
     * 3. Authoritatively verify signature on backend
     */
    static async checkout(
        bookingReference: string,
        customerDetails: { name: string; email: string; phone?: string },
    ): Promise<PaymentCheckoutResult> {
        try {
            // Step 1: Initiate payment order on backend
            const initRes = await CustomerApi.initiatePayment(bookingReference);
            const payload = initRes.data;

            // Handle deferred / simulated gateway
            if (!this.isAvailable()) {
                return {
                    success: false,
                    deferred: true,
                    error: 'Razorpay native payment is deferred. No live transactions are executed in Phase 20A.',
                };
            }

            // Step 2: Open native checkout
            const signatureData = await this.openCheckout(
                payload,
                customerDetails,
            );

            // Step 3: Authoritative signature verification on backend
            const verifyRes = await CustomerApi.verifyPayment(
                bookingReference,
                signatureData,
            );

            return {
                success: true,
                reservation: verifyRes.data,
            };
        } catch (err: any) {
            if (err?.code === 0 || err?.description?.includes('cancelled')) {
                return {
                    success: false,
                    cancelled: true,
                    error: 'Payment was cancelled by the user.',
                };
            }

            return {
                success: false,
                error:
                    err?.message ||
                    'Payment processing could not be completed.',
            };
        }
    }

    /**
     * Reconcile payment status upon app resume.
     */
    static async reconcile(bookingReference: string): Promise<any> {
        return CustomerApi.getPaymentStatus(bookingReference);
    }
}

// Export aliases for backwards compatibility
export const RazorpayService = RazorpayPaymentService;
