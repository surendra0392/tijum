import { Head, Link, usePage } from '@inertiajs/react';
import {
    Building2,
    CheckCircle2,
    FileCheck2,
    FileUp,
    MailCheck,
    MapPin,
} from 'lucide-react';
import { CorrectionRequestPanel } from '@/components/owner/onboarding/correction-request-panel';
import { OnboardingProgress } from '@/components/owner/onboarding/onboarding-progress';
import { OnboardingStepCard } from '@/components/owner/onboarding/onboarding-step-card';
import { applicationStatusBadgeMap } from '@/components/owner/onboarding/status-helpers';
import { VerificationStatusPanel } from '@/components/owner/onboarding/verification-status-panel';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { dashboard } from '@/routes/owner';
import {
    businessProfile as businessProfileRoute,
    cities as citiesRoute,
    documents as documentsRoute,
    index as onboardingIndex,
    review as reviewRoute,
    status as statusRoute,
} from '@/routes/owner/onboarding';
import { notice as verificationNotice } from '@/routes/owner/verification';
import type {
    CityOption,
    OwnerBusinessProfileData,
    OwnerVerificationApplicationData,
    PartnerOnboardingEvaluation,
} from '@/types';

type OnboardingIndexProps = {
    application: OwnerVerificationApplicationData;
    businessProfile: OwnerBusinessProfileData | null;
    operatingCities: CityOption[];
    evaluation: PartnerOnboardingEvaluation;
    status?: string;
};

export default function PartnerOnboardingIndex({
    application,
    businessProfile,
    operatingCities,
    evaluation,
    status,
}: OnboardingIndexProps) {
    const owner = usePage().props.auth?.owner;
    const isEditable = application.is_editable;

    return (
        <>
            <Head title="Partner Onboarding" />

            <div className="space-y-6">
                {status === 'revision-started' && (
                    <Alert variant="success">
                        <CheckCircle2 aria-hidden="true" />
                        <AlertTitle>New application revision ready</AlertTitle>
                        <AlertDescription>
                            Your saved business profile and operating cities
                            were carried forward into draft{' '}
                            {application.application_number}. Review and upload
                            documents before submitting.
                        </AlertDescription>
                    </Alert>
                )}

                <PageHeader
                    eyebrow="TIJUM Partner Verification"
                    title="Partner Onboarding Workspace"
                    description="Verify your operator identity and business structure before onboarding individual properties in the next marketplace stage."
                    badges={
                        <>
                            <Badge variant="outline">
                                {application.application_number}
                            </Badge>
                            <StatusBadge
                                status={
                                    applicationStatusBadgeMap[
                                        application.status
                                    ] ?? 'neutral'
                                }
                                label={application.status_label}
                            />
                        </>
                    }
                    actions={
                        <Button variant="outline" asChild>
                            <Link href={statusRoute()}>
                                View Status &amp; History
                            </Link>
                        </Button>
                    }
                />

                <OnboardingProgress
                    steps={evaluation.steps}
                    currentStepKey="account_verification"
                    isEditable={isEditable}
                />

                <CorrectionRequestPanel
                    application={application}
                    checklist={evaluation.checklist}
                />

                {!evaluation.email_verified && (
                    <Alert variant="warning">
                        <MailCheck aria-hidden="true" />
                        <AlertTitle>Email verification required</AlertTitle>
                        <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                            <span>
                                Please verify {owner?.email} before submitting
                                your partner application. You can still save
                                draft details meanwhile.
                            </span>
                            <Button size="sm" variant="plum" asChild>
                                <Link href={verificationNotice()}>
                                    Verify Email Address
                                </Link>
                            </Button>
                        </AlertDescription>
                    </Alert>
                )}

                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    <OnboardingStepCard
                        stepNumber={1}
                        title="Account Verification"
                        description="Verified login email and operator phone status."
                        completed={evaluation.email_verified}
                        activeNeeded={!evaluation.email_verified}
                        icon={MailCheck}
                        href={verificationNotice.url()}
                        actionLabel={
                            evaluation.email_verified
                                ? 'Email Verified'
                                : 'Verify Email Address'
                        }
                        summaryText={
                            owner
                                ? `${owner.name} · ${owner.email}${owner.phone ? ` · Phone ${owner.phone} (OTP pending future phase)` : ''}`
                                : undefined
                        }
                    />

                    <OnboardingStepCard
                        stepNumber={2}
                        title="Business Profile"
                        description="Legal structure, display name, authorised contact, and address."
                        completed={evaluation.business_profile_complete}
                        activeNeeded={
                            evaluation.email_verified &&
                            !evaluation.business_profile_complete
                        }
                        icon={Building2}
                        href={businessProfileRoute.url()}
                        actionLabel={
                            isEditable
                                ? evaluation.business_profile_complete
                                    ? 'Edit Business Profile'
                                    : 'Complete Business Profile'
                                : 'View Business Profile'
                        }
                        summaryText={
                            businessProfile
                                ? `${businessProfile.display_business_name} · ${businessProfile.entity_type_label} · ${businessProfile.city}, ${businessProfile.state}`
                                : 'No business profile saved yet.'
                        }
                    />

                    <OnboardingStepCard
                        stepNumber={3}
                        title="Operating Cities"
                        description="Select intended TIJUM launch cities for your properties."
                        completed={evaluation.operating_cities_complete}
                        activeNeeded={
                            evaluation.business_profile_complete &&
                            !evaluation.operating_cities_complete
                        }
                        icon={MapPin}
                        href={citiesRoute.url()}
                        actionLabel={
                            isEditable
                                ? 'Select Operating Cities'
                                : 'View Selected Cities'
                        }
                        summaryText={
                            operatingCities.length > 0
                                ? operatingCities.map((c) => c.name).join(', ')
                                : 'Select at least one launch city (Hyderabad, Guntur, Vijayawada, or Visakhapatnam).'
                        }
                    />

                    <OnboardingStepCard
                        stepNumber={4}
                        title="Verification Documents"
                        description="Upload private PDF/JPG/PNG evidence matching your entity structure."
                        completed={evaluation.documents_complete}
                        activeNeeded={
                            evaluation.operating_cities_complete &&
                            !evaluation.documents_complete
                        }
                        icon={FileUp}
                        href={documentsRoute.url()}
                        actionLabel={
                            isEditable
                                ? 'Manage Documents'
                                : 'View Uploaded Documents'
                        }
                        summaryText={`${evaluation.checklist.filter((c) => c.fulfilled).length} document categories uploaded (${evaluation.required_document_types.length} required for your entity type).`}
                    />

                    <OnboardingStepCard
                        stepNumber={5}
                        title="Review & Submit"
                        description="Verify completeness, accept declaration, and submit to TIJUM."
                        completed={application.status !== 'draft'}
                        activeNeeded={
                            evaluation.ready_for_submission &&
                            application.status === 'draft'
                        }
                        icon={FileCheck2}
                        href={reviewRoute.url()}
                        actionLabel={
                            application.can_submit
                                ? 'Review & Submit'
                                : 'Review Submission Summary'
                        }
                        summaryText={
                            evaluation.ready_for_submission
                                ? 'All mandatory onboarding checks passed.'
                                : `${evaluation.missing_requirements.length} remaining requirement(s) before submission.`
                        }
                    />
                </div>

                <VerificationStatusPanel
                    application={application}
                    evaluation={evaluation}
                    canPublishProperties={Boolean(
                        owner?.can_publish_properties,
                    )}
                />
            </div>
        </>
    );
}

PartnerOnboardingIndex.layout = {
    breadcrumbs: [
        { title: 'Partner Overview', href: dashboard() },
        { title: 'Partner Onboarding', href: onboardingIndex() },
    ],
};
