export type AmenityApplicabilityScope = 'property' | 'room_type' | 'both';
export type AmenityAvailability = 'included' | 'not_available';
export type AmenityVerificationStatus =
    | 'draft'
    | 'submitted'
    | 'under_review'
    | 'needs_information'
    | 'approved'
    | 'rejected'
    | 'inactive';

export type AmenityCategoryOption = {
    id: number;
    code: string;
    name: string;
    slug: string;
    description?: string | null;
    display_order?: number;
    is_active?: boolean;
    amenities_count?: number;
    amenities?: AmenityCatalogueItem[];
};

export type AmenityCatalogueItem = {
    id: number;
    amenity_category_id: number;
    category?: AmenityCategoryOption | null;
    code: string;
    name: string;
    slug: string;
    description?: string | null;
    applicability_scope: AmenityApplicabilityScope;
    applicability_scope_label: string;
    applies_to_property: boolean;
    applies_to_room_type: boolean;
    icon_key?: string | null;
    is_customer_visible: boolean;
    requires_review: boolean;
    display_order: number;
    is_active: boolean;
};

export type AmenityAssignmentSummary = {
    id: number;
    scope: 'property' | 'room_type';
    property_id: number;
    property_room_type_id?: number | null;
    room_type_name?: string | null;
    amenity_id: number;
    assignment_reference: string;
    assignment_group_id: string;
    availability: AmenityAvailability;
    availability_label: string;
    status: AmenityVerificationStatus;
    status_label: string;
    revision_number: number;
    is_current: boolean;
    is_customer_visible: boolean;
    is_editable: boolean;
    can_submit: boolean;
    is_approved_current: boolean;
    details?: string | null;
    requested_information?: string | null;
    decision_reason?: string | null;
    submitted_at?: string | null;
    under_review_at?: string | null;
    reviewed_at?: string | null;
    approved_at?: string | null;
    amenity?: AmenityCatalogueItem | null;
};

export type AmenityReadiness = {
    owner_active: boolean;
    property_approved: boolean;
    applicable_property_amenities_count: number;
    active_room_types_count: number;
    property_assignments_count: number;
    room_type_assignments_count: number;
    approved_count: number;
    pending_review_count: number;
    needs_information_count: number;
    rejected_count: number;
    inactive_count: number;
    draft_count: number;
    missing_requirements: string[];
    admin_missing_approvals: string[];
    ready_for_submission: boolean;
    ready_for_admin_approval: boolean;
};

export type AmenityAssignmentEventData = {
    id: number;
    assignable_type: string;
    assignable_id: number;
    event_type: string;
    event_type_label: string;
    previous_status?: string | null;
    new_status?: string | null;
    actor_type: string;
    actor_name?: string | null;
    notes?: string | null;
    metadata?: Record<string, unknown> | null;
    created_at?: string | null;
};

export type AdminAmenityQueueRow = {
    id: number;
    scope: 'property' | 'room_type';
    assignment_reference: string;
    property_id: number;
    property_room_type_id?: number | null;
    room_type_name?: string | null;
    property_name?: string | null;
    property_reference?: string | null;
    owner_name?: string | null;
    owner_email?: string | null;
    city_name?: string | null;
    amenity_name?: string | null;
    amenity_code?: string | null;
    category_name?: string | null;
    availability: AmenityAvailability;
    availability_label: string;
    status: AmenityVerificationStatus;
    status_label: string;
    revision_number: number;
    is_current: boolean;
    submitted_at?: string | null;
    assigned_reviewer_name?: string | null;
    reviewed_at?: string | null;
    approved_at?: string | null;
};
