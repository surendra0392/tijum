<?php

declare(strict_types=1);

namespace App\Actions\Protection;

use App\Enums\CaseCategory;
use App\Enums\CasePriority;
use App\Enums\CaseStatus;
use App\Models\Admin;
use App\Models\CustomerProtectionCase;
use App\Models\CustomerProtectionCaseMessage;
use App\Models\Reservation;
use App\Models\User;
use App\Services\Notifications\NotificationDispatcher;
use Carbon\CarbonImmutable;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CreateProtectionCase
{
    /**
     * @param  array{
     *     category: string,
     *     description: string,
     *     priority?: string|null,
     *     attachment?: UploadedFile|null,
     * }  $data
     */
    public function execute(
        Reservation $reservation,
        User $user,
        array $data,
        string $senderRole = 'customer',
    ): CustomerProtectionCase {
        if ($reservation->user_id !== $user->id) {
            throw ValidationException::withMessages([
                'reservation' => 'You are not authorised to create a support case for this reservation.',
            ]);
        }

        $category = CaseCategory::tryFrom((string) $data['category']);
        if ($category === null) {
            throw ValidationException::withMessages([
                'category' => 'Please select a valid problem category.',
            ]);
        }

        $description = trim((string) ($data['description'] ?? ''));
        if (mb_strlen($description) < 10) {
            throw ValidationException::withMessages([
                'description' => 'Please provide at least 10 characters describing the issue.',
            ]);
        }

        $priority = $category->isSafetyUrgent()
            ? CasePriority::Urgent
            : (isset($data['priority']) && CasePriority::tryFrom((string) $data['priority']) ? CasePriority::from((string) $data['priority']) : CasePriority::Standard);

        $now = CarbonImmutable::now();
        // Consumer Protection E-Commerce Rules: 1 month redressal SLA (30 days default)
        $slaDue = $now->addDays((int) config('tijum.customer_protection.sla.resolution_days', 30));
        $reference = 'TPC-'.$now->format('Y').'-'.strtoupper(Str::ulid()->toBase32());

        $createdCase = DB::transaction(function () use (
            $reservation,
            $user,
            $category,
            $priority,
            $description,
            $reference,
            $slaDue,
            $senderRole,
            $data,
        ): CustomerProtectionCase {
            $lockedReservation = Reservation::query()->whereKey($reservation->id)->lockForUpdate()->firstOrFail();

            /** @var CustomerProtectionCase $case */
            $case = CustomerProtectionCase::create([
                'case_reference' => $reference,
                'reservation_id' => $lockedReservation->id,
                'user_id' => $user->id,
                'property_id' => $lockedReservation->property_id,
                'owner_id' => $lockedReservation->property->owner_id,
                'category' => $category,
                'status' => CaseStatus::Open,
                'priority' => $priority,
                'description' => $description,
                'sla_due_at' => $slaDue,
            ]);

            $attachment = $data['attachment'] ?? null;
            $attachmentPath = null;
            $attachmentName = null;
            $attachmentMime = null;

            if ($attachment instanceof UploadedFile && $attachment->isValid()) {
                $disk = (string) config('tijum.customer_protection.attachments.disk', 'local');
                $attachmentPath = $attachment->store("protection_cases/{$case->id}", $disk);
                $attachmentName = $attachment->getClientOriginalName();
                $attachmentMime = $attachment->getClientMimeType();
            }

            // Create the first message in the chronological case thread
            CustomerProtectionCaseMessage::create([
                'customer_protection_case_id' => $case->id,
                'sender_type' => $senderRole,
                'sender_id' => $user->id,
                'sender_name' => $user->name,
                'message' => $description,
                'attachment_path' => $attachmentPath,
                'attachment_name' => $attachmentName,
                'attachment_mime' => $attachmentMime,
                'is_internal_note' => false,
            ]);

            // Flag reservation for refund review if confirmed stay had owner cancellation or serious issue
            if ($category === CaseCategory::OwnerCancelled || $category === CaseCategory::PropertyUnavailable) {
                $lockedReservation->forceFill(['requires_refund_review' => true])->save();
            }

            return $case->fresh() ?? $case;
        }, 3);

        if ($createdCase->priority === CasePriority::Urgent) {
            try {
                $admins = Admin::query()->where('is_active', true)->get();
                $dispatcher = app(NotificationDispatcher::class);
                foreach ($admins as $admin) {
                    $dispatcher->dispatch(
                        eventType: 'admin.customer_protection_urgent',
                        recipients: $admin,
                        variables: [
                            'case_reference' => $createdCase->case_reference,
                            'category' => $createdCase->category->value,
                            'reservation_code' => $reservation->booking_reference,
                            'booking_reference' => $reservation->booking_reference,
                            'customer_name' => $user->name,
                        ],
                        idempotencySeed: 'urgent_case_'.$createdCase->id.'_'.$admin->id
                    );
                }
            } catch (\Throwable) {
            }
        }

        return $createdCase;
    }
}
