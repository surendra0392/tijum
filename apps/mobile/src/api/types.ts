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
    starting_price_monthly_paise: number;
    rating_average: number;
    reviews_count: number;
    cover_image_url: string;
    food_provided: boolean;
    breakfast_included: boolean;
    lunch_included: boolean;
    dinner_included: boolean;
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
    sharing_type?: string;
    is_shared: boolean;
    gender_policy:
        | 'male_only'
        | 'female_only'
        | 'all_genders'
        | 'not_applicable';
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
    pincode?: string;
    address_line1?: string;
    status?: string;
    check_in_time?: string;
    check_out_time?: string;
    breakfast_timing?: string;
    lunch_timing?: string;
    dinner_timing?: string;
    meals_description?: string;
    rating?: number;
    reviews?: any[];
    starting_price_daily_paise?: number;
    gallery: Array<{
        id: number;
        url: string;
        caption?: string;
        is_primary?: boolean;
    }>;
    amenities: Array<{
        id: number;
        name: string;
        category?: string;
        icon?: string;
    }>;
    room_types: RoomType[];
    timing?: {
        check_in_time: string;
        checkout_time: string;
        earliest_arrival_time: string;
        policy_notice: string;
    };
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
        | 'payment_pending';
    status_label: string;
    is_cancellable: boolean;
    is_awaiting_payment: boolean;
    check_in_date: string;
    check_out_date: string;
    duration_type: 'daily' | 'weekly' | 'monthly';
    duration_quantity: number;
    quantity: number;
    guest_count: number;
    total_amount_paise: number;
    base_amount_paise?: number;
    tax_amount_paise?: number;
    deposit_amount_paise?: number;
    guest_composition?: any;
    currency_code: string;
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
    check_in_time?: string;
    check_out_time?: string;
    food_inclusions?: any;
    property: {
        id: number;
        name: string;
        slug: string;
        locality: string;
        city?: string;
        address?: string;
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
        check_in_time: string;
        checkout_time: string;
        earliest_arrival_time: string;
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
