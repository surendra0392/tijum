import { ApiClient } from './client';
import {
    ApiResponse,
    CustomerProfile,
    NotificationItem,
    PaymentOrderPayload,
    PropertyCard,
    Reservation,
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

    // Reservations
    getReservations: (status?: string, page: number = 1) =>
        ApiClient.get<ApiResponse<Reservation[]>>('customer/reservations', {
            status,
            page,
        }),

    quoteReservation: (
        propertyId: number,
        data: {
            property_room_type_id: number;
            check_in_date: string;
            duration_type: string;
            duration_quantity: number;
            quantity: number;
        },
    ) =>
        ApiClient.post<ApiResponse<any>>(
            `customer/reservations/quote/${propertyId}`,
            data,
        ),

    createReservation: (data: {
        property_id: number;
        property_room_type_id: number;
        check_in_date: string;
        duration_type: string;
        duration_quantity: number;
        quantity: number;
        guest_gender: string;
        guest_composition: string;
        notes?: string;
        coupon_code?: string;
        points_to_redeem?: number;
    }) =>
        ApiClient.post<ApiResponse<Reservation>>('customer/reservations', data),

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
        ApiClient.get<ApiResponse<any[]>>('customer/cases', { page }),
    getCase: (reference: string) =>
        ApiClient.get<ApiResponse<any>>(`customer/cases/${reference}`),
    createCase: (data: {
        booking_reference: string;
        category: string;
        description: string;
    }) => ApiClient.post<ApiResponse<any>>('customer/cases', data),

    // Notifications
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

    // Wishlist
    getWishlist: () =>
        ApiClient.get<ApiResponse<PropertyCard[]>>('customer/wishlist'),
    addToWishlist: (propertyId: number) =>
        ApiClient.post<ApiResponse<any>>(`customer/wishlist/${propertyId}`),
    removeFromWishlist: (propertyId: number) =>
        ApiClient.delete<ApiResponse<any>>(`customer/wishlist/${propertyId}`),

    // Push Device Registration
    registerDevice: (data: {
        device_installation_id: string;
        push_token?: string;
        platform: 'android' | 'ios';
        app_version?: string;
        device_name?: string;
    }) => ApiClient.post<ApiResponse<any>>('customer/devices/register', data),

    unregisterDevice: (deviceInstallationId: string) =>
        ApiClient.delete<ApiResponse<null>>('customer/devices/unregister'),
};
