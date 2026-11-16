<?php

declare(strict_types=1);

namespace App\Actions\Admin\Properties;

use App\Enums\PropertyMediaModerationStatus;
use App\Enums\PropertyOperationalStatus;
use App\Enums\PropertyVerificationDocumentStatus;
use App\Enums\PropertyVerificationEventType;
use App\Enums\PropertyVerificationStatus;
use App\Models\Admin;
use App\Models\Property;
use App\Models\PropertyCategory;
use App\Models\PropertyMedia;
use App\Models\PropertyRoom;
use App\Models\PropertyRoomType;
use App\Models\PropertyVerificationApplication;
use App\Models\PropertyVerificationDocument;
use App\Models\PropertyVerificationEvent;
use App\Notifications\Owner\PropertyApplicationApprovedNotification;
use App\Services\PropertyMediaProcessor;
use App\Services\PropertyVerificationChecklist;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ApprovePropertyApplication
{
    public function __construct(
        public readonly PropertyVerificationChecklist $checklist,
        public readonly PropertyMediaProcessor $mediaProcessor,
    ) {}

    public function execute(
        Admin $actingAdmin,
        PropertyVerificationApplication $application,
        ?string $decisionReason = null,
        ?string $internalReviewerNotes = null,
    ): PropertyVerificationApplication {
        return DB::transaction(function () use (
            $actingAdmin,
            $application,
            $decisionReason,
            $internalReviewerNotes,
        ): PropertyVerificationApplication {
            $lockedApp = PropertyVerificationApplication::query()
                ->whereKey($application->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! $lockedApp->status->canApprove()) {
                throw ValidationException::withMessages([
                    'application' => sprintf(
                        'Property verification application must be Under Review before approval (currently "%s").',
                        $lockedApp->status->label(),
                    ),
                ]);
            }

            $lockedProperty = Property::query()
                ->whereKey($lockedApp->property_id)
                ->lockForUpdate()
                ->firstOrFail();

            $evaluation = $this->checklist->evaluate($lockedProperty, $lockedApp);

            if (! $evaluation['ready_for_admin_approval']) {
                throw ValidationException::withMessages([
                    'application' => $evaluation['admin_missing_approvals'][0]
                        ?? 'All property requirements, documents, room types, rooms, and photo moderations must pass before approval.',
                ]);
            }

            $now = now();
            $previousStatus = $lockedApp->status;
            $cleanDecisionReason = is_string($decisionReason) && trim($decisionReason) !== ''
                ? trim($decisionReason)
                : 'Property details, room types, physical rooms, photographs, and verification documents approved.';
            $cleanInternalNotes = is_string($internalReviewerNotes) && trim($internalReviewerNotes) !== ''
                ? trim($internalReviewerNotes)
                : $lockedApp->internal_reviewer_notes;

            $mediaIdsToUnpublish = [];

            if ($lockedApp->is_amendment && is_array($lockedApp->proposed_property_data)) {
                $proposed = $lockedApp->proposed_property_data;
                $promotedName = (string) ($proposed['name'] ?? $lockedProperty->name);

                $proposedCatId = (int) ($proposed['property_category_id'] ?? $lockedProperty->property_category_id);
                if (! PropertyCategory::query()->active()->whereKey($proposedCatId)->exists()) {
                    $proposedCatId = (int) (PropertyCategory::query()->where('slug', PropertyCategory::SLUG_HOSTELS_PG)->value('id') ?? $lockedProperty->property_category_id);
                }

                $lockedProperty->forceFill([
                    'property_category_id' => $proposedCatId,
                    'city_id' => (int) ($proposed['city_id'] ?? $lockedProperty->city_id),
                    'name' => $promotedName,
                    'slug' => Str::slug($promotedName).'-'.Str::lower($lockedProperty->property_reference),
                    'description' => (string) ($proposed['description'] ?? $lockedProperty->description),
                    'contact_person_name' => (string) ($proposed['contact_person_name'] ?? $lockedProperty->contact_person_name),
                    'contact_phone' => (string) ($proposed['contact_phone'] ?? $lockedProperty->contact_phone),
                    'contact_email' => $proposed['contact_email'] ?? $lockedProperty->contact_email,
                    'address_line_1' => (string) ($proposed['address_line_1'] ?? $lockedProperty->address_line_1),
                    'address_line_2' => $proposed['address_line_2'] ?? $lockedProperty->address_line_2,
                    'locality' => (string) ($proposed['locality'] ?? $lockedProperty->locality),
                    'landmark' => $proposed['landmark'] ?? $lockedProperty->landmark,
                    'postal_code' => (string) ($proposed['postal_code'] ?? $lockedProperty->postal_code),
                    'state' => (string) ($proposed['state'] ?? $lockedProperty->state),
                    'country_code' => (string) ($proposed['country_code'] ?? $lockedProperty->country_code),
                    'latitude' => $proposed['latitude'] ?? $lockedProperty->latitude,
                    'longitude' => $proposed['longitude'] ?? $lockedProperty->longitude,
                ])->save();

                // Promote staged field updates on previously approved room types.
                $pendingRoomTypes = PropertyRoomType::query()
                    ->where('property_id', $lockedProperty->id)
                    ->where('pending_changes_application_id', $lockedApp->id)
                    ->lockForUpdate()
                    ->get();

                foreach ($pendingRoomTypes as $roomType) {
                    $pending = is_array($roomType->pending_amendment_data) ? $roomType->pending_amendment_data : [];
                    $promotedRtName = (string) ($pending['name'] ?? $roomType->name);

                    $roomType->forceFill([
                        'name' => $promotedRtName,
                        'slug' => Str::slug($promotedRtName).'-'.$roomType->id,
                        'accommodation_mode' => $pending['accommodation_mode'] ?? $roomType->accommodation_mode->value,
                        'sharing_capacity' => array_key_exists('sharing_capacity', $pending)
                            ? $pending['sharing_capacity']
                            : $roomType->sharing_capacity,
                        'max_guests_per_room' => $pending['max_guests_per_room'] ?? $roomType->max_guests_per_room,
                        'is_air_conditioned' => array_key_exists('is_air_conditioned', $pending)
                            ? (bool) $pending['is_air_conditioned']
                            : $roomType->is_air_conditioned,
                        'gender_policy' => $pending['gender_policy'] ?? $roomType->gender_policy->value,
                        'guest_composition_policy' => $pending['guest_composition_policy'] ?? $roomType->guest_composition_policy,
                        'early_check_in_enabled' => array_key_exists('early_check_in_enabled', $pending)
                            ? (bool) $pending['early_check_in_enabled']
                            : $roomType->early_check_in_enabled,
                        'description' => array_key_exists('description', $pending)
                            ? $pending['description']
                            : $roomType->description,
                        'is_active' => array_key_exists('is_active', $pending)
                            ? (bool) $pending['is_active']
                            : $roomType->is_active,
                        'display_order' => $pending['display_order'] ?? $roomType->display_order,
                        'pending_amendment_data' => null,
                        'pending_changes_application_id' => null,
                        'is_approved_version' => true,
                    ])->save();
                }

                // Archive superseded/removed media from the previous approved set cleanly.
                $mediaPendingRemoval = PropertyMedia::query()
                    ->where('property_id', $lockedProperty->id)
                    ->where('pending_removal_in_application_id', $lockedApp->id)
                    ->lockForUpdate()
                    ->get();

                foreach ($mediaPendingRemoval as $oldMedia) {
                    $mediaIdsToUnpublish[] = $oldMedia->id;
                    $oldMedia->forceFill([
                        'is_archived' => true,
                        'is_cover' => false,
                        'pending_removal_in_application_id' => null,
                    ])->save();
                }

                // If the amendment designated a new approved cover, unset any older non-archived cover.
                $amendmentHasCover = PropertyMedia::query()
                    ->where('property_id', $lockedProperty->id)
                    ->where('property_verification_application_id', $lockedApp->id)
                    ->where('is_archived', false)
                    ->where('is_cover', true)
                    ->exists();

                if ($amendmentHasCover) {
                    PropertyMedia::query()
                        ->where('property_id', $lockedProperty->id)
                        ->where('property_verification_application_id', '!=', $lockedApp->id)
                        ->update(['is_cover' => false]);
                }
            }

            // Promote all newly created room types & physical rooms into approved inventory version.
            PropertyRoomType::query()
                ->where('property_id', $lockedProperty->id)
                ->update([
                    'is_approved_version' => true,
                    'amendment_application_id' => null,
                ]);

            PropertyRoom::query()
                ->where('property_id', $lockedProperty->id)
                ->update([
                    'is_approved_version' => true,
                    'amendment_application_id' => null,
                ]);

            // Mark submitted verification documents as Reviewed.
            PropertyVerificationDocument::query()
                ->where('application_id', $lockedApp->id)
                ->where('status', PropertyVerificationDocumentStatus::Uploaded->value)
                ->update([
                    'status' => PropertyVerificationDocumentStatus::Reviewed->value,
                    'reviewed_by_admin_id' => $actingAdmin->id,
                    'reviewed_at' => $now,
                ]);

            // Determine operational status on approval cleanly.
            $nextOperationalStatus = $lockedProperty->status === PropertyOperationalStatus::Draft
                ? PropertyOperationalStatus::Active
                : $lockedProperty->status;

            $bookingEligible = $nextOperationalStatus === PropertyOperationalStatus::Active;

            $lockedProperty->load(['category', 'city', 'roomTypes', 'rooms', 'media']);

            $immutableSnapshot = [
                'approved_at' => $now->toISOString(),
                'revision_number' => $lockedApp->revision_number,
                'application_number' => $lockedApp->application_number,
                'property' => $lockedProperty->toApprovedPropertyFieldsSnapshot(),
                'room_types' => $lockedProperty->roomTypes
                    ->map(static fn (PropertyRoomType $rt): array => $rt->toPortalArray())
                    ->values()
                    ->all(),
                'rooms_count' => $lockedProperty->rooms->count(),
                'approved_media_ids' => $lockedProperty->media
                    ->where('is_archived', false)
                    ->where('moderation_status', PropertyMediaModerationStatus::Approved)
                    ->pluck('id')
                    ->values()
                    ->all(),
            ];

            $lockedApp->forceFill([
                'status' => PropertyVerificationStatus::Approved,
                'active_property_id' => null,
                'assigned_admin_id' => $lockedApp->assigned_admin_id ?? $actingAdmin->id,
                'reviewed_by_admin_id' => $actingAdmin->id,
                'reviewed_at' => $now,
                'requested_information' => null,
                'requested_changes' => null,
                'decision_reason' => $cleanDecisionReason,
                'internal_reviewer_notes' => $cleanInternalNotes,
                'approved_snapshot' => $immutableSnapshot,
            ])->save();

            $lockedProperty->forceFill([
                'status' => $nextOperationalStatus,
                'is_verified' => true,
                'booking_eligible' => $bookingEligible,
                'approved_by_admin_id' => $actingAdmin->id,
                'approved_at' => $now,
                'latest_approved_application_id' => $lockedApp->id,
                'approved_snapshot' => $immutableSnapshot,
            ])->save();

            PropertyVerificationEvent::record(
                property: $lockedProperty,
                application: $lockedApp,
                eventType: $lockedApp->is_amendment
                    ? PropertyVerificationEventType::AmendmentPromoted
                    : PropertyVerificationEventType::ApplicationApproved,
                actorType: 'admin',
                actorId: $actingAdmin->id,
                actorName: $actingAdmin->name,
                previousStatus: $previousStatus,
                newStatus: PropertyVerificationStatus::Approved,
                notes: $cleanDecisionReason,
                metadata: [
                    'revision_number' => $lockedApp->revision_number,
                    'operational_status' => $nextOperationalStatus->value,
                    'booking_eligible' => $bookingEligible,
                ],
            );

            $mediaIdsToPublish = PropertyMedia::query()
                ->where('property_id', $lockedProperty->id)
                ->where('is_archived', false)
                ->where('moderation_status', PropertyMediaModerationStatus::Approved->value)
                ->pluck('id')
                ->all();

            $appId = $lockedApp->id;

            DB::afterCommit(function () use ($appId, $mediaIdsToUnpublish, $mediaIdsToPublish, $nextOperationalStatus): void {
                foreach ($mediaIdsToUnpublish as $mediaId) {
                    $this->mediaProcessor->scheduleUnpublication((int) $mediaId);
                }

                if ($nextOperationalStatus !== PropertyOperationalStatus::Suspended && $nextOperationalStatus !== PropertyOperationalStatus::Archived) {
                    foreach ($mediaIdsToPublish as $mediaId) {
                        $this->mediaProcessor->schedulePublication((int) $mediaId);
                    }
                }

                $app = PropertyVerificationApplication::query()->with('property.owner')->find($appId);
                if ($app?->property?->owner !== null) {
                    $app->property->owner->notify(new PropertyApplicationApprovedNotification($app));
                }
            });

            return $lockedApp->fresh() ?? $lockedApp;
        });
    }
}
