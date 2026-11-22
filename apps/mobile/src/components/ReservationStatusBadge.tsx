import React from 'react';
import { Badge } from './Badge';

interface Props {
    status: string;
    label?: string;
}

export function ReservationStatusBadge({ status, label }: Props) {
    const getVariant = () => {
        switch (status) {
            case 'confirmed':
            case 'checked_in':
            case 'checked_out':
            case 'completed':
                return 'emerald';
            case 'awaiting_payment':
            case 'pending':
                return 'amber';
            case 'cancelled':
            case 'expired':
                return 'rose';
            default:
                return 'default';
        }
    };

    const getLabel = () => {
        if (label) return label;
        switch (status) {
            case 'confirmed':
                return 'Confirmed';
            case 'checked_in':
                return 'Checked In';
            case 'checked_out':
                return 'Checked Out';
            case 'completed':
                return 'Completed';
            case 'awaiting_payment':
                return 'Payment Required';
            case 'cancelled':
                return 'Cancelled';
            case 'expired':
                return 'Expired';
            default:
                return status;
        }
    };

    return <Badge label={getLabel()} variant={getVariant()} />;
}
