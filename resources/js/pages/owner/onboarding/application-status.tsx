import { Head, Link, router, usePage } from '@inertiajs/react';
import { CheckCircle2, Clock, History, XCircle } from 'lucide-react';
import { useState } from 'react';
import { ApplicationSummary } from '@/components/owner/onboarding/application-summary';
import { CorrectionRequestPanel } from '@/components/owner/onboarding/correction-request-panel';
import { OnboardingProgress } from '@/components/owner/onboarding/onboarding-progress';
import {
    applicationStatusBadgeMap,
    formatIsoDateTime,
} from '@/components/owner/onboarding/status-helpers';
import { VerificationStatusPanel } from '@/components/owner/onboarding/verification-status-panel';
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { dashboard } from '@/routes/owner';
import {
    index as onboardingIndex,
    status as statusRoute,
    withdraw,
} from '@/routes/owner/onboarding';
import type {
    CityOption,
    OwnerBusinessProfileData,
    OwnerVerificationApplicationData,
    PartnerOnboardingEvaluation,
    VerificationEventData,
} from '@/types';

type ApplicationStatusPageProps = {
    application: OwnerVerificationApplicationData | null;
    applicationsHistory: OwnerVerificationApplicationData[];
    businessProfile: OwnerBusinessProfileData | null;
    operatingCities: CityOption[];
    evaluation: PartnerOnboardingEvaluation;
    events: VerificationEventData[];
    status?: string;
};

export default function ApplicationStatusPage({
    application,
    applicationsHistory,
    businessProfile,
    operatingCities,
    evaluation,
    events,
    status,
}: ApplicationStatusPageProps) {
    const owner = usePage().props.auth?.owner;
    const [withdrawing, setWithdrawing] = useState(false);

    const handleWithdraw = () => {
        setWithdrawing(true);
        router.post(
            withdraw.url(),
            {},
            {
                preserveScroll: true,
                onFinish: () => setWithdrawing(false),
            },
        );
    };

    return (
        <>
            <Head title="Partner Verification Status" />

            <div className="space-y-6">
                {status === 'application-submitted' && (
                    <Alert variant="success">
                        <CheckCircle2 aria-hidden="true" />
                        <AlertTitle>Partner application submitted</AlertTitle>
                        <AlertDescription>
                            Your verification application has been received and
                            entered into TIJUM&apos;s administrative review
                            queue.
                        </AlertDescription>
                    </Alert>
                )}

                {status === 'application-withdrawn' && (
                    <Alert>
                        <AlertTitle>Application withdrawn</AlertTitle>
                        <AlertDescription>
                            Your active application was withdrawn. You may start
                            a new application revision anytime while keeping
                            your saved business details.
                        </AlertDescription>
                    </Alert>
                )}

                <PageHeader
                    eyebrow="TIJUM Partner Verification"
                    title="Verification Status & History"
                    description="Track review progress, respond to information requests, and view your historical verification timeline."
                    actions={
                        <div className="flex flex-wrap gap-2">
                            {application?.can_withdraw && (
                                <ConfirmationDialog
                                    title="Withdraw partner application?"
                                    description="Withdrawing moves your application to terminal Withdrawn status. Saved business details and cities remain intact if you start a new revision later."
                                    confirmLabel="Withdraw Application"
                                    tone="destructive"
                                    loading={withdrawing}
                                    onConfirm={handleWithdraw}
                                    trigger={
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="text-status-error-fg hover:bg-status-error-bg"
                                        >
                                            <XCircle aria-hidden="true" />
                                            <span>Withdraw Application</span>
                                        </Button>
                                    }
                                />
                            )}
                            <Button variant="outline" asChild>
                                <Link href={onboardingIndex()}>
                                    Back to Onboarding
                                </Link>
                            </Button>
                        </div>
                    }
                />

                <OnboardingProgress
                    steps={evaluation.steps}
                    currentStepKey="status"
                    isEditable={application?.is_editable ?? false}
                />

                {application && (
                    <CorrectionRequestPanel
                        application={application}
                        checklist={evaluation.checklist}
                    />
                )}

                <VerificationStatusPanel
                    application={application}
                    evaluation={evaluation}
                    canPublishProperties={Boolean(
                        owner?.can_publish_properties,
                    )}
                />

                <ApplicationSummary
                    owner={owner}
                    businessProfile={businessProfile}
                    operatingCities={operatingCities}
                    checklist={evaluation.checklist}
                />

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <History
                                className="size-4.5 text-tijum-coral"
                                aria-hidden="true"
                            />
                            <CardTitle className="text-lg">
                                Verification Activity Timeline
                            </CardTitle>
                        </div>
                        <CardDescription>
                            Chronological record of actions recorded on this
                            application
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {events.length === 0 ? (
                            <p className="text-sm text-tijum-plum-muted dark:text-muted-foreground">
                                No verification events recorded yet.
                            </p>
                        ) : (
                            <ol className="space-y-3">
                                {events.map((event) => (
                                    <li
                                        key={event.id}
                                        className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 px-4 py-3 text-sm dark:border-border dark:bg-muted/45"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <p className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                                                {event.event_label}
                                            </p>
                                            <span className="inline-flex items-center gap-1 text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                <Clock
                                                    className="size-3.5"
                                                    aria-hidden="true"
                                                />
                                                {formatIsoDateTime(
                                                    event.created_at,
                                                )}
                                            </span>
                                        </div>
                                        {event.notes && (
                                            <p className="mt-1 text-xs leading-relaxed text-tijum-plum dark:text-foreground">
                                                {event.notes}
                                            </p>
                                        )}
                                        <p className="mt-1 text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                            Actor: {event.actor_name}
                                        </p>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </CardContent>
                </Card>

                {applicationsHistory.length > 1 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                Historical Submissions
                            </CardTitle>
                            <CardDescription>
                                Previous application revisions retained for
                                audit compliance
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2 text-sm">
                                {applicationsHistory.map((item) => (
                                    <li
                                        key={item.id}
                                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-tijum-surface px-4 py-2.5 dark:border-border dark:bg-muted/30"
                                    >
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge variant="outline">
                                                {item.application_number}
                                            </Badge>
                                            <span className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                Revision #{item.revision_number}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <StatusBadge
                                                status={
                                                    applicationStatusBadgeMap[
                                                        item.status
                                                    ] ?? 'neutral'
                                                }
                                                label={item.status_label}
                                            />
                                            <span className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                {formatIsoDateTime(
                                                    item.submitted_at ??
                                                        item.created_at,
                                                )}
                                            </span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                )}
            </div>
        </>
    );
}

ApplicationStatusPage.layout = {
    breadcrumbs: [
        { title: 'Partner Overview', href: dashboard() },
        { title: 'Verification Status', href: statusRoute() },
    ],
};
