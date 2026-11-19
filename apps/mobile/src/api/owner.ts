import { ApiClient } from './client';
import {
    ApiResponse,
    NotificationItem,
    OwnerProfile,
    PartnerDashboardData,
    PropertyDetail,
    Reservation,
} from './types';

export const OwnerApi = {
    // Profile & Security
    getProfile: () =>
        ApiClient.get<ApiResponse<OwnerProfile>>('owner/profile'),
    updateProfile: (data: { name: string; email?: string; phone?: string }) =>
        ApiClient.put<ApiResponse<OwnerProfile>>('owner/profile', data),
    changePassword: (data: {
        current_password: string;
        password: string;
        password_confirmation: string;
    }) => ApiClient.put<ApiResponse<null>>('owner/password', data),

    // Dashboard
    getDashboard: () =>
        ApiClient.get<ApiResponse<PartnerDashboardData>>('owner/dashboard'),

    // Properties
    getProperties: (page: number = 1) =>
        ApiClient.get<ApiResponse<PropertyDetail[]>>('owner/properties', {
            page,
        }),
    getProperty: (id: number) =>
        ApiClient.get<ApiResponse<PropertyDetail>>(`owner/properties/${id}`),

    // Reservations
    getReservations: (status?: string, page: number = 1) =>
        ApiClient.get<ApiResponse<Reservation[]>>('owner/reservations', {
            status,
            page,
        }),
    getReservation: (reference: string) =>
        ApiClient.get<ApiResponse<Reservation>>(
            `owner/reservations/${reference}`,
        ),
    checkInReservation: (reference: string, notes?: string) =>
        ApiClient.post<ApiResponse<Reservation>>(
            `owner/reservations/${reference}/check-in`,
            { notes },
        ),
    checkOutReservation: (reference: string, notes?: string) =>
        ApiClient.post<ApiResponse<Reservation>>(
            `owner/reservations/${reference}/check-out`,
            { notes },
        ),

    // Financial & Settlements (read-only)
    getFinancialSummary: () =>
        ApiClient.get<ApiResponse<any>>('owner/financial/summary'),
    getSettlements: (page: number = 1) =>
        ApiClient.get<ApiResponse<any[]>>('owner/financial/settlements', {
            page,
        }),

    // Notifications
    getNotifications: (page: number = 1) =>
        ApiClient.get<ApiResponse<NotificationItem[]>>('owner/notifications', {
            page,
        }),
    getUnreadCount: () =>
        ApiClient.get<ApiResponse<{ unread_count: number }>>(
            'owner/notifications/unread-count',
        ),
    markRead: (id: number) =>
        ApiClient.post<ApiResponse<null>>(`owner/notifications/${id}/read`),
    markAllRead: () =>
        ApiClient.post<ApiResponse<null>>('owner/notifications/mark-all-read'),

    // Push Device Registration
    registerDevice: (data: {
        device_installation_id: string;
        push_token?: string;
        platform: 'android' | 'ios';
        app_version?: string;
        device_name?: string;
    }) => ApiClient.post<ApiResponse<any>>('owner/devices/register', data),

    unregisterDevice: (deviceInstallationId: string) =>
        ApiClient.delete<ApiResponse<null>>('owner/devices/unregister'),
};
