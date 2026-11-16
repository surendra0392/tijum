<?php

declare(strict_types=1);

namespace App\Enums;

enum ReconciliationStatus: string
{
    case Matched = 'matched';
    case PendingProviderUpdate = 'pending_provider_update';
    case MissingLocalRecord = 'missing_local_record';
    case MissingProviderRecord = 'missing_provider_record';
    case AmountMismatch = 'amount_mismatch';
    case DuplicateTransaction = 'duplicate_transaction';
    case FailedTransfer = 'failed_transfer';
    case ReversalMismatch = 'reversal_mismatch';
    case RefundMismatch = 'refund_mismatch';
    case ManualReviewRequired = 'manual_review_required';

    public function label(): string
    {
        return match ($this) {
            self::Matched => 'Fully Matched',
            self::PendingProviderUpdate => 'Pending Provider Update',
            self::MissingLocalRecord => 'Missing Local Record',
            self::MissingProviderRecord => 'Missing Provider Record',
            self::AmountMismatch => 'Amount Mismatch',
            self::DuplicateTransaction => 'Duplicate Transaction Event',
            self::FailedTransfer => 'Failed Provider Transfer',
            self::ReversalMismatch => 'Reversal Mismatch',
            self::RefundMismatch => 'Refund Mismatch',
            self::ManualReviewRequired => 'Manual Review Required',
        };
    }
}
