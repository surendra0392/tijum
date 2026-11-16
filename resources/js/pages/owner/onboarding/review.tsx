import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { AlertTriangle, CheckCircle2, Send } from 'lucide-react';
import type { FormEvent } from 'react';
import { ApplicationSummary } from '@/components/owner/onboarding/application-summary';
import { OnboardingProgress } from '@/components/owner/onboarding/onboarding-progress';
import { applicationStatusBadgeMap } from '@/components/owner/onboarding/status-helpers';
import { FormField } from '@/components/shared/form-field';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { dashboard } from '@/routes/owner';
import {
    businessProfile as businessProfileRoute,
    cities as citiesRoute,
    documents as documentsRoute,
    index as onboardingIndex,
    review as reviewRoute,
    submit,
} from '@/routes/owner/onboarding';
import type {
    CityOption,
    OwnerBusinessProfileData,
    OwnerVerificationApplicationData,
    PartnerOnboardingEvaluation,
} from '@/types';

type ReviewApplicationPageProps = {
    application: OwnerVerificationApplicationData;
    businessProfile: OwnerBusinessProfileData | null;
    operatingCities: CityOption[];
    evaluation: PartnerOnboardingEvaluation;
    declarationVersion: string;
};

export default function ReviewApplicationPage({
    application,
    businessProfile,
    operatingCities,
    evaluation,
    declarationVersion,
}: ReviewApplicationPageProps) {
    const owner = usePage().props.auth?.owner;

    const form = useForm<{
        declaration_accepted: boolean;
        notes: string;
    }>({
        declaration_accepted: false,
        notes: '',
    });

    const canSubmitNow =
        application.can_submit && evaluation.ready_for_submission;

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!canSubmitNow) {
            return;
        }
        form.post(submit.url(), {
            preserveScroll: true,
        });
    };

    const formErrors = form.errors as Record<string, string | undefined>;

    return (
        <>
            <Head title="Review & Submit Application · Partner Onboarding" />

            <div className="space-y-6">
                <PageHeader
                    eyebrow="Step 5 · Partner Onboarding"
                    title="Review & Submit Partner Application"
                    description="Confirm all partner details, operating cities, and verification uploads before submitting to the TIJUM verification team."
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
                    currentStepKey="review"
                    isEditable={application.is_editable}
                />

                {!evaluation.ready_for_submission && (
                    <Alert variant="warning">
                        <AlertTriangle aria-hidden="true" />
                        <AlertTitle>
                            Complete remaining requirements before submitting
                        </AlertTitle>
                        <AlertDescription className="space-y-3">
                            <ul className="list-inside list-disc space-y-1 text-sm">
                                {evaluation.missing_requirements.map((req) => (
                                    <li key={req}>{req}</li>
                                ))}
                            </ul>
                            <div className="flex flex-wrap gap-2">
                                {!evaluation.business_profile_complete && (
                                    <Button size="sm" variant="outline" asChild>
                                        <Link href={businessProfileRoute()}>
                                            Edit Business Profile
                                        </Link>
                                    </Button>
                                )}
                                {!evaluation.operating_cities_complete && (
                                    <Button size="sm" variant="outline" asChild>
                                        <Link href={citiesRoute()}>
                                            Select Operating Cities
                                        </Link>
                                    </Button>
                                )}
                                {!evaluation.documents_complete && (
                                    <Button size="sm" variant="outline" asChild>
                                        <Link href={documentsRoute()}>
                                            Upload Verification Documents
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </AlertDescription>
                    </Alert>
                )}

                {evaluation.ready_for_submission && application.can_submit && (
                    <Alert variant="success">
                        <CheckCircle2 aria-hidden="true" />
                        <AlertTitle>
                            Ready for verification submission
                        </AlertTitle>
                        <AlertDescription>
                            All mandatory profile details, launch cities, and
                            entity verification documents are complete.
                        </AlertDescription>
                    </Alert>
                )}

                <ApplicationSummary
                    owner={owner}
                    businessProfile={businessProfile}
                    operatingCities={operatingCities}
                    checklist={evaluation.checklist}
                />

                <form onSubmit={handleSubmit}>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">
                                Declaration &amp; Consent (v
                                {declarationVersion})
                            </CardTitle>
                            <CardDescription>
                                Partner verification assesses your operator
                                account eligibility. Commercial terms and
                                individual property approvals are handled
                                separately.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            <FormField
                                id="submission_notes"
                                label="Notes for Verification Reviewer (Optional)"
                                error={
                                    formErrors.notes ?? formErrors.application
                                }
                            >
                                {(a11yProps) => (
                                    <Textarea
                                        {...a11yProps}
                                        name="notes"
                                        rows={3}
                                        value={form.data.notes}
                                        disabled={!application.can_submit}
                                        placeholder="Optional context about your documents or corrections."
                                        onChange={(e) =>
                                            form.setData(
                                                'notes',
                                                e.target.value,
                                            )
                                        }
                                    />
                                )}
                            </FormField>

                            <label
                                htmlFor="declaration_accepted"
                                className="flex cursor-pointer items-start gap-3 rounded-xl border border-tijum-surface bg-tijum-cream/55 p-4 dark:border-border dark:bg-muted/45"
                            >
                                <input
                                    id="declaration_accepted"
                                    type="checkbox"
                                    name="declaration_accepted"
                                    checked={form.data.declaration_accepted}
                                    disabled={!application.can_submit}
                                    onChange={(e) =>
                                        form.setData(
                                            'declaration_accepted',
                                            e.target.checked,
                                        )
                                    }
                                    className="mt-1 size-4 shrink-0 rounded accent-tijum-plum dark:accent-tijum-coral"
                                />
                                <span className="text-sm leading-relaxed text-tijum-plum dark:text-foreground">
                                    I confirm that the operator details,
                                    intended operating cities, and uploaded
                                    verification documents are true and
                                    accurate, and I authorise TIJUM to review
                                    this information for partner verification.
                                </span>
                            </label>

                            {formErrors.declaration_accepted && (
                                <p
                                    role="alert"
                                    className="text-sm font-medium text-destructive"
                                >
                                    {formErrors.declaration_accepted}
                                </p>
                            )}
                        </CardContent>

                        <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t border-tijum-surface/70 pt-4 dark:border-border">
                            <Button variant="outline" asChild>
                                <Link href={documentsRoute()}>
                                    Back to Documents
                                </Link>
                            </Button>

                            {application.can_submit && (
                                <Button
                                    type="submit"
                                    disabled={!canSubmitNow || form.processing}
                                    loading={form.processing}
                                    data-test="submit-partner-application-button"
                                >
                                    <Send aria-hidden="true" />
                                    <span>
                                        {application.status ===
                                        'needs_information'
                                            ? 'Resubmit Corrected Application'
                                            : 'Submit Partner Application'}
                                    </span>
                                </Button>
                            )}
                        </CardFooter>
                    </Card>
                </form>
            </div>
        </>
    );
}

ReviewApplicationPage.layout = {
    breadcrumbs: [
        { title: 'Partner Overview', href: dashboard() },
        { title: 'Partner Onboarding', href: onboardingIndex() },
        { title: 'Review & Submit', href: reviewRoute() },
    ],
};
