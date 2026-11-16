import { Link } from '@inertiajs/react';
import { AlertTriangle, FileUp, PencilLine } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { businessProfile, documents, review } from '@/routes/owner/onboarding';
import type {
    OwnerVerificationApplicationData,
    VerificationChecklistItem,
} from '@/types';

type CorrectionRequestPanelProps = {
    application: OwnerVerificationApplicationData;
    checklist: VerificationChecklistItem[];
};

const documentLabelLookup = (
    type: string,
    checklist: VerificationChecklistItem[],
): string => checklist.find((item) => item.type === type)?.label ?? type;

export function CorrectionRequestPanel({
    application,
    checklist,
}: CorrectionRequestPanelProps) {
    if (application.status !== 'needs_information') {
        return null;
    }

    const rejectedDocs = checklist.filter(
        (item) => item.document?.status === 'rejected',
    );
    const requestedDocTypes =
        application.requested_changes?.required_document_types ?? [];
    const requestedProfileChanges =
        application.requested_changes?.required_profile_changes ?? [];

    return (
        <Alert variant="warning" className="border-status-warning-border">
            <AlertTriangle aria-hidden="true" />
            <AlertTitle>
                Additional information requested to continue verification
            </AlertTitle>
            <AlertDescription className="space-y-3">
                <p className="text-sm leading-relaxed text-tijum-plum dark:text-foreground">
                    {application.requested_information}
                </p>

                {requestedProfileChanges.length > 0 && (
                    <div className="space-y-1">
                        <p className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground">
                            Profile &amp; business updates requested:
                        </p>
                        <ul className="list-inside list-disc space-y-1 text-xs text-tijum-plum dark:text-foreground">
                            {requestedProfileChanges.map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {(rejectedDocs.length > 0 || requestedDocTypes.length > 0) && (
                    <div className="space-y-1.5">
                        <p className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground">
                            Documents needing replacement or addition:
                        </p>
                        <ul className="space-y-1.5 text-xs text-tijum-plum dark:text-foreground">
                            {Array.from(
                                new Set([
                                    ...requestedDocTypes,
                                    ...rejectedDocs.map((d) => d.type),
                                ]),
                            ).map((docType) => {
                                const matching = rejectedDocs.find(
                                    (d) => d.type === docType,
                                );

                                return (
                                    <li
                                        key={docType}
                                        className="rounded-xl border border-status-warning-border/70 bg-white/85 px-3 py-2 dark:bg-card/85"
                                    >
                                        <span className="font-heading font-semibold">
                                            {documentLabelLookup(
                                                docType,
                                                checklist,
                                            )}
                                        </span>
                                        {matching?.document?.reviewer_note && (
                                            <span className="mt-0.5 block text-tijum-plum-muted dark:text-muted-foreground">
                                                Reviewer note:{' '}
                                                {
                                                    matching.document
                                                        .reviewer_note
                                                }
                                            </span>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" variant="outline" asChild>
                        <Link href={businessProfile()}>
                            <PencilLine aria-hidden="true" />
                            <span>Update Business Profile</span>
                        </Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                        <Link href={documents()}>
                            <FileUp aria-hidden="true" />
                            <span>Replace / Upload Documents</span>
                        </Link>
                    </Button>
                    <Button size="sm" variant="default" asChild>
                        <Link href={review()}>
                            <span>Review &amp; Resubmit</span>
                        </Link>
                    </Button>
                </div>
            </AlertDescription>
        </Alert>
    );
}
