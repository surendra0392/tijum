import { Head, usePage } from '@inertiajs/react';
import { BusinessProfileForm } from '@/components/owner/onboarding/business-profile-form';
import { OnboardingProgress } from '@/components/owner/onboarding/onboarding-progress';
import { applicationStatusBadgeMap } from '@/components/owner/onboarding/status-helpers';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { dashboard } from '@/routes/owner';
import {
    businessProfile as businessProfileRoute,
    index as onboardingIndex,
} from '@/routes/owner/onboarding';
import type {
    OwnerBusinessProfileData,
    OwnerEntityTypeOption,
    OwnerVerificationApplicationData,
    PartnerOnboardingEvaluation,
} from '@/types';

type BusinessProfilePageProps = {
    application: OwnerVerificationApplicationData;
    businessProfile: OwnerBusinessProfileData | null;
    entityTypes: OwnerEntityTypeOption[];
    evaluation: PartnerOnboardingEvaluation;
    status?: string;
};

export default function BusinessProfilePage({
    application,
    businessProfile,
    entityTypes,
    evaluation,
    status,
}: BusinessProfilePageProps) {
    const owner = usePage().props.auth?.owner;

    return (
        <>
            <Head title="Business & Operator Profile · Partner Onboarding" />

            <div className="space-y-6">
                <PageHeader
                    eyebrow="Step 2 · Partner Onboarding"
                    title="Business & Operator Profile"
                    description="Provide your legal or individual operator identity, authorised contact, and business correspondence address."
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
                />

                <OnboardingProgress
                    steps={evaluation.steps}
                    currentStepKey="business_profile"
                    isEditable={application.is_editable}
                />

                {!application.is_editable && (
                    <Alert>
                        <AlertTitle>
                            Profile locked during verification
                        </AlertTitle>
                        <AlertDescription>
                            Business profile fields are read-only while this
                            application is {application.status_label}. Updates
                            reopen if additional information is requested or if
                            you start a new revision.
                        </AlertDescription>
                    </Alert>
                )}

                <BusinessProfileForm
                    businessProfile={businessProfile}
                    entityTypes={entityTypes}
                    defaultContactName={owner?.name ?? ''}
                    defaultEmail={owner?.email ?? ''}
                    isEditable={application.is_editable}
                    status={status}
                />
            </div>
        </>
    );
}

BusinessProfilePage.layout = {
    breadcrumbs: [
        { title: 'Partner Overview', href: dashboard() },
        { title: 'Partner Onboarding', href: onboardingIndex() },
        { title: 'Business Profile', href: businessProfileRoute() },
    ],
};
