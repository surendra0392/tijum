import { Head } from '@inertiajs/react';
import { OnboardingProgress } from '@/components/owner/onboarding/onboarding-progress';
import { OperatingCitySelector } from '@/components/owner/onboarding/operating-city-selector';
import { applicationStatusBadgeMap } from '@/components/owner/onboarding/status-helpers';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { dashboard } from '@/routes/owner';
import {
    cities as citiesRoute,
    index as onboardingIndex,
} from '@/routes/owner/onboarding';
import type {
    CityOption,
    OwnerVerificationApplicationData,
    PartnerOnboardingEvaluation,
} from '@/types';

type OperatingCitiesPageProps = {
    application: OwnerVerificationApplicationData;
    cities: CityOption[];
    selectedCityIds: number[];
    evaluation: PartnerOnboardingEvaluation;
    status?: string;
};

export default function OperatingCitiesPage({
    application,
    cities,
    selectedCityIds,
    evaluation,
    status,
}: OperatingCitiesPageProps) {
    return (
        <>
            <Head title="Operating Cities · Partner Onboarding" />

            <div className="space-y-6">
                <PageHeader
                    eyebrow="Step 3 · Partner Onboarding"
                    title="Intended Operating Cities"
                    description="Choose the TIJUM launch cities where your accommodation business plans to partner."
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
                    currentStepKey="operating_cities"
                    isEditable={application.is_editable}
                />

                {!application.is_editable && (
                    <Alert>
                        <AlertTitle>City selection locked</AlertTitle>
                        <AlertDescription>
                            Intended operating cities cannot be changed while
                            the application is {application.status_label}.
                        </AlertDescription>
                    </Alert>
                )}

                <OperatingCitySelector
                    cities={cities}
                    selectedCityIds={selectedCityIds}
                    isEditable={application.is_editable}
                    status={status}
                />
            </div>
        </>
    );
}

OperatingCitiesPage.layout = {
    breadcrumbs: [
        { title: 'Partner Overview', href: dashboard() },
        { title: 'Partner Onboarding', href: onboardingIndex() },
        { title: 'Operating Cities', href: citiesRoute() },
    ],
};
