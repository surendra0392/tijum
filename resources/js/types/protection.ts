export type CaseCategory =
    | 'room_type_mismatch'
    | 'food_not_provided'
    | 'property_unavailable'
    | 'safety_hazard'
    | 'amenity_falsified'
    | 'cleanliness_hygiene'
    | 'owner_cancelled'
    | 'customer_requested'
    | 'emergency_checkin_issue'
    | 'other';

export type CaseStatus =
    | 'submitted'
    | 'acknowledged'
    | 'under_review'
    | 'awaiting_owner'
    | 'awaiting_customer'
    | 'relocation_offered'
    | 'refund_pending'
    | 'resolved'
    | 'closed';

export type CasePriority = 'standard' | 'high' | 'urgent';

export type RelocationStatus =
    | 'draft'
    | 'offered'
    | 'accepted'
    | 'declined'
    | 'expired'
    | 'cancelled';

export interface ProtectionCaseMessage {
    id: number;
    sender_type: 'customer' | 'owner' | 'admin' | 'system';
    sender_name: string;
    message: string;
    attachment_path?: string | null;
    is_internal: boolean;
    created_at: string;
}

export interface RelocationOfferData {
    id: number;
    destination_property_id: number;
    destination_property_name: string;
    destination_room_type_name: string;
    original_amount_in_rupees: number;
    destination_amount_in_rupees: number;
    difference_amount_in_rupees: number;
    difference_bearer: string;
    status: RelocationStatus;
    destination_owner_notes?: string | null;
    destination_accepted_at?: string | null;
    customer_decision_at?: string | null;
    customer_notes?: string | null;
    expires_at: string;
    is_expired: boolean;
    replacement_reservation_code?: string | null;
}

export interface CustomerProtectionCaseSummary {
    id: number;
    case_reference: string;
    category: CaseCategory;
    category_label: string;
    status: CaseStatus;
    status_label: string;
    priority: CasePriority;
    reservation_id: number;
    reservation_code: string;
    property_name: string;
    reported_issue: string;
    acknowledged_at?: string | null;
    sla_acknowledged_at?: string | null;
    sla_resolved_at?: string | null;
    is_overdue: boolean;
    created_at: string;
    resolved_at?: string | null;
    resolution_type?: string | null;
    resolution_summary?: string | null;
}

export interface CustomerProtectionCaseDetail extends CustomerProtectionCaseSummary {
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
    assigned_admin_name?: string | null;
    evidence_attachments?: string[];
    messages: ProtectionCaseMessage[];
    active_relocation?: RelocationOfferData | null;
    relocations?: RelocationOfferData[];
    refunds?: Array<{
        id: number;
        refund_reference: string;
        amount_in_rupees: number;
        status: string;
        reason: string;
        created_at: string;
    }>;
}

export interface CancellationRefundPolicyData {
    id: number;
    name: string;
    version: string;
    description: string;
    rules: {
        free_cancellation_hours_before_checkin?: number;
        cutoff_hours_before_checkin?: number;
        free_cancellation_percentage?: number;
        late_cancellation_refund_percentage?: number;
        relocation_compensation_percentage?: number;
        owner_cancellation_full_refund?: boolean;
        discretionary_review_enabled?: boolean;
    };
    is_active: boolean;
}
