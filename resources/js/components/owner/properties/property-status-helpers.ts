import type { SemanticStatus } from '@/components/shared/status-badge';
import type {
    PropertyMediaModerationStatus,
    PropertyOperationalStatus,
    PropertyRoomStatus,
    PropertyVerificationStatus,
} from '@/types';

export const propertyOperationalStatusMap: Record<
    PropertyOperationalStatus,
    SemanticStatus
> = {
    draft: 'neutral',
    active: 'active',
    temporarily_closed: 'pending',
    suspended: 'suspended',
    archived: 'cancelled',
};

export const propertyVerificationStatusMap: Record<
    PropertyVerificationStatus,
    SemanticStatus
> = {
    draft: 'neutral',
    submitted: 'info',
    under_review: 'processing',
    needs_information: 'pending',
    approved: 'verified',
    rejected: 'rejected',
    withdrawn: 'cancelled',
};

export const roomOperationalStatusMap: Record<
    PropertyRoomStatus,
    SemanticStatus
> = {
    active: 'active',
    maintenance: 'pending',
    blocked: 'rejected',
    inactive: 'neutral',
};

export const mediaModerationStatusMap: Record<
    PropertyMediaModerationStatus,
    SemanticStatus
> = {
    pending: 'pending',
    approved: 'verified',
    rejected: 'rejected',
};
