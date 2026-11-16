import {
    Building2,
    ExternalLink,
    FileText,
    MapPin,
    UserCheck,
} from 'lucide-react';
import {
    documentStatusBadgeMap,
    formatIsoDate,
} from '@/components/owner/onboarding/status-helpers';
import { StatusBadge } from '@/components/shared/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import type {
    CityOption,
    Owner,
    OwnerBusinessProfileData,
    VerificationChecklistItem,
} from '@/types';

type ApplicationSummaryProps = {
    owner: Owner | null | undefined;
    businessProfile: OwnerBusinessProfileData | null;
    operatingCities: CityOption[];
    checklist: VerificationChecklistItem[];
};

export function ApplicationSummary({
    owner,
    businessProfile,
    operatingCities,
    checklist,
}: ApplicationSummaryProps) {
    const activeDocuments = checklist
        .map((item) => item.document)
        .filter((doc): doc is NonNullable<typeof doc> => doc !== null);

    return (
        <div className="grid gap-6 lg:grid-cols-2">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-base sm:text-lg">
                            Owner Account
                        </CardTitle>
                        <UserCheck
                            className="size-4.5 text-tijum-coral"
                            aria-hidden="true"
                        />
                    </div>
                    <CardDescription>
                        Verified operator login identity
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <dl className="space-y-2.5 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-tijum-surface/70 pb-2 dark:border-border">
                            <dt className="text-tijum-plum-muted dark:text-muted-foreground">
                                Account name
                            </dt>
                            <dd className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                                {owner?.name ?? '—'}
                            </dd>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-tijum-surface/70 pb-2 dark:border-border">
                            <dt className="text-tijum-plum-muted dark:text-muted-foreground">
                                Email
                            </dt>
                            <dd className="flex flex-wrap items-center gap-2 font-medium text-tijum-plum dark:text-foreground">
                                <span className="break-all">
                                    {owner?.email ?? '—'}
                                </span>
                                <StatusBadge
                                    status={
                                        owner?.email_verified_at
                                            ? 'verified'
                                            : 'pending'
                                    }
                                    label={
                                        owner?.email_verified_at
                                            ? 'Verified'
                                            : 'Unverified'
                                    }
                                />
                            </dd>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <dt className="text-tijum-plum-muted dark:text-muted-foreground">
                                Phone
                            </dt>
                            <dd className="flex flex-wrap items-center gap-2 text-tijum-plum dark:text-foreground">
                                <span>{owner?.phone ?? 'Not provided'}</span>
                                {owner?.phone && (
                                    <StatusBadge
                                        status="pending"
                                        label="OTP Unverified"
                                    />
                                )}
                            </dd>
                        </div>
                    </dl>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-base sm:text-lg">
                            Intended Operating Cities
                        </CardTitle>
                        <MapPin
                            className="size-4.5 text-tijum-coral"
                            aria-hidden="true"
                        />
                    </div>
                    <CardDescription>
                        Target launch cities (not live property inventory)
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {operatingCities.length === 0 ? (
                        <p className="text-sm text-tijum-plum-muted dark:text-muted-foreground">
                            No operating cities selected yet.
                        </p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {operatingCities.map((city) => (
                                <Badge key={city.id} variant="peach">
                                    {city.name}, {city.state}
                                </Badge>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="lg:col-span-2">
                <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-base sm:text-lg">
                            Business &amp; Operator Profile
                        </CardTitle>
                        <Building2
                            className="size-4.5 text-tijum-coral"
                            aria-hidden="true"
                        />
                    </div>
                    <CardDescription>
                        Correspondence and entity representation saved for
                        partner verification
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!businessProfile ? (
                        <p className="text-sm text-tijum-plum-muted dark:text-muted-foreground">
                            Business profile details have not been saved yet.
                        </p>
                    ) : (
                        <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                            <div>
                                <dt className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                    Entity structure
                                </dt>
                                <dd className="mt-0.5 font-heading font-semibold text-tijum-plum dark:text-foreground">
                                    {businessProfile.entity_type_label}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                    Display / trading name
                                </dt>
                                <dd className="mt-0.5 font-heading font-semibold text-tijum-plum dark:text-foreground">
                                    {businessProfile.display_business_name}
                                </dd>
                            </div>
                            {businessProfile.legal_business_name && (
                                <div>
                                    <dt className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                        Legal business name
                                    </dt>
                                    <dd className="mt-0.5 font-medium text-tijum-plum dark:text-foreground">
                                        {businessProfile.legal_business_name}
                                    </dd>
                                </div>
                            )}
                            <div>
                                <dt className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                    Authorised contact
                                </dt>
                                <dd className="mt-0.5 font-medium text-tijum-plum dark:text-foreground">
                                    {businessProfile.primary_contact_name}
                                    {businessProfile.primary_contact_designation
                                        ? ` (${businessProfile.primary_contact_designation})`
                                        : ''}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                    Business contact email
                                </dt>
                                <dd className="mt-0.5 break-all text-tijum-plum dark:text-foreground">
                                    {businessProfile.business_email ??
                                        owner?.email ??
                                        '—'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                    Correspondence address
                                </dt>
                                <dd className="mt-0.5 text-tijum-plum dark:text-foreground">
                                    {[
                                        businessProfile.business_address_line_1,
                                        businessProfile.business_address_line_2,
                                        businessProfile.locality,
                                        businessProfile.city,
                                        businessProfile.state,
                                        businessProfile.postal_code,
                                        businessProfile.country_code,
                                    ]
                                        .filter(Boolean)
                                        .join(', ')}
                                </dd>
                            </div>
                        </dl>
                    )}
                </CardContent>
            </Card>

            <Card className="lg:col-span-2">
                <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-base sm:text-lg">
                            Submitted Verification Documents
                        </CardTitle>
                        <FileText
                            className="size-4.5 text-tijum-coral"
                            aria-hidden="true"
                        />
                    </div>
                    <CardDescription>
                        Private verification files stored outside public web
                        access
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {activeDocuments.length === 0 ? (
                        <p className="text-sm text-tijum-plum-muted dark:text-muted-foreground">
                            No verification documents uploaded yet.
                        </p>
                    ) : (
                        <ul className="space-y-2.5">
                            {activeDocuments.map((doc) => (
                                <li
                                    key={doc.id}
                                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 px-4 py-3 text-sm dark:border-border dark:bg-muted/45"
                                >
                                    <div className="min-w-0 space-y-0.5">
                                        <p className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                                            {doc.document_type_label}
                                        </p>
                                        <p className="truncate text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                            {doc.original_filename} ·{' '}
                                            {doc.file_size_label} · Uploaded{' '}
                                            {formatIsoDate(doc.created_at)}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <StatusBadge
                                            status={
                                                documentStatusBadgeMap[
                                                    doc.status
                                                ] ?? 'neutral'
                                            }
                                            label={doc.status_label}
                                        />
                                        {doc.preview_url && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                asChild
                                            >
                                                <a
                                                    href={doc.preview_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    <span>View</span>
                                                    <ExternalLink aria-hidden="true" />
                                                </a>
                                            </Button>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
