import type { SemanticStatus } from '@/components/shared/status-badge';
import type { PaymentStatus, PaymentSummary, RefundSummary } from './payments';
import type { StayTimingData } from './public-search';

export type ReservationStatus =
    | 'awaiting_payment'
    | 'confirmed'
    | 'cancelled'
    | 'expired';

export type ReservationStatusOption = {
    value: ReservationStatus;
    label: string;
};

export type ReservationPaginationMeta = {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

export type ReservationSummary = {
    booking_reference: string;
    status: ReservationStatus;
    status_label: string;
    status_semantic: SemanticStatus;
    payment_status?: PaymentStatus | null;
    payment_status_label?: string | null;
    payment_deadline_at?: string | null;
    requires_refund_review?: boolean;
    property_name: string;
    room_type_name: string;
    contact_name?: string | null;
    contact_email?: string | null;
    contact_phone?: string | null;
    guest_gender?: string | null;
    guest_composition?: string | null;
    quantity: number;
    quantity_basis: 'guest_places' | 'private_rooms';
    quantity_basis_label: string;
    guest_count: number;
    check_in_date: string;
    checkout_date: string;
    duration_label: string;
    total_amount_minor: number;
    currency_code: string;
    early_check_in_requested: boolean;
    requested_arrival_time: string | null;
    is_checked_in?: boolean;
    checked_in_at?: string | null;
    checked_in_by_type?: string | null;
    check_in_notes?: string | null;
    is_checked_out?: boolean;
    checked_out_at?: string | null;
    checked_out_by_type?: string | null;
    checkout_notes?: string | null;
    allocated_quantity?: number;
    allocated_rooms?: string[];
    room_history?: ReservationRoomHistoryEntry[];
    created_at: string;
};

export type ReservationAllocation = {
    property_room_id: number;
    room_number: string;
    floor_number?: string | null;
    allocated_quantity: number;
    allocated_at?: string | null;
};

export type ReservationRoomHistoryEntry = {
    property_room_id: number;
    room_number: string;
    floor_number?: string | null;
    allocated_quantity: number;
    status: 'active' | 'changed' | 'checked_out' | 'released';
    status_label: string;
    action: 'initial_allocation' | 'room_changed' | 'quantity_updated';
    previous_rooms: string[];
    replaced_by_rooms: string[];
    allocated_at?: string | null;
    released_at?: string | null;
};

export type ReservationAvailableRoom = {
    id: number;
    room_number: string;
    floor_number: string | null;
    allocated_quantity: number;
    available_quantity: number;
};

export type ReservationDetail = ReservationSummary & {
    property_id?: number;
    owner_id?: number;
    property_locality: string;
    property_category: string;
    owner_name?: string;
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
    room_type_ac_label: string;
    sharing_label: string;
    contact_name: string;
    contact_email: string;
    contact_phone: string;
    guest_gender: string;
    guest_composition: string;
    unit_rate_minor: number;
    rate_unit_label: string;
    duration_type: 'daily' | 'weekly' | 'monthly';
    duration_quantity: number;
    total_stay_days: number;
    breakfast_included: boolean;
    lunch_included: boolean;
    dinner_included: boolean;
    standard_check_in_time: string;
    standard_check_out_time: string;
    timezone: string;
    submitted_at: string;
    payment_deadline_at?: string | null;
    expired_at?: string | null;
    confirmed_at: string | null;
    cancelled_at: string | null;
    cancellation_reason: string | null;
    requires_refund_review?: boolean;
    can_cancel: boolean;
    can_allocate: boolean;
    can_pay?: boolean;
    can_view_receipt?: boolean;
    can_refund?: boolean;
    id?: number;
    stay_duration_summary?: string;
    cases?: Array<{
        id: number;
        case_reference: string;
        category_label: string;
        status: string;
        status_label: string;
    }>;
    active_relocation?: {
        id: number;
        status: string;
        destination_property_name: string;
        destination_room_type_name: string;
    } | null;
    is_relocated_replacement?: boolean;
    cancellation_policy?: {
        id: number;
        name: string;
        version: string;
        description: string;
        rules: Record<string, any>;
    } | null;
    review?: {
        id: number;
        overall_rating: number;
        cleanliness_rating?: number | null;
        food_quality_rating?: number | null;
        communication_rating?: number | null;
        value_rating?: number | null;
        title?: string | null;
        content?: string | null;
        status: string;
        status_label: string;
        can_be_edited?: boolean;
        submitted_at?: string | null;
        published_at?: string | null;
    } | null;
    review_eligibility?: {
        is_eligible: boolean;
        reason: string;
        days_remaining?: number | null;
        window_deadline?: string | null;
    };
    payment_summary?: PaymentSummary | null;
    refunds?: RefundSummary[];
    allocations?: ReservationAllocation[];
    available_rooms?: ReservationAvailableRoom[];
    allocated_quantity?: number;
    remaining_quantity?: number;
};

export type ReservationListPayload = {
    data: ReservationSummary[];
    meta: ReservationPaginationMeta;
};

export type ReservationPropertyOption = {
    id: number;
    name: string;
};

export type ReservationQuote = {
    property_id: number;
    property_slug: string;
    property_name: string;
    property_locality: string;
    property_category: string;
    room_type_id: number;
    room_type_name: string;
    room_type_ac_label: string;
    sharing_label: string;
    room_type_amenities: Array<{ id: number; name: string }>;
    check_in_date: string;
    checkout_date: string;
    duration_type: 'daily' | 'weekly' | 'monthly';
    duration_quantity: number;
    duration_label: string;
    total_stay_days: number;
    quantity: number;
    quantity_basis: 'guest_places' | 'private_rooms';
    quantity_basis_label: string;
    guest_count: number;
    available_quantity: number;
    unit_rate_minor: number;
    rate_unit: 'per_guest' | 'per_private_room';
    rate_unit_label: string;
    total_amount_minor: number;
    currency_code: string;
    breakfast_included: boolean;
    lunch_included: boolean;
    dinner_included: boolean;
    early_check_in_allowed: boolean;
    allowed_guest_genders: Array<{ value: string; label: string }>;
    preferred_guest_gender?: string;
    preferred_guest_gender_label?: string;
    strict_gender_preference?: boolean;
    allowed_guest_compositions: Array<{ value: string; label: string }>;
    default_guest_composition?: string;
    timing: StayTimingData;
};

export type ReservationCustomerSnapshot = {
    name: string;
    email: string;
    phone: string | null;
};
