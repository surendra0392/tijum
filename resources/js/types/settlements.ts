export interface PartnerFinancialProfile {
    legal_business_name?: string | null;
    business_constitution?: string | null;
    pan_number?: string | null;
    pan_verified?: boolean;
    gst_registered?: boolean;
    gstin?: string | null;
    supplier_legal_classification?: string | null;
    razorpay_account_id?: string | null;
    linked_account_status: string;
    linked_account_label: string;
    bank_beneficiary_name?: string | null;
    bank_account_number_masked?: string | null;
    bank_ifsc?: string | null;
    bank_name?: string | null;
    beneficiary_verified?: boolean;
    onboarding_status: string;
    onboarding_label: string;
    is_eligible: boolean;
    rejection_reason?: string | null;
    verified_at?: string | null;
    verified_by_admin?: string | null;
}

export interface PartnerCommissionAgreement {
    id: number;
    agreement_reference: string;
    owner_name?: string;
    owner_email?: string;
    property_name?: string | null;
    commission_rate_bps: number;
    commission_rate_percentage: number;
    commission_base_type: string;
    commission_base_label: string;
    commission_gst_type: string;
    commission_gst_label: string;
    terms_version: string;
    status: string;
    status_label: string;
    effective_from: string;
    effective_until?: string | null;
    accepted_at?: string | null;
    is_pending_acceptance?: boolean;
    is_active?: boolean;
    created_by?: string | null;
}

export interface PartnerSettlementItem {
    id?: number;
    booking_reference: string;
    property_name?: string | null;
    stay_dates?: string | null;
    item_type?: string;
    item_type_label?: string;
    gross_amount_minor: number;
    commission_amount_minor: number;
    commission_tax_amount_minor: number;
    tax_deduction_minor: number;
    net_payable_minor: number;
    notes?: string | null;
}

export interface PartnerSettlement {
    id: number;
    settlement_reference: string;
    owner_name?: string;
    owner_email?: string;
    period_start: string;
    period_end: string;
    currency: string;
    gross_booking_value_minor: number;
    commission_amount_minor: number;
    commission_tax_amount_minor: number;
    statutory_deductions_minor: number;
    refund_adjustments_minor: number;
    relocation_adjustments_minor?: number;
    other_adjustments_minor?: number;
    net_settlement_amount_minor: number;
    status: string;
    status_label: string;
    provider_transfer_id?: string | null;
    provider_status?: string | null;
    failure_reason?: string | null;
    admin_notes?: string | null;
    settled_at?: string | null;
    transfer_initiated_at?: string | null;
    created_at?: string | null;
    bank_account_masked?: string | null;
    bank_name?: string | null;
    bank_ifsc?: string | null;
    razorpay_account_id?: string | null;
    items_count?: number;
    items?: PartnerSettlementItem[];
}

export interface PlatformRelocationSubsidy {
    id: number;
    subsidy_reference: string;
    source_booking_reference: string;
    source_property_name?: string | null;
    replacement_booking_reference: string;
    replacement_property_name?: string | null;
    case_reference?: string | null;
    source_amount_minor: number;
    destination_amount_minor: number;
    subsidy_amount_minor: number;
    currency: string;
    status: string;
    status_label: string;
    approved_by?: string | null;
    approved_at?: string | null;
    created_at?: string | null;
}
