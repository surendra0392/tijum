import { CanonicalCategorySlug } from '../constants/categories';

export * from '../constants/categories';

export interface ApiResponse<T> {
    data: T;
    message?: string;
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
        slug: CanonicalCategorySlug | string;
        code?: string;
    } | null;
    city: { id: number; name: string; slug: string } | null;
    locality: string;
    address_line: string;
    latitude?: number | null;
    longitude?: number | null;
    distance_km?: number | null;
    distance_label?: string | null;
    is_locality_match?: boolean | null;
    gender_eligibility?: string;
    starting_price_daily_paise?: number | null;
    starting_price_weekly_paise?: number | null;
    starting_price_monthly_paise: number;
    rating_average: number;
    reviews_count: number;
    cover_image_url: string;
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
    included_meals_label: string;
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
    landmark?: string | null;
    pincode?: string;
    address_line1?: string;
    google_maps_url?: string | null;
    status?: string;
    check_in_time?: string;
    check_out_time?: string;
    breakfast_timing?: string;
    lunch_timing?: string;
    dinner_timing?: string;
    meals_description?: string;
    rating?: number;
    reviews?: any[];
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
    is_active: boolean;
    is_occupied?: boolean;
    current_allocation?: {
        reservation_id: number;
        guest_name?: string;
        check_out_date?: string;
    } | null;
    room_type_name?: string;
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

export interface Reservation {
    id: number;
    booking_reference: string;
    reference?: string;
    status:
        | 'awaiting_payment'
        | 'confirmed'
        | 'cancelled'
        | 'expired'
        | 'completed'
        | 'payment_pending'
        | 'checked_in'
        | 'checked_out';
    status_label: string;
    status_semantic?: string;
    is_cancellable: boolean;
    is_awaiting_payment: boolean;
    is_confirmed?: boolean;
    is_cancelled?: boolean;
    is_expired?: boolean;
    checked_in_at?: string | null;
    checked_out_at?: string | null;
    check_in_date: string;
    check_out_date: string;
    duration_type: 'daily' | 'weekly' | 'monthly';
    duration_quantity: number;
    total_stay_days?: number;
    quantity: number;
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
    owner_payable_paise?: number;
    property_id?: number;
    property_room_type_id?: number;
    physical_room_id?: number | null;
    physical_room?: PhysicalRoom | null;
    allocated_room_number?: string | null;
    allocated_floor?: string | number | null;
    is_reviewed?: boolean;
    review?: {
        id?: number;
        overall_rating?: number;
        rating?: number;
        title?: string;
        content?: string;
        created_at?: string;
    } | null;
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
    city_slug: string;
    formatted_address: string;
    lat: number;
    lng: number;
    provider: string;
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
    title: string;
    body: string;
    message?: string;
    action_url?: string;
    is_read: boolean;
    read_at?: string;
    created_at: string;
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
        pending_requests: number;
        confirmed_stays: number;
        upcoming_checkins_7_days: number;
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
    status: 'registered' | 'booking_created' | 'stay_completed' | 'rewarded';
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
    min_subtotal_paise: number;
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
