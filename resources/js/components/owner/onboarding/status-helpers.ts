import type { SemanticStatus } from '@/components/shared/status-badge';
import type {
    OwnerVerificationDocumentStatus,
    OwnerVerificationStatus,
} from '@/types';

export const applicationStatusBadgeMap: Record<
    OwnerVerificationStatus,
    SemanticStatus
> = {
    draft: 'neutral',
    submitted: 'info',
    under_review: 'processing',
    needs_information: 'pending',
    approved: 'active',
    rejected: 'rejected',
    withdrawn: 'cancelled',
};

export const documentStatusBadgeMap: Record<
    OwnerVerificationDocumentStatus,
    SemanticStatus
> = {
    uploaded: 'info',
    reviewed: 'verified',
    rejected: 'rejected',
    replaced: 'neutral',
};

export function formatIsoDate(value: string | null | undefined): string {
    if (!value) {
        return '—';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return parsed.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

export function formatIsoDateTime(value: string | null | undefined): string {
    if (!value) {
        return '—';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return parsed.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}
