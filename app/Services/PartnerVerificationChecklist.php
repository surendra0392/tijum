<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\OwnerEntityType;
use App\Enums\OwnerVerificationDocumentStatus;
use App\Enums\OwnerVerificationDocumentType;
use App\Enums\OwnerVerificationStatus;
use App\Models\Owner;
use App\Models\OwnerBusinessProfile;
use App\Models\OwnerVerificationApplication;
use App\Models\OwnerVerificationDocument;

class PartnerVerificationChecklist
{
    /**
     * Evaluate readiness, document checklist items, and onboarding step states for an owner.
     *
     * @return array{
     *     email_verified: bool,
     *     business_profile_saved: bool,
     *     business_profile_complete: bool,
     *     operating_cities_count: int,
     *     operating_cities_complete: bool,
     *     entity_type: string|null,
     *     required_document_types: list<string>,
     *     missing_requirements: list<string>,
     *     unresolved_rejected_documents_count: int,
     *     documents_complete: bool,
     *     ready_for_submission: bool,
     *     checklist: list<array{
     *         type: string,
     *         label: string,
     *         guidance: string,
     *         accepted_formats: string,
     *         required: bool,
     *         fulfilled: bool,
     *         document: array<string, mixed>|null,
     *     }>,
     *     steps: list<array{
     *         key: string,
     *         number: int,
     *         title: string,
     *         description: string,
     *         completed: bool,
     *         active_needed: bool,
     *     }>,
     * }
     */
    public function evaluate(Owner $owner, ?OwnerVerificationApplication $application = null): array
    {
        $owner->loadMissing(['businessProfile', 'operatingCities']);

        if ($application instanceof OwnerVerificationApplication) {
            $application->loadMissing(['documents']);
        }

        $profile = $owner->businessProfile;
        $entityType = $profile instanceof OwnerBusinessProfile
            ? $profile->entity_type
            : OwnerEntityType::Individual;

        $emailVerified = $owner->hasVerifiedEmail();
        $businessProfileSaved = $profile instanceof OwnerBusinessProfile;
        $businessProfileComplete = $profile instanceof OwnerBusinessProfile && $profile->isComplete();

        $activeCitiesCount = $owner->operatingCities
            ->filter(static fn ($city): bool => (bool) $city->is_active)
            ->count();
        $operatingCitiesComplete = $activeCitiesCount > 0;

        $documents = $application instanceof OwnerVerificationApplication
            ? $application->documents
            : collect();

        $activeDocumentsByType = [];
        $unresolvedRejectedCount = 0;

        foreach ($documents as $document) {
            if (! $document instanceof OwnerVerificationDocument) {
                continue;
            }

            if ($document->status === OwnerVerificationDocumentStatus::Replaced) {
                continue;
            }

            if ($document->status === OwnerVerificationDocumentStatus::Rejected) {
                $unresolvedRejectedCount++;
            }

            $key = $document->document_type->value;
            if (! isset($activeDocumentsByType[$key])) {
                $activeDocumentsByType[$key] = $document;
            }
        }

        $requiredTypes = $entityType->requiredDocumentTypes();
        $checklist = [];
        $missingRequirements = [];

        if (! $emailVerified) {
            $missingRequirements[] = 'Verify your partner email address before submitting an application.';
        }

        if (! $businessProfileComplete) {
            $missingRequirements[] = 'Complete your operator or business profile and correspondence address.';
        }

        if (! $operatingCitiesComplete) {
            $missingRequirements[] = 'Select at least one active TIJUM launch city where you plan to operate.';
        }

        $requiredDocumentsMet = true;

        foreach (OwnerVerificationDocumentType::cases() as $docType) {
            $isRequired = $entityType->requiresDocumentType($docType);
            $activeDoc = $activeDocumentsByType[$docType->value] ?? null;
            $isFulfilled = $activeDoc instanceof OwnerVerificationDocument
                && $activeDoc->status !== OwnerVerificationDocumentStatus::Rejected;

            if ($isRequired && ! $isFulfilled) {
                $requiredDocumentsMet = false;

                if ($activeDoc instanceof OwnerVerificationDocument && $activeDoc->status === OwnerVerificationDocumentStatus::Rejected) {
                    $missingRequirements[] = sprintf('Replace rejected document: %s.', $docType->label());
                } else {
                    $missingRequirements[] = sprintf('Upload required document: %s.', $docType->label());
                }
            } elseif (! $isRequired && $activeDoc instanceof OwnerVerificationDocument && $activeDoc->status === OwnerVerificationDocumentStatus::Rejected) {
                $missingRequirements[] = sprintf('Replace or resolve flagged document: %s.', $docType->label());
            }

            $checklist[] = [
                'type' => $docType->value,
                'label' => $docType->label(),
                'guidance' => $docType->guidance(),
                'accepted_formats' => $docType->acceptedFormatsLabel(),
                'required' => $isRequired,
                'fulfilled' => $isFulfilled,
                'document' => $activeDoc instanceof OwnerVerificationDocument ? $activeDoc->toOwnerArray() : null,
            ];
        }

        $documentsComplete = $businessProfileSaved && $requiredDocumentsMet && $unresolvedRejectedCount === 0;
        $readyForSubmission = $emailVerified
            && $businessProfileComplete
            && $operatingCitiesComplete
            && $documentsComplete;

        $isSubmittedOrBeyond = $application instanceof OwnerVerificationApplication
            && $application->status !== OwnerVerificationStatus::Draft;

        $steps = [
            [
                'key' => 'account_verification',
                'number' => 1,
                'title' => 'Account Verification',
                'description' => 'Verified partner email address required before submission.',
                'completed' => $emailVerified,
                'active_needed' => ! $emailVerified,
            ],
            [
                'key' => 'business_profile',
                'number' => 2,
                'title' => 'Business Profile',
                'description' => 'Operator entity structure, authorised contact, and address.',
                'completed' => $businessProfileComplete,
                'active_needed' => $emailVerified && ! $businessProfileComplete,
            ],
            [
                'key' => 'operating_cities',
                'number' => 3,
                'title' => 'Operating Cities',
                'description' => 'Select launch cities where you plan to partner.',
                'completed' => $operatingCitiesComplete,
                'active_needed' => $businessProfileComplete && ! $operatingCitiesComplete,
            ],
            [
                'key' => 'documents',
                'number' => 4,
                'title' => 'Verification Documents',
                'description' => 'Upload identity and entity proof matching your operator type.',
                'completed' => $documentsComplete,
                'active_needed' => $operatingCitiesComplete && ! $documentsComplete,
            ],
            [
                'key' => 'review',
                'number' => 5,
                'title' => 'Review & Submit',
                'description' => 'Confirm accuracy, sign declaration, and submit for TIJUM review.',
                'completed' => $isSubmittedOrBeyond,
                'active_needed' => $readyForSubmission && ! $isSubmittedOrBeyond,
            ],
        ];

        return [
            'email_verified' => $emailVerified,
            'business_profile_saved' => $businessProfileSaved,
            'business_profile_complete' => $businessProfileComplete,
            'operating_cities_count' => $activeCitiesCount,
            'operating_cities_complete' => $operatingCitiesComplete,
            'entity_type' => $profile?->entity_type->value,
            'required_document_types' => array_map(
                static fn (OwnerVerificationDocumentType $type): string => $type->value,
                $requiredTypes,
            ),
            'missing_requirements' => $missingRequirements,
            'unresolved_rejected_documents_count' => $unresolvedRejectedCount,
            'documents_complete' => $documentsComplete,
            'ready_for_submission' => $readyForSubmission,
            'checklist' => $checklist,
            'steps' => $steps,
        ];
    }
}
