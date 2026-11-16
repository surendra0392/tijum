import type { LucideIcon } from 'lucide-react';
import {
    AlertTriangle,
    Ban,
    CheckCircle2,
    Clock,
    Info,
    Loader2,
    ShieldCheck,
    XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type SemanticStatus =
    | 'active'
    | 'verified'
    | 'completed'
    | 'pending'
    | 'processing'
    | 'rejected'
    | 'suspended'
    | 'cancelled'
    | 'info'
    | 'warning'
    | 'neutral';

type StatusConfig = {
    label: string;
    icon: LucideIcon;
    className: string;
    spin?: boolean;
};

const statusMap: Record<SemanticStatus, StatusConfig> = {
    active: {
        label: 'Active',
        icon: CheckCircle2,
        className:
            'border-status-success-border bg-status-success-bg text-status-success-fg',
    },
    verified: {
        label: 'Verified',
        icon: ShieldCheck,
        className:
            'border-status-success-border bg-status-success-bg text-status-success-fg',
    },
    completed: {
        label: 'Completed',
        icon: CheckCircle2,
        className:
            'border-status-success-border bg-status-success-bg text-status-success-fg',
    },
    pending: {
        label: 'Pending',
        icon: Clock,
        className:
            'border-status-warning-border bg-status-warning-bg text-status-warning-fg',
    },
    processing: {
        label: 'Processing',
        icon: Loader2,
        className:
            'border-status-warning-border bg-status-warning-bg text-status-warning-fg',
        spin: true,
    },
    rejected: {
        label: 'Rejected',
        icon: XCircle,
        className:
            'border-status-error-border bg-status-error-bg text-status-error-fg',
    },
    suspended: {
        label: 'Suspended',
        icon: Ban,
        className:
            'border-status-error-border bg-status-error-bg text-status-error-fg',
    },
    cancelled: {
        label: 'Cancelled',
        icon: XCircle,
        className:
            'border-status-error-border bg-status-error-bg text-status-error-fg',
    },
    info: {
        label: 'Info',
        icon: Info,
        className:
            'border-status-info-border bg-status-info-bg text-status-info-fg',
    },
    warning: {
        label: 'Warning',
        icon: AlertTriangle,
        className:
            'border-status-warning-border bg-status-warning-bg text-status-warning-fg',
    },
    neutral: {
        label: 'Neutral',
        icon: Info,
        className:
            'border-status-neutral-border bg-status-neutral-bg text-status-neutral-fg',
    },
};

type StatusBadgeProps = {
    status: SemanticStatus;
    label?: string;
    className?: string;
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
    const config = statusMap[status];
    const Icon = config.icon;

    return (
        <span
            data-slot="status-badge"
            className={cn(
                'inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-heading text-xs font-semibold whitespace-nowrap',
                config.className,
                className,
            )}
        >
            <Icon
                className={cn(
                    'size-3.5 shrink-0',
                    config.spin && 'animate-spin',
                )}
                aria-hidden="true"
            />
            <span>{label ?? config.label}</span>
        </span>
    );
}
