import { ApiClient } from './client';
import {
    AmenityCatalogCategory,
    ApiResponse,
    CaseMessage,
    NotificationItem,
    OwnerCase,
    OwnerCommissionAgreement,
    OwnerFinancialProfile,
    OwnerProfile,
    OwnerPropertyAmenity,
    OwnerReferenceData,
    OwnerReview,
    PartnerDashboardData,
    PhysicalRoom,
    PropertyAvailabilityBlock,
    PropertyDetail,
    PropertyMediaItem,
    PropertyPricingData,
    PropertyVerificationEvaluation,
    Reservation,
    RoomType,
    SettlementDetail,
} from './types';

export const OwnerApi = {
    // Profile & Security
    getProfile: () => ApiClient.get<ApiResponse<OwnerProfile>>('owner/profile'),
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

    // Reference Data & Catalog
    getReferenceData: () =>
        ApiClient.get<ApiResponse<OwnerReferenceData>>('owner/reference-data'),

    // Properties
    getProperties: (page: number = 1) =>
        ApiClient.get<ApiResponse<PropertyDetail[]>>('owner/properties', {
            page,
        }),
    getProperty: (id: number) =>
        ApiClient.get<ApiResponse<PropertyDetail>>(`owner/properties/${id}`),
    createProperty: (data: {
        name: string;
        category_id: number;
        city_id: number;
        description: string;
        contact_person_name: string;
        contact_phone: string;
        contact_email?: string;
        address_line_1: string;
        address_line_2?: string;
        locality: string;
        landmark?: string;
        postal_code: string;
    }) => ApiClient.post<ApiResponse<PropertyDetail>>('owner/properties', data),
    updateProperty: (
        id: number,
        data: {
            name: string;
            category_id: number;
            city_id: number;
            description: string;
            contact_person_name: string;
            contact_phone: string;
            contact_email?: string;
            address_line_1: string;
            address_line_2?: string;
            locality: string;
            landmark?: string;
            postal_code: string;
        },
    ) =>
        ApiClient.put<ApiResponse<PropertyDetail>>(
            `owner/properties/${id}`,
            data,
        ),
    submitVerification: (id: number, declarationAccepted: boolean) =>
        ApiClient.post<ApiResponse<any>>(
            `owner/properties/${id}/submit-verification`,
            { declaration_accepted: declarationAccepted },
        ),
    getVerificationStatus: (id: number) =>
        ApiClient.get<ApiResponse<PropertyVerificationEvaluation>>(
            `owner/properties/${id}/verification-status`,
        ),

    // Room Types
    getRoomTypes: (propertyId: number) =>
        ApiClient.get<ApiResponse<RoomType[]>>(
            `owner/properties/${propertyId}/room-types`,
        ),
    createRoomType: (
        propertyId: number,
        data: {
            name: string;
            accommodation_mode: 'shared' | 'private';
            sharing_capacity?: number;
            gender_policy: string;
            guest_composition_policy: string[];
            is_air_conditioned?: boolean;
            early_check_in_enabled?: boolean;
            is_active?: boolean;
            description?: string;
        },
    ) =>
        ApiClient.post<ApiResponse<RoomType>>(
            `owner/properties/${propertyId}/room-types`,
            data,
        ),
    updateRoomType: (
        propertyId: number,
        roomTypeId: number,
        data: {
            name: string;
            accommodation_mode: 'shared' | 'private';
            sharing_capacity?: number;
            gender_policy: string;
            guest_composition_policy: string[];
            is_air_conditioned?: boolean;
            early_check_in_enabled?: boolean;
            is_active?: boolean;
            description?: string;
        },
    ) =>
        ApiClient.put<ApiResponse<RoomType>>(
            `owner/properties/${propertyId}/room-types/${roomTypeId}`,
            data,
        ),
    deleteRoomType: (
        propertyId: number,
        roomTypeId: number,
        deactivateOnly: boolean = false,
    ) =>
        ApiClient.delete<ApiResponse<null>>(
            `owner/properties/${propertyId}/room-types/${roomTypeId}`,
            { deactivate_only: deactivateOnly },
        ),

    // Physical Rooms
    getPropertyRooms: (propertyId: number) =>
        ApiClient.get<ApiResponse<PhysicalRoom[]>>(
            `owner/properties/${propertyId}/rooms`,
        ),
    createRoom: (
        propertyId: number,
        data: {
            room_number: string;
            property_room_type_id: number;
            operational_status?: string;
            floor_number?: string;
            wing_name?: string;
            building_name?: string;
        },
    ) =>
        ApiClient.post<ApiResponse<PhysicalRoom>>(
            `owner/properties/${propertyId}/rooms`,
            data,
        ),
    updateRoom: (
        propertyId: number,
        roomId: number,
        data: {
            room_number: string;
            property_room_type_id: number;
            operational_status?: string;
            floor_number?: string;
            wing_name?: string;
            building_name?: string;
        },
    ) =>
        ApiClient.put<ApiResponse<PhysicalRoom>>(
            `owner/properties/${propertyId}/rooms/${roomId}`,
            data,
        ),
    updateRoomStatus: (
        propertyId: number,
        roomId: number,
        operationalStatus: string,
        description?: string,
    ) =>
        ApiClient.patch<ApiResponse<any>>(
            `owner/properties/${propertyId}/rooms/${roomId}/status`,
            {
                operational_status: operationalStatus,
                description,
            },
        ),

    // Pricing & Rate Plans
    getPricing: (propertyId: number) =>
        ApiClient.get<ApiResponse<PropertyPricingData>>(
            `owner/properties/${propertyId}/pricing`,
        ),
    updatePricing: (
        propertyId: number,
        data: {
            food_provided: boolean;
            breakfast_included?: boolean;
            lunch_included?: boolean;
            dinner_included?: boolean;
            room_types: Array<{
                id: number;
                daily_rate_minor?: number | null;
                weekly_rate_minor?: number | null;
                monthly_rate_minor?: number | null;
            }>;
        },
    ) =>
        ApiClient.put<ApiResponse<PropertyPricingData>>(
            `owner/properties/${propertyId}/pricing`,
            data,
        ),

    // Availability Blocks
    getAvailabilityBlocks: (propertyId: number) =>
        ApiClient.get<ApiResponse<PropertyAvailabilityBlock[]>>(
            `owner/properties/${propertyId}/availability-blocks`,
        ),
    createAvailabilityBlock: (
        propertyId: number,
        data: {
            scope: 'property' | 'room_type' | 'room';
            block_type: 'closure' | 'maintenance' | 'stop_sell';
            start_date: string;
            end_date: string;
            property_room_type_id?: number | null;
            property_room_id?: number | null;
            reason: string;
        },
    ) =>
        ApiClient.post<ApiResponse<PropertyAvailabilityBlock>>(
            `owner/properties/${propertyId}/availability-blocks`,
            data,
        ),
    cancelAvailabilityBlock: (
        propertyId: number,
        blockId: number,
        reason?: string,
    ) =>
        ApiClient.delete<ApiResponse<null>>(
            `owner/properties/${propertyId}/availability-blocks/${blockId}`,
            { reason },
        ),

    // Media & Photos
    getMedia: (propertyId: number) =>
        ApiClient.get<ApiResponse<PropertyMediaItem[]>>(
            `owner/properties/${propertyId}/media`,
        ),
    uploadMedia: (propertyId: number, formData: FormData) =>
        ApiClient.post<ApiResponse<PropertyMediaItem>>(
            `owner/properties/${propertyId}/media`,
            formData,
        ),
    updateMedia: (
        propertyId: number,
        mediaId: number,
        data: {
            alt_text: string;
            category?: string;
            make_cover?: boolean;
        },
    ) =>
        ApiClient.put<ApiResponse<PropertyMediaItem>>(
            `owner/properties/${propertyId}/media/${mediaId}`,
            data,
        ),
    reorderMedia: (propertyId: number, orderedIds: number[]) =>
        ApiClient.post<ApiResponse<null>>(
            `owner/properties/${propertyId}/media/reorder`,
            { ordered_ids: orderedIds },
        ),
    deleteMedia: (propertyId: number, mediaId: number) =>
        ApiClient.delete<ApiResponse<null>>(
            `owner/properties/${propertyId}/media/${mediaId}`,
        ),

    // Amenities
    getAmenities: (propertyId: number) =>
        ApiClient.get<
            ApiResponse<{
                assigned: OwnerPropertyAmenity[];
                catalogue: AmenityCatalogCategory[];
            }>
        >(`owner/properties/${propertyId}/amenities`),
    assignAmenity: (
        propertyId: number,
        data: {
            amenity_id: number;
            availability?: 'included' | 'not_available';
            details?: string;
        },
    ) =>
        ApiClient.post<ApiResponse<any>>(
            `owner/properties/${propertyId}/amenities`,
            data,
        ),
    deleteAmenity: (propertyId: number, amenityAssignmentId: number) =>
        ApiClient.delete<ApiResponse<null>>(
            `owner/properties/${propertyId}/amenities/${amenityAssignmentId}`,
        ),

    // Reservations
    getReservations: (
        stage?: 'upcoming' | 'past' | 'cancelled',
        page: number = 1,
    ) =>
        ApiClient.get<ApiResponse<Reservation[]>>('owner/reservations', {
            stage,
            page,
        }),
    getReservation: (reference: string) =>
        ApiClient.get<ApiResponse<Reservation>>(
            `owner/reservations/${reference}`,
        ),
    allocateRoom: (reference: string, physicalRoomId: number) =>
        ApiClient.post<ApiResponse<Reservation>>(
            `owner/reservations/${reference}/allocate`,
            { physical_room_id: physicalRoomId },
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

    // Guest Reviews Management
    getReviews: (params?: {
        property_id?: number;
        rating?: number;
        page?: number;
        status?: string;
    }) => ApiClient.get<ApiResponse<OwnerReview[]>>('owner/reviews', params),
    replyToReview: (id: number, responseText: string) =>
        ApiClient.post<ApiResponse<any>>(`owner/reviews/${id}/response`, {
            response: responseText,
        }),

    // Financial & Settlements
    getFinancialSummary: () =>
        ApiClient.get<ApiResponse<any>>('owner/financial/summary'),
    getSettlements: (page: number = 1) =>
        ApiClient.get<ApiResponse<any[]>>('owner/financial/settlements', {
            page,
        }),
    getSettlement: (reference: string) =>
        ApiClient.get<ApiResponse<SettlementDetail>>(
            `owner/settlements/${reference}`,
        ),
    getFinancialProfile: () =>
        ApiClient.get<ApiResponse<OwnerFinancialProfile>>(
            'owner/financial-profile',
        ),
    updateFinancialProfile: (data: {
        legal_business_name?: string;
        business_constitution?: string;
        pan?: string;
        gstin?: string;
        bank_account_number?: string;
        bank_ifsc?: string;
        bank_name?: string;
        bank_account_holder_name?: string;
    }) => ApiClient.put<ApiResponse<any>>('owner/financial-profile', data),
    getCommissionAgreements: () =>
        ApiClient.get<ApiResponse<OwnerCommissionAgreement[]>>(
            'owner/commission-agreements',
        ),
    acceptCommissionAgreement: (id: number) =>
        ApiClient.post<ApiResponse<any>>(
            `owner/commission-agreements/${id}/accept`,
        ),

    // Support & Customer Protection Cases
    getCases: (params?: { status?: string; search?: string; page?: number }) =>
        ApiClient.get<ApiResponse<OwnerCase[]>>('owner/cases', params),
    getCase: (reference: string) =>
        ApiClient.get<ApiResponse<OwnerCase>>(`owner/cases/${reference}`),
    addCaseMessage: (reference: string, message: string) =>
        ApiClient.post<ApiResponse<CaseMessage>>(
            `owner/cases/${reference}/messages`,
            { message },
        ),

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
        ApiClient.delete<ApiResponse<null>>('owner/devices/unregister', {
            device_installation_id: deviceInstallationId,
        }),
};
