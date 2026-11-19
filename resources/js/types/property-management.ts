import type { CityOption, OwnerEntityType } from './partner-verification';

export type PropertyOperationalStatus =
    | 'draft'
    | 'active'
    | 'temporarily_closed'
    | 'suspended'
    | 'archived';

export type PropertyVerificationStatus =
    | 'draft'
    | 'submitted'
    | 'under_review'
    | 'needs_information'
    | 'approved'
    | 'rejected'
    | 'withdrawn';

export type PropertyRoomTypeMode = 'shared' | 'private';

export type PropertyRoomStatus =
    | 'active'
    | 'maintenance'
    | 'blocked'
    | 'inactive';

export type PropertyGenderPolicy =
    | 'male_only'
    | 'female_only'
    | 'all_genders'
    | 'not_applicable';

export type PropertyGuestComposition =
    | 'individuals'
    | 'families'
    | 'couples'
    | 'groups';

export type PropertyOwnershipArrangement =
    | 'owner_operator'
    | 'leased_operator'
    | 'authorised_manager';

export type PropertyMediaCategory =
    | 'exterior'
    | 'entrance'
    | 'reception'
    | 'common_area'
    | 'dining'
    | 'bathroom'
    | 'room_interior'
    | 'room_arrangement'
    | 'room_furniture'
    | 'room_bathroom'
    | 'other';

export type PropertyMediaModerationStatus = 'pending' | 'approved' | 'rejected';

export type PropertyMediaPublicationStatus =
    | 'private'
    | 'publishing'
    | 'published'
    | 'unpublished'
    | 'failed';

export type PropertyVerificationDocumentType =
    | 'property_address_proof'
    | 'ownership_or_lease_proof'
    | 'property_licence_proof'
    | 'other_supporting_document';

export type PropertyCategoryOption = {
    id: number;
    name: string;
    slug: string;
    code: string;
    description: string | null;
    is_active: boolean;
};

export type PropertyMediaData = {
    id: number;
    property_id: number;
    property_room_type_id: number | null;
    room_type_name: string | null;
    property_room_id: number | null;
    room_number: string | null;
    property_verification_application_id: number | null;
    pending_removal_in_application_id: number | null;
    media_type: PropertyMediaCategory;
    media_type_label: string;
    is_room_category: boolean;
    original_filename: string;
    mime_type: string;
    file_size: number;
    file_size_label: string;
    width: number;
    height: number;
    alt_text: string;
    sort_order: number;
    is_cover: boolean;
    moderation_status: PropertyMediaModerationStatus;
    moderation_status_label: string;
    moderation_note: string | null;
    moderated_at: string | null;
    publication_status: PropertyMediaPublicationStatus;
    publication_status_label: string;
    published_at: string | null;
    is_publicly_published: boolean;
    preview_url: string;
    thumbnail_preview_url: string;
    public_optimized_url: string | null;
    public_thumbnail_url: string | null;
    created_at: string | null;
};

export type PropertyRoomTypeData = {
    id: number;
    property_id: number;
    name: string;
    slug: string;
    accommodation_mode: PropertyRoomTypeMode;
    accommodation_mode_label: string;
    sharing_capacity: number | null;
    max_guests_per_room: number;
    is_air_conditioned: boolean;
    gender_policy: PropertyGenderPolicy;
    gender_policy_label: string;
    guest_composition_policy: PropertyGuestComposition[];
    guest_composition_labels: string[];
    early_check_in_enabled: boolean;
    description: string | null;
    is_active: boolean;
    is_approved_version: boolean;
    has_pending_amendment: boolean;
    display_order: number;
    rooms_count: number;
    active_rooms_count: number;
    total_active_capacity: number;
    room_photos_count: number;
    created_at: string | null;
    updated_at: string | null;
};

export type PropertyRoomData = {
    id: number;
    property_id: number;
    property_room_type_id: number;
    room_type_name: string;
    accommodation_mode: PropertyRoomTypeMode;
    accommodation_mode_label: string;
    is_air_conditioned: boolean;
    max_guests_per_room: number;
    room_number: string;
    floor_number: string | null;
    wing_name: string | null;
    building_name: string | null;
    description: string | null;
    operational_status: PropertyRoomStatus;
    operational_status_label: string;
    is_approved_version: boolean;
    counts_toward_active_capacity: boolean;
    created_at: string | null;
    updated_at: string | null;
};

export type PropertyVerificationDocumentData = {
    id: number;
    application_id: number;
    document_type: PropertyVerificationDocumentType;
    document_type_label: string;
    original_filename: string;
    mime_type: string;
    file_size: number;
    file_size_label: string;
    checksum?: string | null;
    status: 'uploaded' | 'reviewed' | 'rejected' | 'replaced';
    status_label: string;
    reviewer_note: string | null;
    reviewed_by_name?: string | null;
    reviewed_at: string | null;
    created_at: string | null;
    preview_url: string | null;
    download_url: string | null;
};

export type PropertyChecklistDocumentItem = {
    type: PropertyVerificationDocumentType;
    label: string;
    guidance: string;
    accepted_formats: string;
    required: boolean;
    fulfilled: boolean;
    document: PropertyVerificationDocumentData | null;
};

export type PropertyVerificationEvaluation = {
    owner_active: boolean;
    identity_complete: boolean;
    room_types_count: number;
    rooms_count: number;
    property_photos_count: number;
    min_property_photos: number;
    has_cover_image: boolean;
    room_types_missing_photos: string[];
    media_complete: boolean;
    documents_complete: boolean;
    unresolved_rejected_documents_count: number;
    pending_moderation_media_count: number;
    approved_media_count: number;
    missing_requirements: string[];
    admin_missing_approvals: string[];
    ready_for_submission: boolean;
    ready_for_admin_approval: boolean;
    checklist: PropertyChecklistDocumentItem[];
    is_submitted_or_beyond: boolean;
};

export type PropertyFieldsSnapshot = {
    property_category_id: number;
    category_name?: string | null;
    city_id: number;
    city_name?: string | null;
    name: string;
    description: string;
    contact_person_name: string;
    contact_phone: string;
    contact_email: string | null;
    address_line_1: string;
    address_line_2: string | null;
    locality: string;
    landmark: string | null;
    postal_code: string;
    state: string;
    country_code: string;
    latitude: string | null;
    longitude: string | null;
};

export type PropertyVerificationApplicationData = {
    id: number;
    property_id: number;
    application_number: string;
    status: PropertyVerificationStatus;
    status_label: string;
    revision_number: number;
    is_amendment: boolean;
    ownership_arrangement: PropertyOwnershipArrangement;
    ownership_arrangement_label: string;
    is_active: boolean;
    is_editable: boolean;
    can_submit: boolean;
    can_withdraw: boolean;
    can_cancel_amendment: boolean;
    can_start_revision: boolean;
    declaration_version: string | null;
    declaration_accepted_at: string | null;
    submitted_at: string | null;
    reviewed_at: string | null;
    requested_information: string | null;
    requested_changes: {
        flagged_document_ids?: number[];
        flagged_media_ids?: number[];
    };
    decision_reason: string | null;
    proposed_property_data: PropertyFieldsSnapshot | null;
    baseline_snapshot: Record<string, unknown> | null;
    approved_snapshot: Record<string, unknown> | null;
    internal_reviewer_notes?: string | null;
    assigned_admin_id?: number | null;
    assigned_reviewer_name?: string | null;
    reviewed_by_name?: string | null;
    created_at: string | null;
    updated_at: string | null;
};

export type PropertySummaryData = {
    id: number;
    property_reference: string;
    name: string;
    approved_name: string;
    slug: string;
    category: PropertyCategoryOption | null;
    city: CityOption | null;
    locality: string;
    state: string;
    status: PropertyOperationalStatus;
    status_label: string;
    is_verified: boolean;
    booking_eligible: boolean;
    has_approved_baseline: boolean;
    verification_status: PropertyVerificationStatus;
    verification_status_label: string;
    is_amendment_active: boolean;
    active_application: PropertyVerificationApplicationData | null;
    latest_application: PropertyVerificationApplicationData | null;
    room_types_count: number;
    rooms_count: number;
    active_rooms_count: number;
    nominal_active_capacity: number;
    cover_media: PropertyMediaData | null;
    can_toggle_operational_status: boolean;
    can_close_completely?: boolean;
    can_start_amendment: boolean;
    approved_at: string | null;
    updated_at: string | null;
};

export type AdminPropertyQueueRow = {
    id: number;
    property_reference: string;
    name: string;
    locality: string;
    category_name: string;
    city_name: string;
    owner_name: string;
    owner_email: string;
    room_types_count: number;
    rooms_count: number;
    operational_status: PropertyOperationalStatus;
    operational_status_label: string;
    is_verified: boolean;
    booking_eligible: boolean;
    has_approved_baseline: boolean;
    application_id: number | null;
    application_number: string | null;
    revision_number: number;
    is_amendment: boolean;
    verification_status: PropertyVerificationStatus;
    verification_status_label: string;
    submitted_at: string | null;
    assigned_reviewer_name: string | null;
};

export type TimingRules = {
    standard_check_in_time: string;
    standard_check_out_time: string;
    earliest_early_check_in_time: string;
    timezone: string;
};

export type AdminPropertyOwnerDetail = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    status: string;
    status_label: string;
    approved_at: string | null;
    business_profile: {
        entity_type: OwnerEntityType;
        entity_type_label: string;
        display_business_name: string;
        legal_business_name: string | null;
    } | null;
};
