import { Link } from '@inertiajs/react';
import {
    CheckCircle2,
    Clock,
    FileCheck2,
    RotateCcw,
    ShieldAlert,
    ShieldCheck,
} from 'lucide-react';
import {
    applicationStatusBadgeMap,
    formatIsoDateTime,
} from '@/components/owner/onboarding/status-helpers';
import { StatusBadge } from '@/components/shared/status-badge';
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
import {
    index as onboardingIndex,
    review,
    startRevision,
    status as statusRoute,
} from '@/routes/owner/onboarding';
import type {
    OwnerVerificationApplicationData,
    PartnerOnboardingEvaluation,
} from '@/types';

type VerificationStatusPanelProps = {
    application: OwnerVerificationApplicationData | null;
    evaluation: PartnerOnboardingEvaluation;
    canPublishProperties: boolean;
    showStartRevisionButton?: boolean;
};

export function VerificationStatusPanel({
    application,
    evaluation,
    canPublishProperties,
    showStartRevisionButton = true,
}: VerificationStatusPanelProps) {
    if (!application) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Partner Application Status</CardTitle>
                    <CardDescription>
                        Your partner application is not yet started.
                    </CardDescription>
                </CardHeader>
                <CardFooter>
                    <Button asChild>
                        <Link href={onboardingIndex()}>
                            Start Partner Onboarding
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        );
    }

    const statusBadge =
        applicationStatusBadgeMap[application.status] ?? 'neutral';

    const copy = (() => {
        switch (application.status) {
            case 'draft':
                return {
                    icon: Clock,
                    headline: 'Your partner application is not yet submitted.',
                    detail: `Complete ${evaluation.missing_requirements.length} remaining requirement(s) and submit your verification application.`,
                };
            case 'submitted':
                return {
                    icon: FileCheck2,
                    headline:
                        'Your application has been submitted successfully.',
                    detail: `Reference ${application.application_number} submitted on ${formatIsoDateTime(application.submitted_at)}. Our team will begin verification shortly.`,
                };
            case 'under_review':
                return {
                    icon: Clock,
                    headline:
                        'Your application is currently being reviewed by TIJUM.',
                    detail: `Verification specialist review is underway for ${application.application_number}. No action is required from you unless requested.`,
                };
            case 'needs_information':
                return {
                    icon: ShieldAlert,
                    headline:
                        'Additional information is required to continue your verification.',
                    detail:
                        application.requested_information ??
                        'Please update the flagged information and resubmit your application.',
                };
            case 'approved':
                return {
                    icon: ShieldCheck,
                    headline: 'Your TIJUM partner account has been approved.',
                    detail: canPublishProperties
                        ? 'Your partner account is Active. Individual property registration and property verification will follow in the next marketplace stage before any listing goes live.'
                        : 'Your application was approved. Re-verify your email if changed to keep your account active for property onboarding.',
                };
            case 'rejected':
                return {
                    icon: ShieldAlert,
                    headline:
                        'Your partner verification application was not approved.',
                    detail:
                        application.decision_reason ??
                        'Review the documented feedback below before submitting a corrected application revision.',
                };
            case 'withdrawn':
                return {
                    icon: RotateCcw,
                    headline: 'Your partner application has been withdrawn.',
                    detail: 'Your saved business profile and launch cities are preserved if you choose to start a new verification revision.',
                };
        }
    })();

    const StatusIcon = copy.icon;

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                        <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border border-tijum-peach bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15">
                            <StatusIcon className="size-5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline">
                                    {application.application_number}
                                </Badge>
                                <Badge variant="outline">
                                    Revision #{application.revision_number}
                                </Badge>
                            </div>
                            <CardTitle className="text-lg">
                                {copy.headline}
                            </CardTitle>
                        </div>
                    </div>

                    <StatusBadge
                        status={statusBadge}
                        label={application.status_label}
                    />
                </div>
                <CardDescription className="leading-relaxed">
                    {copy.detail}
                </CardDescription>
            </CardHeader>

            <CardContent>
                <dl className="grid gap-3 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-4 text-sm sm:grid-cols-3 dark:border-border dark:bg-muted/45">
                    <div>
                        <dt className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                            Reference number
                        </dt>
                        <dd className="mt-0.5 font-heading font-semibold text-tijum-plum dark:text-foreground">
                            {application.application_number}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                            Submitted at
                        </dt>
                        <dd className="mt-0.5 font-medium text-tijum-plum dark:text-foreground">
                            {formatIsoDateTime(application.submitted_at)}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                            Last reviewed
                        </dt>
                        <dd className="mt-0.5 font-medium text-tijum-plum dark:text-foreground">
                            {formatIsoDateTime(application.reviewed_at)}
                        </dd>
                    </div>
                </dl>

                {application.status === 'approved' && (
                    <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-status-info-border bg-status-info-bg p-3.5 text-xs leading-relaxed text-tijum-plum dark:text-foreground">
                        <CheckCircle2
                            className="mt-0.5 size-4 shrink-0 text-status-success-fg"
                            aria-hidden="true"
                        />
                        <span>
                            Partner approval verifies your operator entity. Each
                            individual Hostel/PG, Homestay, or Co-Living
                            property also undergoes property, room, and
                            meal-inclusion verification before going live.
                        </span>
                    </div>
                )}
            </CardContent>

            <CardFooter className="flex flex-wrap gap-2 border-t border-tijum-surface/70 pt-4 dark:border-border">
                {application.status === 'draft' && (
                    <>
                        <Button asChild>
                            <Link
                                href={
                                    evaluation.ready_for_submission
                                        ? review()
                                        : onboardingIndex()
                                }
                            >
                                {evaluation.ready_for_submission
                                    ? 'Review & Submit Application'
                                    : 'Continue Application'}
                            </Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href={statusRoute()}>
                                Application Details
                            </Link>
                        </Button>
                    </>
                )}

                {application.status === 'needs_information' && (
                    <Button asChild>
                        <Link href={statusRoute()}>
                            Review Requested Changes &amp; Resubmit
                        </Link>
                    </Button>
                )}

                {application.can_start_revision && showStartRevisionButton && (
                    <Button asChild>
                        <Link href={startRevision()} method="post" as="button">
                            Start New Application Revision
                        </Link>
                    </Button>
                )}

                {!application.can_start_revision &&
                    application.status !== 'draft' && (
                        <Button variant="outline" asChild>
                            <Link href={statusRoute()}>
                                View Full Status &amp; History
                            </Link>
                        </Button>
                    )}
            </CardFooter>
        </Card>
    );
}
