export type User = {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
};

export type CustomerAccount = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    email_verified_at: string | null;
    phone_verified_at: string | null;
    two_factor_enabled: boolean;
    created_at: string | null;
    updated_at: string | null;
};

export type OwnerStatus =
    | 'pending_verification'
    | 'pending_review'
    | 'active'
    | 'rejected'
    | 'suspended';

export type Owner = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    status: OwnerStatus;
    status_label: string;
    email_verified_at: string | null;
    approved_at?: string | null;
    can_publish_properties: boolean;
    created_at: string | null;
    updated_at: string | null;
};

export type AdminRole =
    | 'super_admin'
    | 'property_verification'
    | 'operations'
    | 'finance'
    | 'customer_support';

export type Admin = {
    id: number;
    name: string;
    email: string;
    role: AdminRole;
    role_label: string;
    permissions: string[];
    is_active: boolean;
    email_verified_at: string | null;
    two_factor_enabled: boolean;
    two_factor_confirmed_at: string | null;
    created_at: string | null;
    updated_at: string | null;
};

export type Auth = {
    user: User;
    owner?: Owner | null;
    admin?: Admin | null;
};

export type Passkey = {
    id: number;
    name: string;
    authenticator: string | null;
    created_at_diff: string;
    last_used_at_diff: string | null;
};

export type TwoFactorSetupData = {
    svg: string;
    url: string;
};

export type TwoFactorSecretKey = {
    secretKey: string;
};
