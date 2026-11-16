export type PropertyPricingBasis = 'per_guest' | 'per_room';
export type PropertyAvailabilityBlockScope = 'property' | 'room_type' | 'room';
export type PropertyAvailabilityBlockType =
    | 'closure'
    | 'maintenance'
    | 'stop_sell';
export type PropertyAvailabilityBlockStatus =
    | 'active'
    | 'cancelled'
    | 'expired';

export type PricingOption<T extends string = string> = {
    value: T;
    label: string;
};

export type PropertyFoodSummary = {
    food_provided: boolean;
    breakfast_included: boolean;
    lunch_included: boolean;
    dinner_included: boolean;
    label: string;
};

export type RoomTypePricingRow = {
    id: number;
    name: string;
    accommodation_mode?: string;
    accommodation_mode_label?: string;
    pricing_basis?: PropertyPricingBasis;
    max_guests_per_room?: number | null;
    is_air_conditioned: boolean;
    is_active?: boolean;
    daily_rate_minor: number | null;
    weekly_rate_minor: number | null;
    monthly_rate_minor: number | null;
    has_any_direct_rate?: boolean;
};

export type AvailabilityBlockPortal = {
    id: number;
    property_id: number;
    scope: PropertyAvailabilityBlockScope;
    scope_label: string;
    property_room_type_id: number | null;
    room_type_name?: string | null;
    property_room_id: number | null;
    room_number?: string | null;
    start_date: string | null;
    end_date: string | null;
    block_type: PropertyAvailabilityBlockType;
    block_type_label: string;
    status: PropertyAvailabilityBlockStatus;
    status_label: string;
    is_admin_restriction: boolean;
    reason?: string | null;
    cancellation_reason?: string | null;
    cancelled_at?: string | null;
    created_at?: string | null;
    events?: Array<Record<string, unknown>>;
};

export type PropertyPricingEvaluation = {
    active_room_types_count: number;
    configured_room_types_count: number;
    missing_pricing_count: number;
    has_food_configuration?: boolean;
};

export type PropertyPricingOptions = {
    blockScopes: PricingOption<PropertyAvailabilityBlockScope>[];
    blockTypes: PricingOption<PropertyAvailabilityBlockType>[];
    blockStatuses: PricingOption<PropertyAvailabilityBlockStatus>[];
    currencyCode: string;
};
