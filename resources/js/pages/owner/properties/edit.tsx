import { Head, router } from '@inertiajs/react';
import { Lock, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { PropertyForm } from '@/components/owner/properties/property-form';
import {
    propertyOperationalStatusMap,
    propertyVerificationStatusMap,
} from '@/components/owner/properties/property-status-helpers';
import { PropertyStepNavigation } from '@/components/owner/properties/property-step-navigation';
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { dashboard } from '@/routes/owner';
import {
    edit as editPropertyRoute,
    index as propertiesIndexRoute,
    show as showPropertyRoute,
    update as updatePropertyRoute,
} from '@/routes/owner/properties';
import {
    cancel as cancelAmendmentRoute,
    start as startAmendmentRoute,
} from '@/routes/owner/properties/amendment';
import type {
    CityOption,
    PropertyCategoryOption,
    PropertyFieldsSnapshot,
    PropertyOwnershipArrangement,
    PropertySummaryData,
    TimingRules,
} from '@/types';

type EditPropertyPageProps = {
    property: PropertySummaryData & {
        details: PropertyFieldsSnapshot;
        approved_details: PropertyFieldsSnapshot;
        ownership_arrangement: PropertyOwnershipArrangement;
        can_edit_details: boolean;
    };
    categories: PropertyCategoryOption[];
    cities: CityOption[];
    ownershipArrangements: {
        value: PropertyOwnershipArrangement;
        label: string;
        guidance: string;
    }[];
    timingRules: TimingRules;
};

export default function EditPropertyPage({
    property,
    categories,
    cities,
    ownershipArrangements,
    timingRules,
}: EditPropertyPageProps) {
    const [confirmStartOpen, setConfirmStartOpen] = useState(false);
    const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
    const [processingAmendment, setProcessingAmendment] = useState(false);

    const handleStartAmendment = () => {
        setProcessingAmendment(true);
        router.post(
            startAmendmentRoute.url(property.id),
            {},
            {
                onFinish: () => {
                    setProcessingAmendment(false);
                    setConfirmStartOpen(false);
                },
            },
        );
    };

    const handleCancelAmendment = () => {
        setProcessingAmendment(true);
        router.post(
            cancelAmendmentRoute.url(property.id),
            {},
            {
                onFinish: () => {
                    setProcessingAmendment(false);
                    setConfirmCancelOpen(false);
                },
            },
        );
    };

    return (
        <>
            <Head title={`Edit ${property.name} · Partner Portal`} />

            <div className="space-y-6">
                <PageHeader
                    eyebrow={`Property Details · ${property.property_reference}`}
                    title={property.name}
                    description="Manage property category, launch city, contact details, street address, and legal operator arrangement."
                    badges={
                        <>
                            <StatusBadge
                                status={
                                    propertyVerificationStatusMap[
                                        property.verification_status
                                    ]
                                }
                                label={property.verification_status_label}
                            />
                            <StatusBadge
                                status={
                                    propertyOperationalStatusMap[
                                        property.status
                                    ]
                                }
                                label={property.status_label}
                            />
                            {property.is_amendment_active && (
                                <Badge variant="default">
                                    Revision #
                                    {property.active_application
                                        ?.revision_number ?? 2}{' '}
                                    Amendment
                                </Badge>
                            )}
                        </>
                    }
                    actions={
                        <div className="flex flex-wrap gap-2">
                            {property.can_start_amendment && (
                                <Button
                                    type="button"
                                    variant="plum"
                                    onClick={() => setConfirmStartOpen(true)}
                                    data-test="start-amendment-button"
                                >
                                    <RefreshCw aria-hidden="true" />
                                    <span>Start Re-Verification Amendment</span>
                                </Button>
                            )}
                            {property.active_application
                                ?.can_cancel_amendment && (
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setConfirmCancelOpen(true)}
                                    data-test="cancel-amendment-button"
                                >
                                    Cancel Amendment Draft
                                </Button>
                            )}
                        </div>
                    }
                />

                <PropertyStepNavigation
                    propertyId={property.id}
                    activeStep="overview"
                    roomTypesCount={property.room_types_count}
                    roomsCount={property.rooms_count}
                />

                {!property.can_edit_details &&
                    property.has_approved_baseline && (
                        <Alert variant="warning">
                            <Lock aria-hidden="true" />
                            <AlertTitle>
                                Approved Snapshot Preserved &amp; Locked
                            </AlertTitle>
                            <AlertDescription>
                                Verification-sensitive details (category, city,
                                address, room configuration, approved photos)
                                are locked to protect your approved listing
                                record. Operational changes such as toggling
                                Temporarily Closed or updating room Maintenance
                                status remain unlocked on the Overview and Rooms
                                pages.
                            </AlertDescription>
                        </Alert>
                    )}

                {property.is_amendment_active && (
                    <Alert>
                        <AlertTitle>
                            Editing Re-Verification Amendment Revision #
                            {property.active_application?.revision_number}
                        </AlertTitle>
                        <AlertDescription>
                            Your previously approved property snapshot remains
                            preserved separately. Changes saved here stage into
                            this revision and are promoted atomically only upon
                            administrator approval.
                        </AlertDescription>
                    </Alert>
                )}

                <PropertyForm
                    actionUrl={updatePropertyRoute.url(property.id)}
                    method="put"
                    categories={categories}
                    cities={cities}
                    ownershipArrangements={ownershipArrangements}
                    timingRules={timingRules}
                    initialDetails={property.details}
                    initialOwnershipArrangement={property.ownership_arrangement}
                    readOnly={!property.can_edit_details}
                    submitLabel={
                        property.is_amendment_active
                            ? 'Save Amendment Changes'
                            : 'Save Property Details'
                    }
                />

                <ConfirmationDialog
                    open={confirmStartOpen}
                    onOpenChange={setConfirmStartOpen}
                    title="Start Re-Verification Amendment?"
                    description="This preserves your last approved property snapshot intact and opens a new draft revision (N+1). Customer-facing booking eligibility for this property pauses temporarily until the amendment is approved or cancelled."
                    confirmLabel="Start Amendment Revision"
                    loading={processingAmendment}
                    onConfirm={handleStartAmendment}
                />

                <ConfirmationDialog
                    open={confirmCancelOpen}
                    onOpenChange={setConfirmCancelOpen}
                    tone="destructive"
                    title="Cancel Draft Amendment?"
                    description="All unpromoted draft edits, staged room types, and draft amendment photos in this revision will be discarded cleanly, restoring your previously approved snapshot and eligibility."
                    confirmLabel="Discard Amendment & Restore"
                    loading={processingAmendment}
                    onConfirm={handleCancelAmendment}
                />
            </div>
        </>
    );
}

EditPropertyPage.layout = {
    breadcrumbs: [
        { title: 'Partner Overview', href: dashboard() },
        { title: 'My Properties', href: propertiesIndexRoute() },
        { title: 'Property Overview', href: showPropertyRoute(1) },
        { title: 'Edit Details', href: editPropertyRoute(1) },
    ],
};
