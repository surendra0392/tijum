import { ApiClient } from './client';
import {
    ApiResponse,
    CouponItem,
    PointsLedgerItem,
    PointsWallet,
    PromotionQuoteResult,
    ReferralItem,
    ReferralProfile,
} from './types';

export interface RewardsOverviewResponse {
    wallet: PointsWallet;
    referral_profile: ReferralProfile;
    active_coupons_count: number;
    expiring_soon_points?: { points: number; expires_at: string }[];
    recent_transactions: PointsLedgerItem[];
}

export const RewardsApi = {
    // Rewards Overview Dashboard
    getOverview: () =>
        ApiClient.get<ApiResponse<RewardsOverviewResponse>>(
            'customer/rewards/overview',
        ),

    // Loyalty Points & Ledger
    getPointsWallet: () =>
        ApiClient.get<ApiResponse<{ wallet: PointsWallet }>>(
            'customer/rewards/points',
        ),

    getPointsLedger: (params?: { page?: number; type?: string }) =>
        ApiClient.get<
            ApiResponse<{ ledger: PointsLedgerItem[]; wallet: PointsWallet }>
        >('customer/rewards/points/ledger', params),

    // Referrals
    getReferralProfile: () =>
        ApiClient.get<
            ApiResponse<{
                profile: ReferralProfile;
                referrals: ReferralItem[];
            }>
        >('customer/rewards/referrals'),

    // Coupons
    getAvailableCoupons: (params?: {
        property_id?: number;
        category?: string;
    }) => ApiClient.get<ApiResponse<CouponItem[]>>('customer/coupons', params),

    validateCoupon: (
        code: string,
        subtotalPaise: number,
        propertyId?: number,
    ) =>
        ApiClient.post<
            ApiResponse<{
                valid: boolean;
                coupon?: CouponItem;
                discount_amount_paise?: number;
                message?: string;
            }>
        >('customer/coupons/validate', {
            code,
            subtotal_paise: subtotalPaise,
            property_id: propertyId,
        }),

    // Central Promotion Engine Quote (Subtotal -> Coupon -> Tax -> Points -> Total)
    quotePromotions: (payload: {
        property_id: number;
        subtotal_paise: number;
        tax_amount_paise?: number;
        deposit_amount_paise?: number;
        coupon_code?: string;
        points_to_redeem?: number;
    }) =>
        ApiClient.post<ApiResponse<PromotionQuoteResult>>(
            'checkout/quote-promotions',
            payload,
        ),
};
