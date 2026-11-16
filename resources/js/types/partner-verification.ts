export type OwnerEntityType =
    | 'individual'
    | 'sole_proprietorship'
    | 'partnership'
    | 'limited_liability_partnership'
    | 'private_limited_company'
    | 'other';

export type OwnerVerificationStatus =
    | 'draft'
    | 'submitted'
    | 'under_review'
    | 'needs_information'
    | 'approved'
    | 'rejected'
    | 'withdrawn';

export type OwnerVerificationDocumentType =
    | 'identity_proof'
    | 'business_registration_proof'
    | 'operating_authority_proof'
    | 'business_address_proof'
    | 'tax_registration_proof'
    | 'other_supporting_document';

export type OwnerVerificationDocumentStatus =
    | 'uploaded'
    | 'reviewed'
    | 'rejected'
    | 'replaced';

export type CityOption = {
    id: number;
    name: string;
    slug: string;
    state: string;
    state_code: string | null;
    country_code: string;
    is_active: boolean;
};

export type OwnerEntityTypeOption = {
    value: OwnerEntityType;
    label: string;
    description: string;
    requiresLegalBusinessName: boolean;
    requiredDocuments: string[];
};

export type OwnerBusinessProfileData = {
    id: number;
    entity_type: OwnerEntityType;
    entity_type_label: string;
    legal_business_name: string | null;
    display_business_name: string;
    primary_contact_name: string;
    primary_contact_designation: string | null;
    business_email: string | null;
    business_address_line_1: string;
    business_address_line_2: string | null;
    locality: string | null;
    postal_code: string | null;
    city: string;
    state: string;
    country_code: string;
    website_url: string | null;
    description: string | null;
    is_complete: boolean;
    updated_at: string | null;
};

export type OwnerVerificationDocumentData = {
    id: number;
    application_id: number;
    document_type: OwnerVerificationDocumentType;
    document_type_label: string;
    original_filename: string;
    mime_type: string;
    file_size: number;
    file_size_label: string;
    checksum?: string;
    status: OwnerVerificationDocumentStatus;
    status_label: string;
    reviewer_note: string | null;
    reviewed_at: string | null;
    created_at: string | null;
    preview_url: string | null;
    download_url: string | null;
};

export type VerificationChecklistItem = {
    type: OwnerVerificationDocumentType;
    label: string;
    guidance: string;
    accepted_formats: string;
    required: boolean;
    fulfilled: boolean;
    document: OwnerVerificationDocumentData | null;
};

export type OnboardingWorkflowStep = {
    key: string;
    number: number;
    title: string;
    description: string;
    completed: boolean;
    active_needed: boolean;
};

export type PartnerOnboardingEvaluation = {
    email_verified: boolean;
    business_profile_saved: boolean;
    business_profile_complete: boolean;
    operating_cities_count: number;
    operating_cities_complete: boolean;
    entity_type: OwnerEntityType | null;
    required_document_types: OwnerVerificationDocumentType[];
    missing_requirements: string[];
    unresolved_rejected_documents_count: number;
    documents_complete: boolean;
    ready_for_submission: boolean;
    checklist: VerificationChecklistItem[];
    steps: OnboardingWorkflowStep[];
};

export type RequestedChangesPayload = {
    required_profile_changes?: string[];
    required_document_types?: OwnerVerificationDocumentType[];
};

export type OwnerVerificationApplicationData = {
    id: number;
    application_number: string;
    status: OwnerVerificationStatus;
    status_label: string;
    revision_number: number;
    is_active: boolean;
    is_editable: boolean;
    can_submit: boolean;
    can_withdraw: boolean;
    can_start_revision: boolean;
    declaration_version: string | null;
    declaration_accepted_at: string | null;
    submitted_at: string | null;
    reviewed_at: string | null;
    requested_information: string | null;
    requested_changes: RequestedChangesPayload;
    decision_reason: string | null;
    created_at: string | null;
    updated_at: string | null;
};

export type VerificationEventData = {
    id: number;
    event_type: string;
    event_label: string;
    previous_status: string | null;
    new_status: string | null;
    actor_type: string;
    actor_id?: number | null;
    actor_name: string | null;
    notes: string | null;
    metadata?: Record<string, unknown>;
    created_at: string | null;
};

export type AdminPartnerSummaryRow = {
    id: number;
    application_number: string;
    status: OwnerVerificationStatus;
    status_label: string;
    revision_number: number;
    business_name: string;
    entity_type: OwnerEntityType | null;
    entity_type_label: string;
    owner_name: string;
    owner_email: string;
    owner_status: string | null;
    owner_status_label: string;
    operating_cities: string[];
    submitted_at: string | null;
    reviewed_at: string | null;
    assigned_reviewer_name: string | null;
    assigned_admin_id: number | null;
};
