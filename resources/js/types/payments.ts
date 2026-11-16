export type PaymentStatus =
    | 'created'
    | 'pending'
    | 'authorized'
    | 'captured'
    | 'failed'
    | 'cancelled'
    | 'refund_pending'
    | 'partially_refunded'
    | 'refunded';

export type RefundStatus = 'pending' | 'processed' | 'failed';

export type PaymentSummary = {
    id: number;
    gateway: string;
    gateway_order_id: string;
    gateway_payment_id: string | null;
    status: PaymentStatus;
    status_label: string;
    amount_minor: number;
    refunded_amount_minor: number;
    refundable_balance_minor: number;
    currency_code: string;
    payment_method: string | null;
    captured_at: string | null;
    failed_at: string | null;
    failure_reason: string | null;
    created_at: string;
};

export type RefundSummary = {
    id: number;
    gateway_refund_id: string | null;
    amount_minor: number;
    currency_code: string;
    status: RefundStatus;
    status_label: string;
    reason: string | null;
    admin_name?: string | null;
    processed_at: string | null;
    created_at: string;
};

export type PaymentOrderResponse = {
    payment_id: number;
    gateway_order_id: string;
    amount_minor: number;
    currency: string;
    key_id: string;
    prefill: {
        name: string;
        email: string;
        contact: string;
    };
    notes: {
        booking_reference: string;
        reservation_id: number;
    };
};
