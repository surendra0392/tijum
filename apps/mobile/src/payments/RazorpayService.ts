import { CustomerApi } from '../api/customer.ts';
import { PaymentOrderPayload, Reservation } from '../api/types.ts';

export interface NativeRazorpayModule {
    open(options: Record<string, unknown>): Promise<RazorpaySignatureResponse>;
}

function resolveNativeRazorpayModule(): NativeRazorpayModule | null {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const RN = require('react-native');
        if (RN?.Platform?.OS === 'web') {
            return null;
        }
        const hasNativeBridge = Boolean(
            RN?.NativeModules?.RNRazorpayCheckout ||
                RN?.TurboModuleRegistry?.get?.('RNRazorpayCheckout'),
        );
        if (!hasNativeBridge) {
            return null;
        }
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const RZ = require('react-native-razorpay');
        const mod = RZ?.default || RZ;
        return mod && typeof mod.open === 'function' ? mod : null;
    } catch {
        return null;
    }
}

let testNativeModuleOverride: NativeRazorpayModule | null | undefined;

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

export function classifyRazorpayError(
    err: any,
    platformOs?: string,
): { cancelled: boolean; message: string } {
    const code = typeof err?.code === 'number' ? err.code : undefined;
    const rawDescription =
        typeof err?.description === 'string' && err.description.trim() !== ''
            ? err.description.trim()
            : typeof err?.message === 'string' && err.message.trim() !== ''
              ? err.message.trim()
              : '';
    const lowerDesc = rawDescription.toLowerCase();
    const isCancelKeyword =
        lowerDesc.includes('cancel') || lowerDesc.includes('dismissed');

    // Android Razorpay SDK: code 2 = PAYMENT_CANCELLED; code 0 = NETWORK_ERROR.
    // iOS Razorpay SDK may report code 0 with cancel description or code 2.
    const isCancelled =
        code === 2 ||
        isCancelKeyword ||
        (platformOs === 'ios' && code === 0 && !lowerDesc.includes('network'));

    if (isCancelled) {
        return {
            cancelled: true,
            message: 'Payment was cancelled by the user.',
        };
    }

    return {
        cancelled: false,
        message:
            rawDescription || 'Payment processing could not be completed.',
    };
}

/**
 * Razorpay native payment checkout wrapper and server-verified reconciliation service.
 */
export class RazorpayPaymentService {
    static setNativeModuleForTesting(
        module: NativeRazorpayModule | null | undefined,
    ): void {
        testNativeModuleOverride = module;
    }

    private static getNativeModule(): NativeRazorpayModule | null {
        if (testNativeModuleOverride !== undefined) {
            return testNativeModuleOverride;
        }
        return resolveNativeRazorpayModule();
    }

    /**
     * Check whether the native Razorpay module is linked and available at runtime.
     */
    static isAvailable(): boolean {
        const mod = this.getNativeModule();
        return Boolean(mod && typeof mod.open === 'function');
    }

    /**
     * Open the native Razorpay checkout sheet with server-generated order payload.
     */
    static async openCheckout(
        payload: PaymentOrderPayload,
        customerDetails?: { name?: string; email?: string; phone?: string },
    ): Promise<RazorpaySignatureResponse> {
        const nativeModule = this.getNativeModule();
        if (!nativeModule || typeof nativeModule.open !== 'function') {
            throw new Error(
                'Native payment checkout is unavailable in this build. Use a native Android or iOS build to complete payment.',
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

        const data = await nativeModule.open(options);
        if (
            !data?.razorpay_order_id ||
            !data?.razorpay_payment_id ||
            !data?.razorpay_signature
        ) {
            throw new Error(
                'Incomplete payment confirmation payload returned by checkout.',
            );
        }

        return {
            razorpay_order_id: data.razorpay_order_id,
            razorpay_payment_id: data.razorpay_payment_id,
            razorpay_signature: data.razorpay_signature,
        };
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
        let platformOs: string | undefined;
        try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            platformOs = require('react-native')?.Platform?.OS;
        } catch {
            platformOs = undefined;
        }

        try {
            // Step 1: Check native availability before initiating order when on web/Expo Go
            if (!this.isAvailable()) {
                return {
                    success: false,
                    deferred: true,
                    error: 'Native Razorpay checkout requires an Android or iOS development/release build (not Expo Go or Web).',
                };
            }

            // Step 2: Initiate payment order on backend
            const initRes = await CustomerApi.initiatePayment(bookingReference);
            const payload = initRes.data;

            if (!payload) {
                return {
                    success: false,
                    error: 'Payment order could not be created.',
                };
            }

            // Step 3: Open native checkout
            const signatureData = await this.openCheckout(
                payload,
                customerDetails,
            );

            // Step 4: Authoritative signature verification on backend
            const verifyRes = await CustomerApi.verifyPayment(
                bookingReference,
                signatureData,
            );

            return {
                success: true,
                reservation: verifyRes.data,
            };
        } catch (err: any) {
            const classified = classifyRazorpayError(err, platformOs);
            if (classified.cancelled) {
                return {
                    success: false,
                    cancelled: true,
                    error: classified.message,
                };
            }

            return {
                success: false,
                error: classified.message,
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
