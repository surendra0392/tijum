import { ApiClient } from './client';
import {
    ApiResponse,
    CustomerProfile,
    NotificationItem,
    NotificationPreferences,
    CustomerCaseSummary,
    SupportTicketDetail,
    SupportTicketIndexData,
    SupportTicketMessage,
    SupportTicketSummary,
    PaymentOrderPayload,
    PropertyCard,
    Reservation,
    StayQuoteResponse,
} from './types';

export const CustomerApi = {
    // Profile
    getProfile: () =>
        ApiClient.get<ApiResponse<CustomerProfile>>('customer/profile'),
    updateProfile: (data: {
        name: string;
        phone?: string;
        marketing_consent?: boolean;
    }) => ApiClient.put<ApiResponse<CustomerProfile>>('customer/profile', data),
    changePassword: (data: {
        current_password: string;
        password: string;
        password_confirmation: string;
    }) => ApiClient.put<ApiResponse<null>>('customer/password', data),
    resendEmailVerification: () =>
        ApiClient.post<ApiResponse<{ email_verified: boolean }>>(
            'customer/email/verification-notification',
        ),

    // Reservations
    getReservations: (
        stage?: 'upcoming' | 'awaiting_action' | 'past' | 'cancelled',
        page: number = 1,
    ) =>
        ApiClient.get<ApiResponse<Reservation[]>>('customer/reservations', {
            stage,
            page,
        }),

    quoteReservation: (
        propertyId: number,
        data: {
            property_room_type_id: number;
            check_in_date: string;
            duration_type: 'daily' | 'weekly' | 'monthly';
            duration_quantity: number;
            quantity: number;
            guest_count?: number;
            early_check_in_requested?: boolean;
            requested_arrival_time?: string;
        },
    ) =>
        ApiClient.post<ApiResponse<StayQuoteResponse>>(
            `customer/reservations/quote/${propertyId}`,
            data,
        ),

    createReservation: (data: {
        submission_token: string;
        property_id: number;
        property_room_type_id: number;
        check_in_date: string;
        duration_type: 'daily' | 'weekly' | 'monthly';
        duration_quantity: number;
        quantity: number;
        guest_count?: number;
        guest_gender: 'male' | 'female' | 'mixed';
        guest_composition?: 'individuals';
        booking_for?: 'self' | 'other';
        contact_name?: string;
        contact_email?: string;
        contact_phone?: string;
        early_check_in_requested?: boolean;
        requested_arrival_time?: string;
        notes?: string;
        coupon_code?: string;
        points_to_redeem?: number;
    }) =>
        ApiClient.post<ApiResponse<Reservation>>('customer/reservations', {
            ...data,
            submission_token: data.submission_token,
            guest_count: data.guest_count ?? data.quantity,
            guest_composition: data.guest_composition ?? 'individuals',
        }),

    getReservation: (reference: string) =>
        ApiClient.get<ApiResponse<Reservation>>(
            `customer/reservations/${reference}`,
        ),

    cancelReservation: (reference: string, reason: string) =>
        ApiClient.post<ApiResponse<Reservation>>(
            `customer/reservations/${reference}/cancel`,
            { reason },
        ),

    // Payments (Authoritative backend integration)
    initiatePayment: (reference: string) =>
        ApiClient.post<ApiResponse<PaymentOrderPayload>>(
            `customer/reservations/${reference}/payment/initiate`,
        ),

    verifyPayment: (
        reference: string,
        data: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
        },
    ) =>
        ApiClient.post<ApiResponse<Reservation>>(
            `customer/reservations/${reference}/payment/verify`,
            data,
        ),

    getPaymentStatus: (reference: string) =>
        ApiClient.get<ApiResponse<any>>(
            `customer/reservations/${reference}/payment/status`,
        ),

    // Reviews
    getReviews: (page: number = 1) =>
        ApiClient.get<ApiResponse<any[]>>('customer/reviews', { page }),
    getEligibleReviews: () =>
        ApiClient.get<ApiResponse<any[]>>('customer/reviews/eligible'),
    submitReview: (
        bookingReference: string,
        data: {
            overall_rating: number;
            cleanliness_rating?: number;
            food_quality_rating?: number;
            communication_rating?: number;
            value_rating?: number;
            title?: string;
            content?: string;
        },
    ) =>
        ApiClient.post<ApiResponse<any>>(
            `customer/reviews/${bookingReference}`,
            data,
        ),

    // Support / Grievance Cases
    getCases: (page: number = 1) =>
        ApiClient.get<ApiResponse<CustomerCaseSummary[]>>('customer/cases', {
            page,
        }),
    getCase: (reference: string) =>
        ApiClient.get<ApiResponse<any>>(`customer/cases/${reference}`),
    createCase: (data: {
        booking_reference: string;
        category: string;
        description: string;
    }) => ApiClient.post<ApiResponse<any>>('customer/cases', data),
    addCaseMessage: (reference: string, message: string) =>
        ApiClient.post<ApiResponse<any>>(
            `customer/cases/${reference}/messages`,
            { message },
        ),

    getSupportTickets: (status?: string) =>
        ApiClient.get<ApiResponse<SupportTicketIndexData>>(
            'customer/support-tickets',
            { status },
        ),
    createSupportTicket: (data: {
        subject: string;
        category: string;
        priority: 'low' | 'standard' | 'high' | 'urgent';
        message: string;
        booking_reference?: string;
    }) =>
        ApiClient.post<ApiResponse<SupportTicketSummary>>(
            'customer/support-tickets',
            data,
        ),
    getSupportTicket: (reference: string) =>
        ApiClient.get<
            ApiResponse<{
                ticket: SupportTicketDetail;
                messages: SupportTicketMessage[];
            }>
        >(`customer/support-tickets/${reference}`),
    addSupportTicketMessage: (reference: string, message: string) =>
        ApiClient.post<ApiResponse<SupportTicketMessage>>(
            `customer/support-tickets/${reference}/messages`,
            { message },
        ),
    closeSupportTicket: (reference: string) =>
        ApiClient.post<ApiResponse<SupportTicketSummary>>(
            `customer/support-tickets/${reference}/close`,
        ),

    // Notifications & Preferences
    getNotifications: (page: number = 1) =>
        ApiClient.get<ApiResponse<NotificationItem[]>>(
            'customer/notifications',
            { page },
        ),
    getUnreadCount: () =>
        ApiClient.get<ApiResponse<{ unread_count: number }>>(
            'customer/notifications/unread-count',
        ),
    markRead: (id: number) =>
        ApiClient.post<ApiResponse<null>>(`customer/notifications/${id}/read`),
    markAllRead: () =>
        ApiClient.post<ApiResponse<null>>(
            'customer/notifications/mark-all-read',
        ),
    getNotificationPreferences: () =>
        ApiClient.get<ApiResponse<NotificationPreferences>>(
            'customer/notifications/preferences',
        ),
    updateNotificationPreferences: (data: {
        in_app_operational?: boolean;
        email_operational?: boolean;
        push_operational?: boolean;
        sms_operational?: boolean;
        whatsapp_opted_in?: boolean;
    }) =>
        ApiClient.put<ApiResponse<any>>(
            'customer/notifications/preferences',
            data,
        ),

    // Wishlist
    getWishlist: () =>
        ApiClient.get<ApiResponse<PropertyCard[]>>('customer/wishlist'),
    addToWishlist: (propertyId: number) =>
        ApiClient.post<ApiResponse<any>>(`customer/wishlist/${propertyId}`),
    removeFromWishlist: (propertyId: number) =>
        ApiClient.delete<ApiResponse<any>>(`customer/wishlist/${propertyId}`),
    toggleWishlist: (propertyId: number) =>
        ApiClient.post<ApiResponse<any>>(
            `customer/wishlist/${propertyId}/toggle`,
        ),

    // Push Device Registration
    registerDevice: (data: {
        device_installation_id: string;
        push_token?: string;
        platform: 'android' | 'ios';
        app_version?: string;
        device_name?: string;
    }) => ApiClient.post<ApiResponse<any>>('customer/devices/register', data),

    unregisterDevice: (deviceInstallationId: string) =>
        ApiClient.delete<ApiResponse<null>>('customer/devices/unregister', {
            device_installation_id: deviceInstallationId,
        }),
};
