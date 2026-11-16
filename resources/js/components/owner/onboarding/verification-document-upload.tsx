import { Link } from '@inertiajs/react';
import { ArrowRight, CheckCircle2, History } from 'lucide-react';
import { DocumentStatusCard } from '@/components/owner/onboarding/document-status-card';
import { formatIsoDateTime } from '@/components/owner/onboarding/status-helpers';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { review } from '@/routes/owner/onboarding';
import type {
    OwnerVerificationDocumentData,
    VerificationChecklistItem,
} from '@/types';

type VerificationDocumentUploadProps = {
    checklist: VerificationChecklistItem[];
    replacedDocuments: OwnerVerificationDocumentData[];
    isEditable: boolean;
    maxDocumentSizeMb: number;
    status?: string;
};

export function VerificationDocumentUpload({
    checklist,
    replacedDocuments,
    isEditable,
    maxDocumentSizeMb,
    status,
}: VerificationDocumentUploadProps) {
    return (
        <div className="space-y-6">
            {status === 'document-uploaded' && (
                <Alert variant="success">
                    <CheckCircle2 aria-hidden="true" />
                    <AlertTitle>Verification document uploaded</AlertTitle>
                    <AlertDescription>
                        Your file passed format checks and is stored privately
                        outside public access.
                    </AlertDescription>
                </Alert>
            )}

            <div className="space-y-4">
                {checklist.map((item) => (
                    <DocumentStatusCard
                        key={item.type}
                        item={item}
                        isEditable={isEditable}
                        maxDocumentSizeMb={maxDocumentSizeMb}
                    />
                ))}
            </div>

            {replacedDocuments.length > 0 && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <History
                                className="size-4.5 text-tijum-coral"
                                aria-hidden="true"
                            />
                            <CardTitle className="text-base">
                                Replaced Document History
                            </CardTitle>
                        </div>
                        <CardDescription>
                            Previous verification uploads retained in audit
                            history
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2 text-xs text-tijum-plum-muted dark:text-muted-foreground">
                            {replacedDocuments.map((doc) => (
                                <li
                                    key={doc.id}
                                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 px-3 py-2 dark:border-border dark:bg-muted/35"
                                >
                                    <span>
                                        <strong className="text-tijum-plum dark:text-foreground">
                                            {doc.document_type_label}
                                        </strong>{' '}
                                        · {doc.original_filename} (
                                        {doc.file_size_label})
                                    </span>
                                    <span>
                                        Uploaded{' '}
                                        {formatIsoDateTime(doc.created_at)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            <div className="flex justify-end">
                <Button variant="default" asChild>
                    <Link href={review()}>
                        <span>Continue to Application Review</span>
                        <ArrowRight aria-hidden="true" />
                    </Link>
                </Button>
            </div>
        </div>
    );
}
