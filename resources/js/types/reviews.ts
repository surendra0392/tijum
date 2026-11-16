export type ReviewStatus =
    | 'pending_moderation'
    | 'published'
    | 'requires_changes'
    | 'rejected'
    | 'hidden';

export type ReviewResponseStatus =
    | 'pending_moderation'
    | 'published'
    | 'rejected'
    | 'hidden';

export type ReviewReportStatus =
    | 'submitted'
    | 'under_review'
    | 'action_taken'
    | 'no_violation_found'
    | 'closed';

export type ReviewReportReason =
    | 'hate_speech_or_harassment'
    | 'vulgar_or_obscene_language'
    | 'personally_identifiable_information'
    | 'false_or_misleading_facts'
    | 'commercial_advertising_or_spam'
    | 'off_topic_or_irrelevant'
    | 'extortion_or_blackmail'
    | 'conflict_of_interest'
    | 'duplicate_or_multiple_submission'
    | 'other_content_policy_violation';

export type ReviewStarDistribution = {
    five_star: { count: number; percentage: number };
    four_star: { count: number; percentage: number };
    three_star: { count: number; percentage: number };
    two_star: { count: number; percentage: number };
    one_star: { count: number; percentage: number };
};

export type PropertyRatingSummaryData = {
    average_rating: number;
    published_review_count: number;
    five_star_count?: number;
    four_star_count?: number;
    three_star_count?: number;
    two_star_count?: number;
    one_star_count?: number;
    cleanliness_average?: number | null;
    food_average?: number | null;
    communication_average?: number | null;
    value_average?: number | null;
    average_cleanliness_rating?: number | null;
    average_food_quality_rating?: number | null;
    average_communication_rating?: number | null;
    average_value_rating?: number | null;
    star_distribution?:
        | Record<
              number | string,
              number | { count: number; percentage: number }
          >
        | ReviewStarDistribution;
};

export type PublicReviewResponseItem = {
    id: number;
    response_text: string;
    published_at?: string | null;
};

export type PublicReviewItem = {
    id: number;
    overall_rating: number;
    cleanliness_rating?: number | null;
    food_quality_rating?: number | null;
    communication_rating?: number | null;
    value_rating?: number | null;
    title?: string | null;
    content?: string | null;
    verified_booking: boolean;
    customer_display_name: string;
    room_type_name?: string | null;
    submitted_at?: string | null;
    published_at?: string | null;
    is_edited?: boolean;
    response?: PublicReviewResponseItem | null;
};

export type CustomerReviewDetail = {
    id: number;
    overall_rating: number;
    cleanliness_rating?: number | null;
    food_quality_rating?: number | null;
    communication_rating?: number | null;
    value_rating?: number | null;
    title?: string | null;
    content?: string | null;
    status: ReviewStatus;
    status_label: string;
    can_be_edited?: boolean;
    submitted_at?: string | null;
    published_at?: string | null;
};

export type ReviewEligibilityData = {
    is_eligible: boolean;
    reason: string;
    days_remaining?: number | null;
    window_deadline?: string | null;
};
