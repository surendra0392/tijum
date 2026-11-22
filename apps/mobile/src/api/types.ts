import type { CanonicalCategorySlug } from '../constants/categories.ts';

export * from '../constants/categories.ts';

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    error_code?: string;
    meta?: {
        request_id?: string;
        timestamp?: string;
        current_page?: number;
        last_page?: number;
        per_page?: number;
        total?: number;
    };
}

export interface City {
    id: number;
    name: string;
    slug: string;
    state: string;
    is_active: boolean;
    property_count: number;
    discovery_url?: string;
}

export interface PropertyCard {
    id: number;
    name: string;
    slug: string;
    category: {
        id: number;
        name: string;
        slug: string;
        code?: string;
    } | null;
    city: { id: number; name: string; slug: string } | null;
    locality: string | null;
    address_line: string | null;
    latitude?: number | null;
    longitude?: number | null;
    has_coordinates?: boolean;
    location_precision?: 'exact' | 'area_only';
    distance_km?: number | null;
    distance_label?: string | null;
    is_locality_match?: boolean | null;
    gender_eligibility?: string;
    starting_price_daily_paise?: number | null;
    starting_price_weekly_paise?: number | null;
    starting_price_monthly_paise: number | null;
    rating_average: number;
    reviews_count: number;
    cover_image_url: string | null;
    food_provided: boolean;
    breakfast_included: boolean;
    lunch_included: boolean;
    dinner_included: boolean;
    food_inclusions?: {
        provided: boolean;
        breakfast: boolean;
        lunch: boolean;
        dinner: boolean;
        breakfast_timing?: string;
        lunch_timing?: string;
        dinner_timing?: string;
    };
    included_meals: string[];
    included_meals_label: string | null;
    is_verified: boolean;
    booking_eligible: boolean;
}

export interface RoomType {
    id: number;
    name: string;
    code?: string;
    accommodation_mode: 'shared' | 'private';
    accommodation_mode_label?: string;
    sharing_type?: string;
    sharing_label?: string;
    pricing_basis?: 'per_guest' | 'per_room';
    pricing_basis_label?: string;
    is_shared: boolean;
    gender_policy:
        | 'male_only'
        | 'female_only'
        | 'all_genders'
        | 'not_applicable';
    gender_policy_label?: string;
    preferred_guest_gender?: 'male' | 'female' | 'mixed';
    preferred_guest_gender_label?: string;
    strict_gender_preference?: boolean;
    allowed_guest_genders?: Array<{
        value: 'male' | 'female' | 'mixed';
        label: string;
    }>;
    allowed_guest_compositions?: Array<{ value: string; label: string }>;
    default_guest_composition?: string;
    guest_composition_policy?: string[];
    max_guests_per_room: number;
    sharing_capacity: number;
    capacity_per_room?: number;
    is_air_conditioned: boolean;
    is_active?: boolean;
    is_operational?: boolean;
    price_daily_paise: number;
    price_weekly_paise: number;
    price_monthly_paise: number;
    security_deposit_paise?: number;
    deposit_paise?: number;
    available_rooms_count?: number;
    early_check_in_enabled: boolean;
    total_rooms: number;
}

export interface PropertyDetail extends PropertyCard {
    description: string;
    city_id?: number;
    property_category_id?: number;
    contact_person_name?: string;
    contact_phone?: string;
    contact_email?: string | null;
    landmark?: string | null;
    pincode?: string;
    postal_code?: string;
    address_line1?: string;
    address_line_1?: string;
    address_line_2?: string | null;
    google_maps_url?: string | null;
    status?: string;
    verification_status?: string;
    is_amendment_pending?: boolean;
    missing_requirements?: string[];
    decision_reason?: string | null;
    requested_changes?: string | null;
    check_in_time?: string;
    check_out_time?: string;
    breakfast_timing?: string;
    lunch_timing?: string;
    dinner_timing?: string;
    meals_description?: string;
    rating?: number;
    reviews?: Array<{
        id: number;
        overall_rating: number;
        cleanliness_rating?: number | null;
        food_quality_rating?: number | null;
        communication_rating?: number | null;
        value_rating?: number | null;
        customer_display_name?: string;
        customer_name?: string;
        title?: string | null;
        content?: string | null;
        verified_booking?: boolean;
        published_at?: string | null;
        created_at?: string | null;
        owner_reply?: string | null;
        owner_reply_at?: string | null;
    }>;
    gallery: Array<{
        id: number;
        url: string;
        caption?: string;
        is_primary?: boolean;
    }>;
    amenities: Array<{
        id: number;
        name: string;
        code?: string;
        category?: string;
        icon?: string;
        icon_key?: string;
    }>;
    room_types: RoomType[];
    timing?: {
        timezone?: string;
        standard_check_in_time?: string;
        standard_check_out_time?: string;
        check_in_time?: string;
        checkout_time?: string;
        earliest_arrival_time?: string;
        earliest_early_check_in_time?: string;
        policy_notice?: string;
    };
}

export interface PhysicalRoom {
    id: number;
    property_id: number;
    property_room_type_id: number;
    room_number: string;
    floor?: string | number | null;
    floor_number?: string | null;
    wing_name?: string | null;
    building_name?: string | null;
    operational_status?: string;
    operational_status_label?: string;
    internal_description?: string | null;
    is_active: boolean;
    is_occupied?: boolean;
    current_allocation?: {
        reservation_id: number;
        guest_name?: string;
        check_out_date?: string;
    } | null;
    room_type_name?: string;
    room_type?: { id: number; name: string } | null;
}

export interface OwnerReview {
    id: number;
    property_id: number;
    property_name: string;
    customer_display_name?: string;
    guest_name?: string;
    overall_rating: number;
    cleanliness_rating?: number;
    food_quality_rating?: number;
    communication_rating?: number;
    value_rating?: number;
    title?: string | null;
    content?: string | null;
    created_at?: string;
    submitted_at?: string;
    verified_booking?: boolean;
    stay_dates?: {
        check_in_date: string;
        checkout_date: string;
    };
    response?: {
        id?: number;
        response_text: string;
        status: string;
        submitted_at?: string;
        published_at?: string | null;
    } | null;
}

export interface ReservationPaymentSummary {
    id: number;
    gateway: string;
    gateway_order_id?: string | null;
    gateway_payment_id?: string | null;
    status: string;
    status_label?: string;
    amount_minor: number;
    refunded_amount_minor?: number;
    refundable_balance_minor?: number;
    currency_code?: string;
    payment_method?: string | null;
    captured_at?: string | null;
    failed_at?: string | null;
    failure_reason?: string | null;
    created_at?: string | null;
}

export interface ReviewEligibility {
    is_eligible: boolean;
    reason: string;
    days_remaining?: number | null;
    window_deadline?: string | null;
}

export interface Reservation {
    id: number;
    booking_reference: string;
    reference?: string;
    status: 'awaiting_payment' | 'confirmed' | 'cancelled' | 'expired';
    status_label: string;
    status_semantic?: string;
    is_cancellable: boolean;
    can_cancel?: boolean;
    can_pay?: boolean;
    is_awaiting_payment: boolean;
    is_payment_deadline_expired?: boolean;
    is_confirmed?: boolean;
    is_cancelled?: boolean;
    is_expired?: boolean;
    expired_at?: string | null;
    requires_refund_review?: boolean;
    has_captured_payment?: boolean;
    payment_status?: string | null;
    payment_status_label?: string | null;
    payment_summary?: ReservationPaymentSummary | null;
    is_checked_in?: boolean;
    is_checked_out?: boolean;
    checked_in_at?: string | null;
    checked_out_at?: string | null;
    check_in_date: string;
    check_out_date: string;
    duration_type: 'daily' | 'weekly' | 'monthly';
    duration_quantity: number;
    total_stay_days?: number;
    quantity: number;
    quantity_basis?: 'guest_places' | 'private_rooms';
    guest_count: number;
    original_amount_paise?: number;
    total_amount_paise: number;
    coupon_code?: string | null;
    coupon_discount_paise?: number;
    points_redeemed?: number;
    points_discount_paise?: number;
    points_awarded_potential?: number;
    base_amount_paise?: number;
    tax_amount_paise?: number;
    deposit_amount_paise?: number;
    guest_composition?: string;
    guest_composition_label?: string;
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
    currency_code: string;
    early_check_in_requested?: boolean;
    requested_arrival_time?: string | null;
    cancellation_reason?: string | null;
    payment_deadline_at?: string;
    payment_window_expires_at?: string;
    owner_decision_deadline_at?: string;
    confirmed_at?: string;
    cancelled_at?: string;
    created_at: string;
    property_name?: string;
    room_type_name?: string;
    customer_name?: string;
    guest_gender?: string;
    commission_amount_paise?: number;
    commission_tax_paise?: number;
    owner_payable_paise?: number;
    property_id?: number;
    property_room_type_id?: number;
    physical_room_id?: number | null;
    physical_room?: PhysicalRoom | null;
    is_allocated?: boolean;
    primary_room_number?: string | null;
    allocated_room_number?: string | null;
    allocated_floor?: string | number | null;
    allocations?: Array<{
        id: number;
        property_room_id: number;
        room_number: string;
        floor_number?: string | number | null;
        allocated_quantity: number;
    }>;
    is_reviewed?: boolean;
    review?: {
        id?: number;
        overall_rating?: number;
        rating?: number;
        title?: string | null;
        content?: string | null;
        status?: string;
        status_label?: string;
        submitted_at?: string | null;
        published_at?: string | null;
        created_at?: string;
    } | null;
    review_eligibility?: ReviewEligibility | null;
    check_in_time?: string;
    check_out_time?: string;
    food_inclusions?: {
        provided: boolean;
        breakfast: boolean;
        lunch: boolean;
        dinner: boolean;
        breakfast_timing?: string;
        lunch_timing?: string;
        dinner_timing?: string;
    };
    property: {
        id: number;
        name: string;
        slug: string;
        locality: string;
        city?: string;
        address?: string;
        latitude?: number | null;
        longitude?: number | null;
        has_coordinates?: boolean;
        location_precision?: 'exact' | 'area_only';
        cover_image_url?: string;
        food_provided?: boolean;
        breakfast_included?: boolean;
        lunch_included?: boolean;
        dinner_included?: boolean;
    };
    room_type: {
        id: number;
        name: string;
        accommodation_mode: string;
        is_air_conditioned: boolean;
    };
    timing?: {
        timezone?: string;
        standard_check_in_time?: string;
        standard_check_out_time?: string;
        check_in_time?: string;
        checkout_time?: string;
        earliest_arrival_time?: string;
    };
    refunds?: RefundItem[];
}

export interface RefundItem {
    id: number;
    amount_minor: number;
    status: string;
    status_label?: string;
    utr?: string | null;
    gateway_processed_at?: string | null;
    created_at: string;
}

export interface LocationPrediction {
    id: string;
    name: string;
    display: string;
    city: string;
    city_name: string;
    locality: string;
    lat: number;
    lng: number;
    source: string;
}

export interface ReverseGeocodeResult {
    display: string;
    locality: string;
    city: string;
    city_slug: string | null;
    formatted_address: string;
    lat: number;
    lng: number;
    provider: string;
    location_available?: boolean;
}

export interface ContactFieldValidation {
    valid: boolean;
    message: string;
    normalized?: string;
}

export interface GuestContactValidationResult {
    phone?: ContactFieldValidation;
    email?: ContactFieldValidation;
    name?: ContactFieldValidation;
}

export interface StayQuoteResponse {
    quote: {
        check_in_date: string;
        check_out_date: string;
        duration_type: 'daily' | 'weekly' | 'monthly';
        duration_quantity: number;
        total_stay_days: number;
        quantity: number;
        quantity_basis: string;
        quantity_basis_label: string;
        guest_count: number;
        unit_rate_minor: number;
        rate_unit: string;
        rate_unit_label: string;
        total_amount_minor: number;
        currency_code: string;
        early_check_in_allowed: boolean;
        allowed_guest_genders: Array<{
            value: 'male' | 'female' | 'mixed';
            label: string;
        }>;
        preferred_guest_gender: 'male' | 'female' | 'mixed';
        preferred_guest_gender_label: string;
        strict_gender_preference: boolean;
        allowed_guest_compositions: Array<{ value: string; label: string }>;
        default_guest_composition: string;
        timing: Record<string, any>;
    };
    availability: {
        available: boolean;
        minimum_remaining: number;
    };
    property: {
        id: number;
        name: string;
        slug: string;
        locality?: string;
        city?: string;
        category?: string;
        food_provided: boolean;
        breakfast_included: boolean;
        lunch_included: boolean;
        dinner_included: boolean;
    };
    room_type: {
        id: number;
        name: string;
        accommodation_mode: 'shared' | 'private';
        sharing_label: string;
        is_air_conditioned: boolean;
        gender_policy: string;
        early_check_in_enabled: boolean;
    };
    booking_options: {
        booking_for_options: Array<{
            value: 'self' | 'other';
            label: string;
        }>;
        contact_phone_digits: number;
    };
}

export interface CustomerProfile {
    id: number;
    name: string;
    email: string;
    phone?: string;
    email_verified: boolean;
    phone_verified: boolean;
    two_factor_enabled?: boolean;
    terms_accepted?: boolean;
    marketing_consent: boolean;
    account_type: 'customer';
    created_at: string;
}

export interface ContactConfig {
    phone: string;
    whatsapp: string;
    whatsapp_raw?: string;
    email: string;
    partners_email?: string;
    hours: string;
    address: string;
}

export interface SocialConfig {
    facebook: { username: string; url: string };
    instagram: { username: string; url: string };
    whatsapp: { number: string; url: string };
}

export interface PublicConfig {
    app_name: string;
    currency: {
        code: string;
        symbol: string;
        minor_unit: number;
    };
    launch_cities: City[];
    categories: any[];
    timing_policy: any;
    stay_timing_policy: {
        check_in_time: string;
        check_out_time: string;
        description: string;
    };
    payment_gateways: {
        primary: string;
        supported: string[];
    };
    support: {
        email: string;
        phone: string;
        whatsapp?: string;
        whatsapp_url?: string;
        help_url: string;
    };
    contact: ContactConfig;
    social: SocialConfig;
}

export interface OwnerProfile {
    id: number;
    name: string;
    email: string;
    phone?: string;
    business_name?: string;
    status: string;
    status_label: string;
    is_verified: boolean;
    can_sign_in: boolean;
    account_type: 'partner';
    created_at: string;
}

export interface NotificationItem {
    id: number;
    event_id: string;
    category: string;
    channel: string;
    template_code: string;
    related_reference?: string | null;
    title: string;
    body: string;
    message?: string;
    action_url?: string;
    is_read: boolean;
    read_at?: string;
    created_at: string;
}

export interface NotificationPreferences {
    in_app_operational?: boolean;
    email_operational?: boolean;
    push_operational?: boolean;
    sms_operational?: boolean;
    whatsapp_opted_in?: boolean;
    channels_available?: {
        in_app: boolean;
        email: boolean;
        push: boolean;
        sms: boolean;
        whatsapp: boolean;
    };
}

export interface MobileSessionToken {
    id: number;
    name: string;
    last_used_at?: string | null;
    created_at: string;
    is_current?: boolean;
}

export interface CustomerCaseSummary {
    id: number;
    case_reference: string;
    category: string;
    category_label?: string;
    status: string;
    status_label?: string;
    priority: string;
    property_name?: string | null;
    booking_reference?: string | null;
    description?: string | null;
    resolution_summary?: string | null;
    first_action_due_at?: string | null;
    first_action_target_hours?: number | null;
    acknowledgement_due_at?: string | null;
    resolution_due_at?: string | null;
    sla_due_at?: string | null;
    created_at: string;
}

export interface SupportTicketSummary {
    id: number;
    ticket_reference: string;
    subject: string;
    category: string;
    status: string;
    status_label: string;
    priority: string;
    priority_label: string;
    booking_reference?: string | null;
    property_name?: string | null;
    created_at: string;
    last_reply_at?: string | null;
}

export interface SupportTicketDetail extends SupportTicketSummary {
    message: string;
    sla_due_at?: string | null;
    resolved_at?: string | null;
    resolution_summary?: string | null;
    closed_at?: string | null;
}

export interface SupportTicketMessage {
    id: number;
    sender_type: string;
    sender_name: string;
    message: string;
    created_at: string;
}

export interface SupportTicketIndexData {
    tickets: SupportTicketSummary[];
    categories: Array<{ value: string; label: string }>;
    reservations: Array<{
        id: number;
        booking_reference: string;
        property_name: string;
    }>;
}

export interface PartnerDashboardData {
    partner_profile: {
        name: string;
        email: string;
        status: string;
        status_label: string;
        is_verified: boolean;
    };
    statistics: {
        total_properties: number;
        active_properties: number;
        awaiting_payment: number;
        confirmed_stays: number;
        upcoming_checkins_7_days: number;
        today_arrivals: number;
        today_departures: number;
        in_house_guests: number;
        active_reservations: number;
        pending_reviews: number;
        open_complaints: number;
        unsettled_payout_paise: number;
    };
    property_summary: {
        properties_total: number;
        verified_properties: number;
        room_types_total: number;
        rooms_total: number;
    };
    onboarding: {
        email_verified: boolean;
        account_status: string;
        account_status_label: string;
        can_publish_properties: boolean;
    };
    pending_reservations_count?: number;
    confirmed_reservations_count?: number;
    properties_count?: number;
    monthly_earnings_paise?: number;
    recent_reservations: Reservation[];
}

export interface PaymentOrderPayload {
    order_id: string;
    amount_minor: number;
    currency: string;
    key_id: string;
    business_name: string;
    description: string;
    booking_reference: string;
    payment_deadline_at: string;
}

// Rewards, Loyalty & Promotion Types
export interface PointsWallet {
    available_points: number;
    pending_points: number;
    reserved_points: number;
    redeemed_points: number;
    expired_points: number;
    total_earned_points: number;
    point_to_inr_rate: number;
    estimated_inr_value: number;
}

export interface PointsLedgerItem {
    id: number;
    transaction_type:
        | 'earned_stay'
        | 'referral_bonus'
        | 'redeemed_booking'
        | 'admin_adjustment'
        | 'expired'
        | 'reversed';
    transaction_type_label: string;
    points: number;
    direction: 'credit' | 'debit';
    status: 'available' | 'pending' | 'reserved' | 'completed' | 'cancelled';
    description: string;
    booking_reference?: string;
    created_at: string;
    expires_at?: string;
}

export interface ReferralProfile {
    referral_code: string;
    referral_link: string;
    referrer_reward_points: number;
    referee_reward_points: number;
    total_referrals_count: number;
    completed_referrals_count: number;
    pending_referrals_count: number;
    total_points_earned: number;
    pending_points_expected: number;
}

export interface ReferralItem {
    id: number;
    referred_customer_name: string;
    status:
        | 'pending_registration'
        | 'registered'
        | 'booking_created'
        | 'stay_completed'
        | 'qualified'
        | 'reward_credited'
        | 'rewarded'
        | 'cancelled';
    status_label: string;
    points_reward: number;
    created_at: string;
    completed_at?: string;
}

export interface CouponItem {
    id: number;
    code: string;
    title: string;
    description: string;
    offer_type: 'fixed_amount' | 'percentage' | 'points_reward' | 'combined';
    discount_amount_paise?: number;
    discount_percentage?: number;
    points_reward?: number;
    bonus_points?: number;
    min_subtotal_paise: number;
    min_booking_amount_paise?: number;
    max_discount_paise?: number;
    funding_source: 'platform' | 'property' | 'split';
    expires_at: string;
    is_eligible?: boolean;
    ineligibility_reason?: string;
    applicable_category?: string;
}

export interface PromotionQuoteResult {
    subtotal_paise: number;
    coupon_applied?: {
        code: string;
        offer_type: string;
        discount_amount_paise: number;
        points_awarded?: number;
    } | null;
    coupon_discount_paise: number;
    tax_amount_paise: number;
    deposit_amount_paise: number;
    points_redeemed: number;
    points_discount_paise: number;
    final_payable_paise: number;
    points_to_earn_on_completion: number;
}

// ==========================================
// Phase M10A: Owner Property Operations Types
// ==========================================

export interface OwnerReferenceData {
    cities: City[];
    categories: Array<{
        id: number;
        name: string;
        slug: string;
        code?: string;
        description?: string;
    }>;
    canonical_categories: Array<{
        slug: CanonicalCategorySlug;
        name: string;
    }>;
    room_type_modes: Array<{ value: string; label: string }>;
    gender_policies: Array<{ value: string; label: string }>;
    guest_compositions: Array<{ value: string; label: string }>;
    room_operational_statuses: Array<{ value: string; label: string }>;
    block_scopes: Array<{ value: string; label: string }>;
    block_types: Array<{ value: string; label: string }>;
    amenities: Array<{
        id: number;
        name: string;
        code: string;
        category?: string;
        icon_key?: string;
    }>;
}

export interface PropertyPricingData {
    property_id: number;
    property_name: string;
    food: {
        provided: boolean;
        breakfast: boolean;
        lunch: boolean;
        dinner: boolean;
    };
    room_types: Array<{
        id: number;
        name: string;
        accommodation_mode: 'shared' | 'private';
        accommodation_mode_label?: string;
        pricing_basis: 'per_guest' | 'per_room';
        max_guests_per_room: number;
        sharing_capacity: number;
        is_air_conditioned: boolean;
        is_active: boolean;
        daily_rate_minor?: number | null;
        weekly_rate_minor?: number | null;
        monthly_rate_minor?: number | null;
    }>;
    evaluation: {
        active_room_types_count: number;
        configured_room_types_count: number;
        missing_pricing_count: number;
        has_food_configuration: boolean;
    };
    currency_code: string;
}

export interface PropertyAvailabilityBlock {
    id: number;
    property_id: number;
    scope: 'property' | 'room_type' | 'room';
    scope_label: string;
    block_type: 'closure' | 'maintenance' | 'stop_sell';
    block_type_label: string;
    status: 'active' | 'cancelled' | 'expired';
    status_label?: string;
    is_active: boolean;
    start_date: string;
    end_date: string;
    property_room_type_id?: number | null;
    room_type_name?: string | null;
    property_room_id?: number | null;
    room_number?: string | null;
    reason: string;
    is_admin_restriction: boolean;
    created_at?: string;
}

export interface PropertyVerificationEvaluation {
    property_id: number;
    property_reference: string;
    status: string;
    is_verified: boolean;
    booking_eligible: boolean;
    application?: {
        id: number;
        status: string;
        status_label: string;
        is_editable: boolean;
        revision_number: number;
        submitted_at?: string | null;
        rejection_reasons?: string[] | null;
    } | null;
    evaluation: {
        is_ready_for_review: boolean;
        owner_active: boolean;
        identity_complete: boolean;
        has_active_room_types: boolean;
        has_active_rooms: boolean;
        has_min_photos: boolean;
        has_cover_photo: boolean;
        blocking_reasons?: string[];
    };
}

export interface PropertyMediaItem {
    id: number;
    url: string;
    alt_text: string;
    category: string;
    media_category?: string;
    category_label?: string;
    media_type?: string;
    is_cover: boolean;
    moderation_status?: string;
    publication_status?: string;
    property_room_type_id?: number | null;
    room_type_name?: string | null;
    room_type?: { id: number; name: string } | null;
    property_room_id?: number | null;
    room_number?: string | null;
    physical_room?: { id: number; room_number: string } | null;
}

export interface OwnerPropertyAmenity {
    id: number;
    amenity_id: number;
    name: string;
    code: string;
    category: string;
    icon_key?: string;
    availability: 'included' | 'not_available';
    status: string;
    moderation_status?: string;
    is_current: boolean;
    is_customer_visible: boolean;
    details?: string | null;
}

export interface AmenityCatalogItem {
    id: number;
    name: string;
    code: string;
    icon_key?: string;
}

export interface AmenityCatalogCategory {
    id: number;
    name: string;
    amenities: AmenityCatalogItem[];
}

export interface PropertyVerificationDocumentItem {
    id: number;
    document_type: string;
    document_type_label?: string;
    original_filename: string;
    status: string;
    verification_status?: string;
    status_label?: string;
    rejection_reason?: string | null;
    uploaded_at?: string | null;
}

export interface PropertyVerificationChecklistItem {
    document_type: string;
    label: string;
    required: boolean;
    fulfilled: boolean;
}

export interface PropertyVerificationDocumentsResponse {
    documents: PropertyVerificationDocumentItem[];
    checklist: PropertyVerificationChecklistItem[];
    required_types?: Array<string | { type: string; label: string }>;
}

export interface OwnerFinancialProfile {
    legal_business_name: string | null;
    business_constitution: string | null;
    pan_number?: string | null;
    pan?: string | null;
    gst_registered?: boolean;
    gstin: string | null;
    supplier_legal_classification?: string | null;
    bank_beneficiary_name?: string | null;
    bank_account_number?: string | null;
    bank_account_number_masked?: string | null;
    bank_account_masked: string | null;
    bank_ifsc: string | null;
    bank_name: string | null;
    bank_account_holder_name: string | null;
    onboarding_status?: string;
    verification_status: string;
    is_eligible?: boolean;
    settlement_eligible: boolean;
    linked_account_status?: string | null;
    razorpay_account_id?: string | null;
    rejection_reason?: string | null;
    rejection_reasons?: string[] | null;
}

export interface OwnerCommissionAgreement {
    id: number;
    agreement_reference?: string;
    commission_rate_percentage: number;
    base_type: string;
    commission_base_label?: string;
    commission_type_label?: string;
    gst_treatment: string;
    commission_gst_label?: string;
    gst_mode_label?: string;
    property_name?: string | null;
    terms_version: string;
    effective_from: string;
    effective_until?: string | null;
    effective_to?: string | null;
    status: string;
    status_label?: string;
    is_pending_acceptance?: boolean;
    terms_hash?: string | null;
    accepted_by_owner_id?: number | null;
    accepted_at?: string | null;
}

export interface FinancialSummaryData {
    total_settled_paise: number;
    pending_settlement_paise: number;
    on_hold_paise?: number;
    settled_count?: number;
    pending_count?: number;
    settlements?: {
        total_settled_amount_minor?: number;
        pending_settlement_amount_minor?: number;
    };
}

export interface SettlementLineItem {
    id: number;
    booking_reference: string;
    reservation_id?: number | null;
    guest_name: string;
    property_name?: string | null;
    check_in_date: string;
    check_out_date: string;
    gross_minor: number;
    commission_minor: number;
    net_minor: number;
    tax_deduction_minor?: number;
    statutory_deductions_minor?: number;
    net_payable_minor?: number;
    net_settlement_amount_minor?: number;
    gross_amount_minor?: number;
    gross_booking_value_minor?: number;
    commission_amount_minor?: number;
    stay_dates?: string;
}

export type OwnerPropertySummary = PropertyDetail;
export type OwnerVerificationDocument = PropertyVerificationDocumentItem;
export type PropertyCategory = { id: number; name: string; slug: string };
export type PropertyCategorySlug = CanonicalCategorySlug;
export type OwnerPropertyMedia = PropertyMediaItem;
export type OwnerRoomType = RoomType;
export type OwnerPhysicalRoom = PhysicalRoom;
export type OwnerFinancialSummary = FinancialSummaryData;
export type PropertyMediaCategory = string;
export interface OwnerPropertyMediaSummary {
    total_count: number;
    approved_count: number;
    pending_count: number;
    has_cover: boolean;
}

export interface SettlementDetail {
    id: number;
    settlement_reference: string;
    period_start: string;
    period_end: string;
    gross_amount_minor: number;
    commission_amount_minor: number;
    commission_tax_amount_minor: number;
    tds_amount_minor: number;
    deductions_amount_minor: number;
    net_payable_minor: number;
    status: string;
    status_label?: string;
    payment_reference?: string | null;
    provider_transfer_id?: string | null;
    settled_at?: string | null;
    net_settlement_amount_minor?: number;
    gross_booking_value_minor?: number;
    statutory_deductions_minor?: number;
    refund_adjustments_minor?: number;
    relocation_adjustments_minor?: number;
    other_adjustments_minor?: number;
    failure_reason?: string | null;
    hold_reason?: string | null;
    provider_status?: string | null;
    provider_transfer_status?: string | null;
    items?: SettlementLineItem[];
    line_items?: SettlementLineItem[];
}

export interface CaseMessage {
    id: number;
    sender_name: string;
    sender_type?: 'customer' | 'owner' | 'admin';
    sender_role?: string;
    message: string;
    attachment_url?: string | null;
    created_at: string;
    is_owner?: boolean;
}

export interface OwnerCase {
    id: number;
    case_reference: string;
    title?: string;
    category?: string;
    category_label?: string;
    type?: string;
    status: string;
    status_label?: string;
    priority: string;
    priority_label?: string;
    booking_reference?: string | null;
    customer_name?: string | null;
    guest_name?: string | null;
    property_id?: number | null;
    property_name?: string | null;
    stay_dates?: string | null;
    description?: string | null;
    messages_count?: number;
    created_at: string;
    updated_at: string;
    resolution_summary?: string | null;
    resolution?: string | null;
    sla_due_at?: string | null;
    first_action_due_at?: string | null;
    first_action_target_hours?: number | null;
    acknowledgement_due_at?: string | null;
    resolution_due_at?: string | null;
    is_sla_breached?: boolean;
    messages?: CaseMessage[];
}
