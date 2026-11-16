export type PointsTransactionType =
    | 'earned_booking'
    | 'earned_referral'
    | 'redeemed_booking'
    | 'expired'
    | 'manual_credit'
    | 'manual_debit'
    | 'reversal';

export type PointsTransactionStatus =
    | 'pending'
    | 'available'
    | 'redeemed'
    | 'expired'
    | 'cancelled';

export interface PointsLedgerEntry {
    id: number | string;
    transaction_type: PointsTransactionType;
    type?: string;
    type_label?: string;
    status: PointsTransactionStatus;
    points: number;
    inr_value_minor: number;
    description: string;
    reference_code?: string | null;
    reservation_id?: number | string | null;
    expires_at?: string | null;
    created_at: string;
}

export interface CustomerPointsWallet {
    available_points: number;
    pending_points: number;
    expiring_points_30d: number;
    total_earned_points: number;
    total_redeemed_points: number;
    estimated_inr_value: number;
    points_per_rupee: number;
    max_redemption_percentage: number;
}

export type ReferralStatus =
    | 'invited'
    | 'registered'
    | 'booked'
    | 'completed'
    | 'rewarded'
    | 'disqualified';

export interface CustomerReferralProfile {
    referral_code: string;
    share_url: string;
    total_invites: number;
    successful_referrals: number;
    points_earned: number;
    total_points_earned?: number;
    pending_points: number;
    referrer_reward_points: number;
    referred_reward_points: number;
}

export interface ReferralInvite {
    id: number | string;
    friend_name: string;
    friend_email_masked: string;
    status: ReferralStatus;
    points_awarded: number;
    created_at: string;
    stay_completed_at?: string | null;
}

export type CampaignType = 'coupon' | 'referral' | 'loyalty' | 'flash_sale';

export type RewardsCampaignStatus =
    | 'draft'
    | 'active'
    | 'paused'
    | 'expired'
    | 'depleted';

export type CouponOfferType =
    | 'percentage'
    | 'fixed_amount'
    | 'points_multiplier'
    | 'combined';

export type CouponFundingSource = 'platform' | 'property' | 'split';

export interface CouponCode {
    id: number | string;
    code: string;
    title: string;
    description: string;
    offer_type: CouponOfferType;
    discount_percentage?: number | null;
    discount_amount_minor?: number | null;
    max_discount_minor?: number | null;
    min_booking_amount_minor?: number | null;
    funding_source: CouponFundingSource;
    platform_split_percentage?: number;
    property_split_percentage?: number;
    valid_from: string;
    valid_to: string;
    expires_at?: string | null;
    usage_limit_total?: number | null;
    usage_limit_per_user?: number | null;
    usage_count: number;
    status: RewardsCampaignStatus;
    applicable_categories?: string[];
    is_eligible?: boolean;
    eligibility_reason?: string;
    discount_computed_minor?: number;
}

export interface RewardsDashboardMetrics {
    active_campaigns_count: number;
    total_coupons_redeemed: number;
    total_discount_disbursed_minor: number;
    platform_funded_discount_minor: number;
    property_funded_discount_minor: number;
    active_loyalty_points_outstanding: number;
    total_referrals_count: number;
    successful_stays_count: number;
    referral_fraud_alerts_count: number;
}

export interface AdminReferralFraudCase {
    id: number | string;
    referral_code: string;
    referrer_name: string;
    referrer_email: string;
    referred_name: string;
    referred_email: string;
    ip_similarity?: boolean;
    device_match?: boolean;
    payment_method_match?: boolean;
    status: 'flagged' | 'cleared' | 'disqualified';
    flagged_reason: string;
    created_at: string;
    reviewed_at?: string | null;
    reviewed_by?: string | null;
}

export interface LoyaltySystemConfig {
    points_earn_per_hundred_inr: number;
    points_to_inr_multiplier: number;
    points_expiry_days: number;
    max_redemption_percent_of_subtotal: number;
    min_points_to_redeem: number;
    referrer_points_per_stay: number;
    referred_points_per_stay: number;
    auto_qualification_hours: number;
}

export interface CheckoutPromotionQuote {
    subtotal_minor: number;
    coupon_discount_minor: number;
    tax_minor: number;
    points_redeemed: number;
    points_discount_minor: number;
    final_payable_minor: number;
    applied_coupon?: CouponCode | null;
    coupon_error?: string | null;
    points_error?: string | null;
    available_points: number;
    max_redeemable_points: number;
}
