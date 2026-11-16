import { Head, useForm } from '@inertiajs/react';
import { AlertTriangle, Info, PlusCircle, Send, Sparkles } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { PropertyStepNavigation } from '@/components/owner/properties/property-step-navigation';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import {
    StatusBadge,
    type SemanticStatus,
} from '@/components/shared/status-badge';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import amenitiesRoutes from '@/routes/owner/properties/amenities';
import type {
    AmenityAssignmentSummary,
    AmenityAvailability,
    AmenityCategoryOption,
    AmenityReadiness,
    PropertySummaryData,
} from '@/types';

type Props = {
    property: PropertySummaryData;
    roomTypes: { id: number; name: string; is_active: boolean }[];
    catalogue: AmenityCategoryOption[];
    propertyAssignments: AmenityAssignmentSummary[];
    roomTypeAssignments: AmenityAssignmentSummary[];
    evaluation: AmenityReadiness;
    options: {
        availability: { value: AmenityAvailability; label: string }[];
        statuses: { value: string; label: string }[];
    };
    canManage: boolean;
};

function statusToSemantic(status: string): SemanticStatus {
    if (status === 'approved') return 'verified';
    if (status === 'submitted' || status === 'under_review')
        return 'processing';
    if (status === 'needs_information') return 'pending';
    if (status === 'rejected') return 'rejected';
    if (status === 'inactive') return 'cancelled';
    return 'neutral';
}

function AssignmentCard({
    assignment,
    propertyId,
}: {
    assignment: AmenityAssignmentSummary;
    propertyId: number;
}) {
    const submitForm = useForm({ declaration_accepted: false as boolean });
    const onSubmit = (e: FormEvent) => {
        e.preventDefault();
        const url =
            assignment.scope === 'property'
                ? amenitiesRoutes.property.submit.url([
                      propertyId,
                      assignment.id,
                  ])
                : amenitiesRoutes.roomType.submit.url([
                      propertyId,
                      assignment.id,
                  ]);
        submitForm.post(url, { preserveScroll: true });
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                        <CardTitle className="text-base">
                            {assignment.amenity?.name ?? 'Amenity'}
                        </CardTitle>
                        <CardDescription className="text-xs">
                            {assignment.scope === 'room_type'
                                ? `Room type: ${assignment.room_type_name ?? `#${assignment.property_room_type_id}`}`
                                : 'Property-level amenity'}
                            {' · '}
                            {assignment.assignment_reference}
                        </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <StatusBadge
                            status={statusToSemantic(assignment.status)}
                            label={assignment.status_label}
                        />
                        <Badge variant="outline">
                            {assignment.availability_label}
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
                {assignment.details && (
                    <p className="text-tijum-plum-muted dark:text-muted-foreground">
                        {assignment.details}
                    </p>
                )}
                {assignment.requested_information && (
                    <Alert variant="warning">
                        <AlertTriangle aria-hidden="true" />
                        <AlertTitle>Information requested</AlertTitle>
                        <AlertDescription>
                            {assignment.requested_information}
                        </AlertDescription>
                    </Alert>
                )}
                {assignment.decision_reason &&
                    assignment.status === 'rejected' && (
                        <Alert variant="destructive">
                            <AlertTitle>Decision reason</AlertTitle>
                            <AlertDescription>
                                {assignment.decision_reason}
                            </AlertDescription>
                        </Alert>
                    )}
                {assignment.can_submit && (
                    <form
                        onSubmit={onSubmit}
                        className="space-y-3 rounded-xl border border-tijum-surface bg-tijum-cream/30 p-3 dark:border-border dark:bg-muted/35"
                    >
                        <div className="flex items-start gap-2">
                            <Checkbox
                                id={`decl-${assignment.scope}-${assignment.id}`}
                                checked={submitForm.data.declaration_accepted}
                                onCheckedChange={(v) =>
                                    submitForm.setData(
                                        'declaration_accepted',
                                        v === true,
                                    )
                                }
                            />
                            <Label
                                htmlFor={`decl-${assignment.scope}-${assignment.id}`}
                                className="text-xs leading-relaxed"
                            >
                                I confirm this amenity information is accurate
                                and matches what is genuinely available to
                                guests.
                            </Label>
                        </div>
                        {submitForm.errors.declaration_accepted && (
                            <p className="text-xs text-status-error-fg">
                                {submitForm.errors.declaration_accepted}
                            </p>
                        )}
                        <Button
                            type="submit"
                            size="sm"
                            variant="plum"
                            disabled={submitForm.processing}
                        >
                            <Send aria-hidden="true" />
                            <span>Submit for verification</span>
                        </Button>
                    </form>
                )}
            </CardContent>
        </Card>
    );
}

export default function OwnerPropertyAmenitiesIndex({
    property,
    roomTypes,
    catalogue,
    propertyAssignments,
    roomTypeAssignments,
    evaluation,
    options,
    canManage,
}: Props) {
    const [scope, setScope] = useState<'property' | 'room_type'>('property');

    const propertyAmenities = useMemo(
        () =>
            catalogue.flatMap((c) =>
                (c.amenities ?? []).filter((a) => a.applies_to_property),
            ),
        [catalogue],
    );
    const roomTypeAmenities = useMemo(
        () =>
            catalogue.flatMap((c) =>
                (c.amenities ?? []).filter((a) => a.applies_to_room_type),
            ),
        [catalogue],
    );

    const propForm = useForm({
        amenity_id: '',
        availability: 'included' as AmenityAvailability,
        is_customer_visible: true,
        details: '',
    });
    const rtForm = useForm({
        property_room_type_id: '',
        amenity_id: '',
        availability: 'included' as AmenityAvailability,
        is_customer_visible: true,
        details: '',
    });

    const saveProperty = (e: FormEvent) => {
        e.preventDefault();
        propForm.post(amenitiesRoutes.property.store.url(property.id), {
            preserveScroll: true,
            onSuccess: () => propForm.reset('amenity_id', 'details'),
        });
    };
    const saveRoomType = (e: FormEvent) => {
        e.preventDefault();
        rtForm.post(amenitiesRoutes.roomType.store.url(property.id), {
            preserveScroll: true,
            onSuccess: () => rtForm.reset('amenity_id', 'details'),
        });
    };

    const propAmenityError = (
        propForm.errors as Record<string, string | undefined>
    ).amenity;
    const rtAmenityError = (rtForm.errors as Record<string, string | undefined>)
        .amenity;

    return (
        <>
            <Head title={`Amenities · ${property.name}`} />
            <div className="space-y-6">
                <PageHeader
                    eyebrow={`${property.property_reference} · Amenities`}
                    title="Amenities & Facilities"
                    description="Manage property-level and room-type amenities separately from AC/Non-AC and food packages. Submit amenity assignments for TIJUM verification before they can be shown to customers."
                />

                <PropertyStepNavigation
                    propertyId={property.id}
                    activeStep="amenities"
                />

                {!property.has_approved_baseline && (
                    <Alert variant="warning">
                        <Info aria-hidden="true" />
                        <AlertTitle>Property verification required</AlertTitle>
                        <AlertDescription>
                            Complete and approve property verification before
                            amenity assignments can be submitted or approved.
                        </AlertDescription>
                    </Alert>
                )}

                {evaluation.missing_requirements.length > 0 && (
                    <Alert variant="warning">
                        <AlertTriangle aria-hidden="true" />
                        <AlertTitle>Readiness notes</AlertTitle>
                        <AlertDescription>
                            <ul className="list-disc space-y-1 pl-4">
                                {evaluation.missing_requirements
                                    .slice(0, 6)
                                    .map((item) => (
                                        <li key={item}>{item}</li>
                                    ))}
                            </ul>
                        </AlertDescription>
                    </Alert>
                )}

                <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 tabular-nums">
                    <Card>
                        <CardContent className="pt-5">
                            <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                Approved
                            </p>
                            <p className="font-heading text-2xl font-bold text-tijum-plum dark:text-foreground">
                                {evaluation.approved_count}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-5">
                            <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                Awaiting review
                            </p>
                            <p className="font-heading text-2xl font-bold text-tijum-plum dark:text-foreground">
                                {evaluation.pending_review_count}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-5">
                            <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                Needs info
                            </p>
                            <p className="font-heading text-2xl font-bold text-tijum-plum dark:text-foreground">
                                {evaluation.needs_information_count}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-5">
                            <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                Draft/updates
                            </p>
                            <p className="font-heading text-2xl font-bold text-tijum-plum dark:text-foreground">
                                {evaluation.draft_count}
                            </p>
                        </CardContent>
                    </Card>
                </section>

                {canManage && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles
                                    className="size-5 text-tijum-coral"
                                    aria-hidden="true"
                                />
                                Add or update amenity assignment
                            </CardTitle>
                            <CardDescription>
                                Food, meals, menus, AC/Non-AC, pricing, and
                                physical-room amenities are managed in their own
                                systems.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    variant={
                                        scope === 'property'
                                            ? 'plum'
                                            : 'outline'
                                    }
                                    size="sm"
                                    onClick={() => setScope('property')}
                                >
                                    Property-level
                                </Button>
                                <Button
                                    type="button"
                                    variant={
                                        scope === 'room_type'
                                            ? 'plum'
                                            : 'outline'
                                    }
                                    size="sm"
                                    onClick={() => setScope('room_type')}
                                >
                                    Room-type
                                </Button>
                            </div>

                            {scope === 'property' ? (
                                <form
                                    onSubmit={saveProperty}
                                    className="grid gap-4 md:grid-cols-2"
                                >
                                    <div className="space-y-1 md:col-span-2">
                                        <Label htmlFor="prop-amenity">
                                            Amenity
                                        </Label>
                                        <Select
                                            value={propForm.data.amenity_id}
                                            onValueChange={(v) =>
                                                propForm.setData(
                                                    'amenity_id',
                                                    v,
                                                )
                                            }
                                        >
                                            <SelectTrigger id="prop-amenity">
                                                <SelectValue placeholder="Select property amenity" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {propertyAmenities.map((a) => (
                                                    <SelectItem
                                                        key={a.id}
                                                        value={String(a.id)}
                                                    >
                                                        {a.name} (
                                                        {a.category?.name ??
                                                            'Catalogue'}
                                                        )
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {propForm.errors.amenity_id && (
                                            <p className="text-xs text-status-error-fg">
                                                {propForm.errors.amenity_id}
                                            </p>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="prop-avail">
                                            Availability
                                        </Label>
                                        <Select
                                            value={propForm.data.availability}
                                            onValueChange={(v) =>
                                                propForm.setData(
                                                    'availability',
                                                    v as AmenityAvailability,
                                                )
                                            }
                                        >
                                            <SelectTrigger id="prop-avail">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {options.availability.map(
                                                    (o) => (
                                                        <SelectItem
                                                            key={o.value}
                                                            value={o.value}
                                                        >
                                                            {o.label}
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectContent>
                                        </Select>
                                        {propForm.errors.availability && (
                                            <p className="text-xs text-status-error-fg">
                                                {propForm.errors.availability}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 pt-6">
                                        <Checkbox
                                            id="prop-visible"
                                            checked={
                                                propForm.data
                                                    .is_customer_visible
                                            }
                                            onCheckedChange={(v) =>
                                                propForm.setData(
                                                    'is_customer_visible',
                                                    v === true,
                                                )
                                            }
                                        />
                                        <Label htmlFor="prop-visible">
                                            Customer-visible when approved
                                        </Label>
                                    </div>
                                    <div className="space-y-1 md:col-span-2">
                                        <Label htmlFor="prop-details">
                                            Details (optional)
                                        </Label>
                                        <Textarea
                                            id="prop-details"
                                            value={propForm.data.details}
                                            onChange={(e) =>
                                                propForm.setData(
                                                    'details',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Optional safe details (no pricing)."
                                        />
                                        {propForm.errors.details && (
                                            <p className="text-xs text-status-error-fg">
                                                {propForm.errors.details}
                                            </p>
                                        )}
                                    </div>
                                    {propAmenityError && (
                                        <p className="text-xs text-status-error-fg md:col-span-2">
                                            {propAmenityError}
                                        </p>
                                    )}
                                    <div className="md:col-span-2">
                                        <Button
                                            type="submit"
                                            variant="plum"
                                            disabled={propForm.processing}
                                        >
                                            <PlusCircle aria-hidden="true" />
                                            Save property amenity
                                        </Button>
                                    </div>
                                </form>
                            ) : (
                                <form
                                    onSubmit={saveRoomType}
                                    className="grid gap-4 md:grid-cols-2"
                                >
                                    <div className="space-y-1">
                                        <Label htmlFor="rt-type">
                                            Room type
                                        </Label>
                                        <Select
                                            value={
                                                rtForm.data
                                                    .property_room_type_id
                                            }
                                            onValueChange={(v) =>
                                                rtForm.setData(
                                                    'property_room_type_id',
                                                    v,
                                                )
                                            }
                                        >
                                            <SelectTrigger id="rt-type">
                                                <SelectValue placeholder="Select room type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {roomTypes.map((rt) => (
                                                    <SelectItem
                                                        key={rt.id}
                                                        value={String(rt.id)}
                                                    >
                                                        {rt.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {rtForm.errors
                                            .property_room_type_id && (
                                            <p className="text-xs text-status-error-fg">
                                                {
                                                    rtForm.errors
                                                        .property_room_type_id
                                                }
                                            </p>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="rt-amenity">
                                            Amenity
                                        </Label>
                                        <Select
                                            value={rtForm.data.amenity_id}
                                            onValueChange={(v) =>
                                                rtForm.setData('amenity_id', v)
                                            }
                                        >
                                            <SelectTrigger id="rt-amenity">
                                                <SelectValue placeholder="Select room-type amenity" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {roomTypeAmenities.map((a) => (
                                                    <SelectItem
                                                        key={a.id}
                                                        value={String(a.id)}
                                                    >
                                                        {a.name} (
                                                        {a.category?.name ??
                                                            'Catalogue'}
                                                        )
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {rtForm.errors.amenity_id && (
                                            <p className="text-xs text-status-error-fg">
                                                {rtForm.errors.amenity_id}
                                            </p>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="rt-avail">
                                            Availability
                                        </Label>
                                        <Select
                                            value={rtForm.data.availability}
                                            onValueChange={(v) =>
                                                rtForm.setData(
                                                    'availability',
                                                    v as AmenityAvailability,
                                                )
                                            }
                                        >
                                            <SelectTrigger id="rt-avail">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {options.availability.map(
                                                    (o) => (
                                                        <SelectItem
                                                            key={o.value}
                                                            value={o.value}
                                                        >
                                                            {o.label}
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectContent>
                                        </Select>
                                        {rtForm.errors.availability && (
                                            <p className="text-xs text-status-error-fg">
                                                {rtForm.errors.availability}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 pt-6">
                                        <Checkbox
                                            id="rt-visible"
                                            checked={
                                                rtForm.data.is_customer_visible
                                            }
                                            onCheckedChange={(v) =>
                                                rtForm.setData(
                                                    'is_customer_visible',
                                                    v === true,
                                                )
                                            }
                                        />
                                        <Label htmlFor="rt-visible">
                                            Customer-visible when approved
                                        </Label>
                                    </div>
                                    <div className="space-y-1 md:col-span-2">
                                        <Label htmlFor="rt-details">
                                            Details (optional)
                                        </Label>
                                        <Textarea
                                            id="rt-details"
                                            value={rtForm.data.details}
                                            onChange={(e) =>
                                                rtForm.setData(
                                                    'details',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Optional safe details (no pricing)."
                                        />
                                        {rtForm.errors.details && (
                                            <p className="text-xs text-status-error-fg">
                                                {rtForm.errors.details}
                                            </p>
                                        )}
                                    </div>
                                    {rtAmenityError && (
                                        <p className="text-xs text-status-error-fg md:col-span-2">
                                            {rtAmenityError}
                                        </p>
                                    )}
                                    <div className="md:col-span-2">
                                        <Button
                                            type="submit"
                                            variant="plum"
                                            disabled={rtForm.processing}
                                        >
                                            <PlusCircle aria-hidden="true" />
                                            Save room-type amenity
                                        </Button>
                                    </div>
                                </form>
                            )}
                        </CardContent>
                    </Card>
                )}

                <section className="space-y-4">
                    <h2 className="font-heading text-lg font-semibold text-tijum-plum dark:text-foreground">
                        Property-level assignments
                    </h2>
                    {propertyAssignments.length === 0 ? (
                        <EmptyState
                            icon={Sparkles}
                            title="No property amenities yet"
                            description="Add property-level amenities and submit them for verification."
                        />
                    ) : (
                        <div className="grid gap-4 lg:grid-cols-2">
                            {propertyAssignments.map((a) => (
                                <AssignmentCard
                                    key={`p-${a.id}`}
                                    assignment={a}
                                    propertyId={property.id}
                                />
                            ))}
                        </div>
                    )}
                </section>

                <section className="space-y-4">
                    <h2 className="font-heading text-lg font-semibold text-tijum-plum dark:text-foreground">
                        Room-type assignments
                    </h2>
                    {roomTypeAssignments.length === 0 ? (
                        <EmptyState
                            icon={Sparkles}
                            title="No room-type amenities yet"
                            description="Add amenities to specific room types and submit them for verification."
                        />
                    ) : (
                        <div className="grid gap-4 lg:grid-cols-2">
                            {roomTypeAssignments.map((a) => (
                                <AssignmentCard
                                    key={`r-${a.id}`}
                                    assignment={a}
                                    propertyId={property.id}
                                />
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </>
    );
}
