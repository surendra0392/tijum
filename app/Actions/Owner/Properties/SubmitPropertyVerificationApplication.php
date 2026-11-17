<?php

declare(strict_types=1);

namespace App\Actions\Owner\Properties;

use App\Enums\PropertyVerificationEventType;
use App\Enums\PropertyVerificationStatus;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyVerificationApplication;
use App\Models\PropertyVerificationEvent;
use App\Notifications\Owner\PropertyApplicationSubmittedNotification;
use App\Services\Notifications\NotificationDispatcher;
use App\Services\PropertyVerificationChecklist;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class SubmitPropertyVerificationApplication
{
    public function __construct(
        public readonly PropertyVerificationChecklist $checklist,
    ) {}

    public function execute(
        Owner $owner,
        Property $property,
        bool $declarationAccepted,
    ): PropertyVerificationApplication {
        if (! $declarationAccepted) {
            throw ValidationException::withMessages([
                'declaration_accepted' => 'You must confirm accuracy of property, room-type, photo, and legal declarations before submitting.',
            ]);
        }

        return DB::transaction(function () use ($owner, $property): PropertyVerificationApplication {
            $lockedProperty = Property::query()
                ->whereKey($property->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedProperty->owner_id !== $owner->id || ! $owner->canPublishProperties()) {
                throw ValidationException::withMessages([
                    'application' => 'Only verified, Active partners may submit property applications.',
                ]);
            }

            $lockedApp = $lockedProperty->activeVerificationApplication()
                ->lockForUpdate()
                ->first();

            if (! $lockedApp instanceof PropertyVerificationApplication || ! $lockedApp->status->canSubmitByOwner()) {
                throw ValidationException::withMessages([
                    'application' => 'This property verification application cannot be submitted in its current state.',
                ]);
            }

            $evaluation = $this->checklist->evaluate($lockedProperty, $lockedApp);

            if (! $evaluation['ready_for_submission']) {
                throw ValidationException::withMessages([
                    'application' => $evaluation['missing_requirements'][0]
                        ?? 'Complete all property, room type, physical room, photo, and verification document requirements before submitting.',
                ]);
            }

            $previousStatus = $lockedApp->status;
            $isResubmission = $previousStatus === PropertyVerificationStatus::NeedsInformation;
            $now = now();

            $lockedApp->forceFill([
                'status' => PropertyVerificationStatus::Submitted,
                'declaration_version' => (string) config('tijum.property_verification.declaration_version', '2026.1'),
                'declaration_accepted_at' => $now,
                'submitted_at' => $now,
                'requested_information' => null,
                'requested_changes' => null,
            ])->save();

            PropertyVerificationEvent::record(
                property: $lockedProperty,
                application: $lockedApp,
                eventType: $isResubmission
                    ? PropertyVerificationEventType::ApplicationResubmitted
                    : PropertyVerificationEventType::ApplicationSubmitted,
                actorType: 'owner',
                actorId: $owner->id,
                actorName: $owner->name,
                previousStatus: $previousStatus,
                newStatus: PropertyVerificationStatus::Submitted,
                notes: $lockedApp->is_amendment
                    ? sprintf('Submitted Re-Verification Amendment (%s) for administrative review.', $lockedApp->application_number)
                    : sprintf('Submitted property verification application (%s) for review.', $lockedApp->application_number),
            );

            $appId = $lockedApp->id;

            DB::afterCommit(static function () use ($appId, $isResubmission): void {
                $app = PropertyVerificationApplication::query()
                    ->with('property.owner')
                    ->find($appId);

                if ($app?->property?->owner !== null) {
                    $owner = $app->property->owner;
                    $owner->notify(
                        new PropertyApplicationSubmittedNotification($app, $isResubmission),
                    );

                    try {
                        $submittedAt = ($app->submitted_at ?? now())->setTimezone('Asia/Kolkata')->format('d M Y, H:i').' IST';
                        $dispatcher = app(NotificationDispatcher::class);

                        $dispatcher->dispatch(
                            eventType: 'partner.property.submitted',
                            recipients: $owner,
                            variables: [
                                'owner_name' => $owner->name,
                                'property_name' => $app->property->name,
                                'submission_reference' => $app->application_number,
                                'submitted_at' => $submittedAt,
                                'action_url' => route('owner.properties.verification.show', $app->property_id),
                            ],
                            related: $app,
                            relatedReference: $app->application_number,
                            idempotencySeed: 'partner_property_submitted_'.$app->id.'_'.$app->revision_number
                        );

                        $dispatcher->dispatchToAdmins(
                            eventType: 'admin.property_review_required',
                            variables: [
                                'property_name' => $app->property->name,
                                'owner_name' => $owner->name,
                                'submission_reference' => $app->application_number,
                                'submitted_at' => $submittedAt,
                                'action_url' => route('admin.properties.show', $app->property_id),
                            ],
                            related: $app,
                            relatedReference: $app->application_number,
                            idempotencySeed: 'admin_property_review_'.$app->id.'_'.$app->revision_number
                        );
                    } catch (\Throwable $e) {
                        Log::warning('Failed to dispatch property submission notification: '.$e->getMessage(), [
                            'application_id' => $app->id,
                        ]);
                    }
                }
            });

            return $lockedApp->fresh() ?? $lockedApp;
        });
    }
}
