<?php

declare(strict_types=1);

namespace App\Actions\Protection;

use App\Enums\CaseStatus;
use App\Models\Admin;
use App\Models\CustomerProtectionCase;
use App\Models\CustomerProtectionCaseMessage;
use App\Models\Owner;
use App\Models\User;
use App\Services\Notifications\NotificationDispatcher;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AddCaseMessage
{
    /**
     * @param  array{
     *     message: string,
     *     attachment?: UploadedFile|null,
     *     is_internal_note?: bool,
     *     status?: string|null,
     * }  $data
     */
    public function execute(
        CustomerProtectionCase $case,
        User|Owner|Admin $sender,
        array $data,
    ): CustomerProtectionCaseMessage {
        $message = trim((string) ($data['message'] ?? ''));
        if ($message === '') {
            throw ValidationException::withMessages([
                'message' => 'Message content cannot be empty.',
            ]);
        }

        $senderType = match (true) {
            $sender instanceof User => 'customer',
            $sender instanceof Owner => 'owner',
            $sender instanceof Admin => 'admin',
        };

        if ($sender instanceof User && $sender->id !== $case->user_id) {
            throw ValidationException::withMessages([
                'authorization' => 'You are not authorised to comment on this support case.',
            ]);
        }

        if ($sender instanceof Owner && $sender->id !== $case->owner_id) {
            throw ValidationException::withMessages([
                'authorization' => 'You are not authorised to comment on this support case.',
            ]);
        }

        $isInternal = (bool) ($data['is_internal_note'] ?? false);
        if ($isInternal && ! $sender instanceof Admin) {
            $isInternal = false;
        }

        $caseMessage = DB::transaction(function () use ($case, $sender, $senderType, $message, $isInternal, $data): CustomerProtectionCaseMessage {
            $lockedCase = CustomerProtectionCase::query()->whereKey($case->id)->lockForUpdate()->firstOrFail();

            if (! $isInternal && in_array($lockedCase->status, [CaseStatus::Resolved, CaseStatus::Closed], true)) {
                throw ValidationException::withMessages([
                    'message' => 'This case is already '.$lockedCase->status->label().' and cannot accept new public replies.',
                ]);
            }

            $attachment = $data['attachment'] ?? null;
            $attachmentPath = null;
            $attachmentName = null;
            $attachmentMime = null;

            if ($attachment instanceof UploadedFile && $attachment->isValid()) {
                $disk = (string) config('tijum.customer_protection.attachments.disk', 'local');
                $attachmentPath = $attachment->store("protection_cases/{$lockedCase->id}", $disk);
                $attachmentName = $attachment->getClientOriginalName();
                $attachmentMime = $attachment->getClientMimeType();
            }

            /** @var CustomerProtectionCaseMessage $caseMessage */
            $caseMessage = CustomerProtectionCaseMessage::create([
                'customer_protection_case_id' => $lockedCase->id,
                'sender_type' => $senderType,
                'sender_id' => $sender->id,
                'sender_name' => $sender->name,
                'message' => $message,
                'attachment_path' => $attachmentPath,
                'attachment_name' => $attachmentName,
                'attachment_mime' => $attachmentMime,
                'is_internal_note' => $isInternal,
            ]);

            // Automatic workflow progression:
            if ($senderType === 'customer' && $lockedCase->status === CaseStatus::AwaitingCustomer) {
                $lockedCase->forceFill(['status' => CaseStatus::UnderReview])->save();
            } elseif ($senderType === 'owner' && $lockedCase->status === CaseStatus::AwaitingOwner) {
                $lockedCase->forceFill(['status' => CaseStatus::UnderReview])->save();
            } elseif ($senderType === 'admin' && isset($data['status'])) {
                $newStatus = CaseStatus::tryFrom((string) $data['status']);
                if ($newStatus !== null) {
                    $lockedCase->forceFill(['status' => $newStatus])->save();
                }
            }

            return $caseMessage;
        }, 3);

        if (! $isInternal && in_array($senderType, ['admin', 'owner'], true)) {
            try {
                $freshCase = $case->fresh(['user', 'property', 'reservation']);
                if ($freshCase !== null) {
                    app(NotificationDispatcher::class)->dispatch(
                        eventType: 'grievance.status_updated',
                        recipients: $freshCase->user,
                        variables: [
                            'customer_name' => $freshCase->user->name,
                            'case_reference' => $freshCase->case_reference,
                            'property_name' => $freshCase->reservation->snapshot_property_name ?: $freshCase->property->name,
                            'case_status' => $freshCase->status->label(),
                            'reason' => Str::limit($message, 160),
                            'updated_at' => $caseMessage->created_at->setTimezone('Asia/Kolkata')->format('d M Y, H:i').' IST',
                            'action_url' => url("/my-support/{$freshCase->case_reference}"),
                        ],
                        related: $freshCase,
                        relatedReference: $freshCase->case_reference,
                        idempotencySeed: 'grievance_msg_'.$caseMessage->id
                    );
                }
            } catch (\Throwable $e) {
                Log::warning('Failed to dispatch grievance message notification: '.$e->getMessage(), [
                    'case_id' => $case->id,
                    'message_id' => $caseMessage->id,
                ]);
            }
        }

        return $caseMessage;
    }
}
