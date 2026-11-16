import { useForm } from '@inertiajs/react';
import { Lock, Snowflake } from 'lucide-react';
import type { FormEvent } from 'react';
import {
    FormField,
    MultiSelectCheckboxGroup,
} from '@/components/shared/form-field';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { formatStayTime } from '@/lib/stay-timing';
import type {
    PropertyGenderPolicy,
    PropertyGuestComposition,
    PropertyRoomTypeData,
    PropertyRoomTypeMode,
    TimingRules,
} from '@/types';

type RoomTypeOptions = {
    modes: {
        value: PropertyRoomTypeMode;
        label: string;
        description: string;
    }[];
    sharingCapacities: number[];
    genderPolicies: { value: PropertyGenderPolicy; label: string }[];
    guestCompositions: { value: PropertyGuestComposition; label: string }[];
};

type RoomTypeFormProps = {
    actionUrl: string;
    method: 'post' | 'put';
    options: RoomTypeOptions;
    timingRules: TimingRules;
    existingRoomType?: PropertyRoomTypeData;
    readOnly?: boolean;
    submitLabel?: string;
};

export function RoomTypeForm({
    actionUrl,
    method,
    options,
    timingRules,
    existingRoomType,
    readOnly = false,
    submitLabel = 'Save Room Type',
}: RoomTypeFormProps) {
    const structuralLocked =
        readOnly ||
        Boolean(existingRoomType && existingRoomType.rooms_count > 0);

    const form = useForm({
        name: existingRoomType?.name ?? '',
        accommodation_mode:
            existingRoomType?.accommodation_mode ??
            ('shared' as PropertyRoomTypeMode),
        sharing_capacity: existingRoomType?.sharing_capacity
            ? String(existingRoomType.sharing_capacity)
            : '4',
        max_guests_per_room: existingRoomType?.max_guests_per_room ?? 4,
        is_air_conditioned: existingRoomType?.is_air_conditioned ?? true,
        gender_policy:
            existingRoomType?.gender_policy ??
            ('all_genders' as PropertyGenderPolicy),
        guest_composition_policy:
            existingRoomType?.guest_composition_policy ?? ['individuals'],
        early_check_in_enabled:
            existingRoomType?.early_check_in_enabled ?? false,
        description: existingRoomType?.description ?? '',
        is_active: existingRoomType?.is_active ?? true,
        display_order: existingRoomType?.display_order ?? 0,
    });

    const isPrivate = form.data.accommodation_mode === 'private';
    const previewCapacity = isPrivate
        ? 1
        : Number(form.data.sharing_capacity || 4);

    const selectedGenderLabel =
        options.genderPolicies.find((g) => g.value === form.data.gender_policy)
            ?.label ?? form.data.gender_policy;

    const handleModeChange = (mode: PropertyRoomTypeMode) => {
        if (structuralLocked) {
            return;
        }

        if (mode === 'private') {
            form.setData({
                ...form.data,
                accommodation_mode: 'private',
                max_guests_per_room: 1,
            });
        } else {
            const cap = Number(form.data.sharing_capacity || 4);
            form.setData({
                ...form.data,
                accommodation_mode: 'shared',
                sharing_capacity: String(cap),
                max_guests_per_room: cap,
            });
        }
    };

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (readOnly) {
            return;
        }

        if (method === 'post') {
            form.post(actionUrl);
        } else {
            form.put(actionUrl);
        }
    };

    return (
        <div className="grid gap-6 lg:grid-cols-3">
            <form onSubmit={handleSubmit} className="space-y-6 lg:col-span-2">
                {structuralLocked && existingRoomType && (
                    <Alert variant="warning">
                        <Lock aria-hidden="true" />
                        <AlertTitle>
                            Structural Capacity &amp; AC Locked
                        </AlertTitle>
                        <AlertDescription>
                            This room type currently has{' '}
                            <strong>{existingRoomType.rooms_count}</strong>{' '}
                            physical room(s). Mode, sharing capacity, max
                            occupancy, and AC configuration cannot be modified
                            directly without silently altering live inventory;
                            create a new room-type variant instead.
                        </AlertDescription>
                    </Alert>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>Accommodation Configuration</CardTitle>
                        <CardDescription>
                            Customers book by accommodation configuration (e.g.
                            4 Sharing AC or Single Room Non-AC) and occupancy
                            count—never by bed number.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <fieldset
                            disabled={readOnly || form.processing}
                            className="grid gap-4 sm:grid-cols-2"
                        >
                            <legend className="sr-only">
                                Room type configuration
                            </legend>

                            <FormField
                                id="rt-name"
                                label="Room Type Variant Name"
                                required
                                error={form.errors.name}
                                hint="Use clear variant names unique within this property (e.g. Standard 4 Sharing AC, Executive Single Room AC)."
                                className="min-w-0 sm:col-span-2"
                            >
                                {(a11y) => (
                                    <Input
                                        {...a11y}
                                        name="name"
                                        value={form.data.name}
                                        placeholder="e.g. 4 Sharing AC"
                                        onChange={(e) =>
                                            form.setData('name', e.target.value)
                                        }
                                    />
                                )}
                            </FormField>

                            <FormField
                                id="rt-mode"
                                label="Accommodation Mode"
                                required
                                error={form.errors.accommodation_mode}
                                className="min-w-0"
                            >
                                {(a11y) => (
                                    <Select
                                        value={form.data.accommodation_mode}
                                        disabled={
                                            structuralLocked || form.processing
                                        }
                                        onValueChange={(v) =>
                                            handleModeChange(
                                                v as PropertyRoomTypeMode,
                                            )
                                        }
                                    >
                                        <SelectTrigger
                                            id={a11y.id}
                                            className="w-full min-w-0"
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {options.modes.map((m) => (
                                                <SelectItem
                                                    key={m.value}
                                                    value={m.value}
                                                >
                                                    {m.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </FormField>

                            {!isPrivate ? (
                                <FormField
                                    id="rt-sharing-capacity"
                                    label="Sharing Occupancy Capacity"
                                    required
                                    error={
                                        form.errors.sharing_capacity ??
                                        form.errors.max_guests_per_room
                                    }
                                    className="min-w-0"
                                >
                                    {(a11y) => (
                                        <Select
                                            value={form.data.sharing_capacity}
                                            disabled={
                                                structuralLocked ||
                                                form.processing
                                            }
                                            onValueChange={(value) =>
                                                form.setData({
                                                    ...form.data,
                                                    sharing_capacity: value,
                                                    max_guests_per_room:
                                                        Number(value),
                                                })
                                            }
                                        >
                                            <SelectTrigger
                                                id={a11y.id}
                                                className="w-full min-w-0"
                                            >
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {options.sharingCapacities.map(
                                                    (cap) => (
                                                        <SelectItem
                                                            key={cap}
                                                            value={String(cap)}
                                                        >
                                                            {cap} Sharing ({cap}{' '}
                                                            guests max)
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </FormField>
                            ) : (
                                <div className="grid gap-2">
                                    <span className="font-heading text-sm font-medium text-tijum-plum dark:text-foreground">
                                        Single Room Maximum Occupancy
                                    </span>
                                    <div className="flex h-12 items-center rounded-xl border border-tijum-surface/80 bg-tijum-cream/55 px-4 text-sm font-medium text-tijum-plum dark:border-border dark:bg-muted/45 dark:text-foreground">
                                        1 guest per room (fixed Single Room
                                        rule)
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between rounded-xl border border-tijum-surface bg-tijum-cream/35 p-3.5 sm:col-span-2 dark:border-border dark:bg-muted/35">
                                <div className="space-y-0.5 pr-3">
                                    <Label
                                        htmlFor="rt-ac"
                                        className="font-heading text-sm font-semibold text-tijum-plum dark:text-foreground"
                                    >
                                        Air Conditioning (AC)
                                    </Label>
                                    <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                        Explicitly sets whether rooms under this
                                        configuration include AC.
                                    </p>
                                </div>
                                <Switch
                                    id="rt-ac"
                                    checked={form.data.is_air_conditioned}
                                    disabled={
                                        structuralLocked || form.processing
                                    }
                                    onCheckedChange={(checked) =>
                                        form.setData(
                                            'is_air_conditioned',
                                            checked,
                                        )
                                    }
                                />
                            </div>
                        </fieldset>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>
                            Guest Eligibility &amp; Early Check-In
                        </CardTitle>
                        <CardDescription>
                            Configure structured eligibility policies and
                            room-type early check-in availability.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormField
                            id="rt-gender-policy"
                            label="Gender Eligibility Policy"
                            required
                            error={form.errors.gender_policy}
                            className="min-w-0"
                        >
                            {(a11y) => (
                                <Select
                                    value={form.data.gender_policy}
                                    disabled={readOnly || form.processing}
                                    onValueChange={(value) =>
                                        form.setData(
                                            'gender_policy',
                                            value as PropertyGenderPolicy,
                                        )
                                    }
                                >
                                    <SelectTrigger
                                        id={a11y.id}
                                        className="w-full min-w-0"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {options.genderPolicies.map((g) => (
                                            <SelectItem
                                                key={g.value}
                                                value={g.value}
                                            >
                                                {g.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </FormField>

                        <MultiSelectCheckboxGroup
                            legend="Permitted Guest Compositions"
                            options={options.guestCompositions.map((c) => ({
                                value: c.value,
                                label: c.label,
                                disabled: readOnly || form.processing,
                            }))}
                            value={form.data.guest_composition_policy}
                            onChange={(next) =>
                                form.setData(
                                    'guest_composition_policy',
                                    next as PropertyGuestComposition[],
                                )
                            }
                            error={form.errors.guest_composition_policy}
                        />

                        <div className="flex items-center justify-between rounded-xl border border-tijum-surface bg-tijum-cream/35 p-3.5 dark:border-border dark:bg-muted/35">
                            <div className="space-y-0.5 pr-3">
                                <Label
                                    htmlFor="rt-early-checkin"
                                    className="font-heading text-sm font-semibold text-tijum-plum dark:text-foreground"
                                >
                                    Early Check-in
                                </Label>
                                <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                    {form.data.early_check_in_enabled
                                        ? `Guests may request early check-in from ${formatStayTime(timingRules.earliest_early_check_in_time)}, subject to room availability and operational readiness.`
                                        : `Standard check-in begins at ${formatStayTime(timingRules.standard_check_in_time)}.`}
                                </p>
                            </div>
                            <Switch
                                id="rt-early-checkin"
                                checked={form.data.early_check_in_enabled}
                                disabled={readOnly || form.processing}
                                onCheckedChange={(checked) =>
                                    form.setData(
                                        'early_check_in_enabled',
                                        checked,
                                    )
                                }
                            />
                        </div>
                        <div className="rounded-xl border border-tijum-surface bg-white px-3.5 py-3 text-xs text-tijum-plum-muted dark:border-border dark:bg-muted/45 dark:text-muted-foreground">
                            <p>
                                <span className="font-semibold text-tijum-plum dark:text-foreground">
                                    Allowed:
                                </span>{' '}
                                Guests may request early check-in from{' '}
                                {formatStayTime(
                                    timingRules.earliest_early_check_in_time,
                                )}
                                , subject to room availability and operational
                                readiness.
                            </p>
                            <p className="mt-1">
                                <span className="font-semibold text-tijum-plum dark:text-foreground">
                                    Not Allowed:
                                </span>{' '}
                                Standard check-in begins at{' '}
                                {formatStayTime(
                                    timingRules.standard_check_in_time,
                                )}
                                .
                            </p>
                            <p className="mt-1">
                                Standard check-in:{' '}
                                {formatStayTime(
                                    timingRules.standard_check_in_time,
                                )}{' '}
                                · Standard checkout:{' '}
                                {formatStayTime(
                                    timingRules.standard_check_out_time,
                                )}{' '}
                                · Earliest request time:{' '}
                                {formatStayTime(
                                    timingRules.earliest_early_check_in_time,
                                )}
                                .
                            </p>
                        </div>

                        <FormField
                            id="rt-description"
                            label="Room Type Description (Optional)"
                            error={form.errors.description}
                        >
                            {(a11y) => (
                                <Textarea
                                    {...a11y}
                                    name="description"
                                    rows={3}
                                    disabled={readOnly || form.processing}
                                    value={form.data.description}
                                    placeholder="Ventilation, storage space, study desk setup, or attached bathroom note..."
                                    onChange={(e) =>
                                        form.setData(
                                            'description',
                                            e.target.value,
                                        )
                                    }
                                />
                            )}
                        </FormField>

                        <FormField
                            id="rt-display-order"
                            label="Display Order"
                            error={form.errors.display_order}
                            hint="Lower numbers appear first on future customer comparison cards."
                        >
                            {(a11y) => (
                                <Input
                                    {...a11y}
                                    name="display_order"
                                    type="text"
                                    inputMode="numeric"
                                    disabled={readOnly || form.processing}
                                    value={String(form.data.display_order)}
                                    onChange={(e) =>
                                        form.setData(
                                            'display_order',
                                            Number(
                                                e.target.value.replace(
                                                    /\D+/g,
                                                    '',
                                                ),
                                            ) || 0,
                                        )
                                    }
                                />
                            )}
                        </FormField>
                    </CardContent>
                </Card>

                {!readOnly && (
                    <div className="flex justify-end">
                        <Button type="submit" loading={form.processing}>
                            {submitLabel}
                        </Button>
                    </div>
                )}
            </form>

            <div className="space-y-4">
                <Card className="lg:sticky lg:top-24">
                    <CardHeader>
                        <CardTitle className="text-base">
                            Customer Category Preview
                        </CardTitle>
                        <CardDescription>
                            Pricing and amenities are managed in later steps.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <p className="font-heading text-lg font-bold text-tijum-plum dark:text-foreground">
                            {form.data.name || 'Untitled Room Type'}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="plum">
                                Occupancy: {previewCapacity}{' '}
                                {previewCapacity === 1 ? 'guest' : 'guests'}
                            </Badge>
                            <Badge variant="outline">
                                <Snowflake
                                    className="mr-1 size-3 text-tijum-coral"
                                    aria-hidden="true"
                                />
                                {form.data.is_air_conditioned ? 'AC' : 'Non-AC'}
                            </Badge>
                        </div>
                        <dl className="space-y-2 border-t border-tijum-surface pt-3 text-xs dark:border-border">
                            <div className="flex justify-between gap-2">
                                <dt className="text-tijum-plum-muted dark:text-muted-foreground">
                                    Mode
                                </dt>
                                <dd className="font-semibold text-tijum-plum dark:text-foreground">
                                    {isPrivate
                                        ? 'Private Single Room'
                                        : `${previewCapacity} Sharing`}
                                </dd>
                            </div>
                            <div className="flex justify-between gap-2">
                                <dt className="text-tijum-plum-muted dark:text-muted-foreground">
                                    Gender Policy
                                </dt>
                                <dd className="font-semibold text-tijum-plum dark:text-foreground">
                                    {selectedGenderLabel}
                                </dd>
                            </div>
                            <div className="flex justify-between gap-2">
                                <dt className="text-tijum-plum-muted dark:text-muted-foreground">
                                    Early Check-in
                                </dt>
                                <dd className="font-semibold text-tijum-plum dark:text-foreground">
                                    {form.data.early_check_in_enabled
                                        ? `Allowed (from ${formatStayTime(timingRules.earliest_early_check_in_time)})`
                                        : 'Not Allowed'}
                                </dd>
                            </div>
                            <div className="flex justify-between gap-2">
                                <dt className="text-tijum-plum-muted dark:text-muted-foreground">
                                    Check-in
                                </dt>
                                <dd className="font-semibold text-tijum-plum dark:text-foreground">
                                    {formatStayTime(
                                        timingRules.standard_check_in_time,
                                    )}
                                </dd>
                            </div>
                            <div className="flex justify-between gap-2">
                                <dt className="text-tijum-plum-muted dark:text-muted-foreground">
                                    Checkout
                                </dt>
                                <dd className="font-semibold text-tijum-plum dark:text-foreground">
                                    {formatStayTime(
                                        timingRules.standard_check_out_time,
                                    )}
                                </dd>
                            </div>
                        </dl>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
