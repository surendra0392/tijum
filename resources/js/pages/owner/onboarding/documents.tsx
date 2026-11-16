import { Head, Link } from '@inertiajs/react';
import { Info } from 'lucide-react';
import { OnboardingProgress } from '@/components/owner/onboarding/onboarding-progress';
import { applicationStatusBadgeMap } from '@/components/owner/onboarding/status-helpers';
import { VerificationDocumentUpload } from '@/components/owner/onboarding/verification-document-upload';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { dashboard } from '@/routes/owner';
import {
    businessProfile as businessProfileRoute,
    documents as documentsRoute,
    index as onboardingIndex,
} from '@/routes/owner/onboarding';
import type {
    OwnerBusinessProfileData,
    OwnerVerificationApplicationData,
    OwnerVerificationDocumentData,
    PartnerOnboardingEvaluation,
} from '@/types';

type VerificationDocumentsPageProps = {
    application: OwnerVerificationApplicationData;
    businessProfile: OwnerBusinessProfileData | null;
    evaluation: PartnerOnboardingEvaluation;
    replacedDocuments: OwnerVerificationDocumentData[];
    maxDocumentSizeMb: number;
    status?: string;
};

export default function VerificationDocumentsPage({
    application,
    businessProfile,
    evaluation,
    replacedDocuments,
    maxDocumentSizeMb,
    status,
}: VerificationDocumentsPageProps) {
    return (
        <>
            <Head title="Verification Documents · Partner Onboarding" />

            <div className="space-y-6">
                <PageHeader
                    eyebrow="Step 4 · Partner Onboarding"
                    title="Verification Documents"
                    description="Upload clear PDF, JPG, JPEG, or PNG files matching your operator structure. Uploaded documents are stored privately and accessed only by authorised verification staff."
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
                    currentStepKey="documents"
                    isEditable={application.is_editable}
                />

                {!businessProfile && (
                    <Alert variant="warning">
                        <Info aria-hidden="true" />
                        <AlertTitle>
                            Save your Business Profile first
                        </AlertTitle>
                        <AlertDescription>
                            Checklist requirements depend on your entity type.{' '}
                            <Link
                                href={businessProfileRoute()}
                                className="font-semibold underline underline-offset-4"
                            >
                                Complete Step 2 (Business Profile)
                            </Link>{' '}
                            to confirm required categories.
                        </AlertDescription>
                    </Alert>
                )}

                {!application.is_editable && (
                    <Alert>
                        <AlertTitle>Documents locked for review</AlertTitle>
                        <AlertDescription>
                            Uploaded documents cannot be altered while this
                            application is {application.status_label}.
                        </AlertDescription>
                    </Alert>
                )}

                <VerificationDocumentUpload
                    checklist={evaluation.checklist}
                    replacedDocuments={replacedDocuments}
                    isEditable={application.is_editable}
                    maxDocumentSizeMb={maxDocumentSizeMb}
                    status={status}
                />
            </div>
        </>
    );
}

VerificationDocumentsPage.layout = {
    breadcrumbs: [
        { title: 'Partner Overview', href: dashboard() },
        { title: 'Partner Onboarding', href: onboardingIndex() },
        { title: 'Verification Documents', href: documentsRoute() },
    ],
};
