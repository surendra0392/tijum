import { useForm } from '@inertiajs/react';
import { Clock, MapPin } from 'lucide-react';
import type { FormEvent } from 'react';
import { FormField } from '@/components/shared/form-field';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatStayTime } from '@/lib/stay-timing';
import type {
    CityOption,
    PropertyCategoryOption,
    PropertyFieldsSnapshot,
    PropertyOwnershipArrangement,
    TimingRules,
} from '@/types';

type OwnershipArrangementOption = {
    value: PropertyOwnershipArrangement;
    label: string;
    guidance: string;
};

type PropertyFormProps = {
    actionUrl: string;
    method: 'post' | 'put';
    categories: PropertyCategoryOption[];
    cities: CityOption[];
    ownershipArrangements: OwnershipArrangementOption[];
    timingRules: TimingRules;
    initialDetails?: Partial<PropertyFieldsSnapshot>;
    initialOwnershipArrangement?: PropertyOwnershipArrangement;
    readOnly?: boolean;
    submitLabel?: string;
};

export function PropertyForm({
    actionUrl,
    method,
    categories,
    cities,
    ownershipArrangements,
    timingRules,
    initialDetails,
    initialOwnershipArrangement = 'owner_operator',
    readOnly = false,
    submitLabel = 'Save Property Details',
}: PropertyFormProps) {
    const form = useForm({
        property_category_id: initialDetails?.property_category_id
            ? String(initialDetails.property_category_id)
            : '',
        city_id: initialDetails?.city_id ? String(initialDetails.city_id) : '',
        ownership_arrangement: initialOwnershipArrangement,
        name: initialDetails?.name ?? '',
        description: initialDetails?.description ?? '',
        contact_person_name: initialDetails?.contact_person_name ?? '',
        contact_phone: initialDetails?.contact_phone ?? '',
        contact_email: initialDetails?.contact_email ?? '',
        address_line_1: initialDetails?.address_line_1 ?? '',
        address_line_2: initialDetails?.address_line_2 ?? '',
        locality: initialDetails?.locality ?? '',
        landmark: initialDetails?.landmark ?? '',
        postal_code: initialDetails?.postal_code ?? '',
        latitude: initialDetails?.latitude ?? '',
        longitude: initialDetails?.longitude ?? '',
    });

    const selectedCity = cities.find((c) => String(c.id) === form.data.city_id);
    const selectedCategory = categories.find(
        (c) => String(c.id) === form.data.property_category_id,
    );
    const selectedArrangement = ownershipArrangements.find(
        (a) => a.value === form.data.ownership_arrangement,
    );

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
        <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>
                        Step 1 · Property Identity &amp; Category
                    </CardTitle>
                    <CardDescription>
                        Provide accurate property identity and primary onsite
                        contact details.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <fieldset
                        disabled={readOnly || form.processing}
                        className="grid gap-4 md:grid-cols-2"
                    >
                        <legend className="sr-only">
                            Property Identity and Category
                        </legend>

                        <FormField
                            id="property-name"
                            label="Property Name"
                            required
                            error={form.errors.name}
                            className="min-w-0 md:col-span-2"
                        >
                            {(a11y) => (
                                <Input
                                    {...a11y}
                                    name="name"
                                    value={form.data.name}
                                    autoComplete="organization"
                                    placeholder="e.g. Sri Sai Executive Hostel & Dining"
                                    onChange={(e) =>
                                        form.setData('name', e.target.value)
                                    }
                                />
                            )}
                        </FormField>

                        <FormField
                            id="property-category"
                            label="Accommodation Category"
                            required
                            error={form.errors.property_category_id}
                            hint={
                                selectedCategory?.description ??
                                'Choose strictly from the 3 canonical categories: Hostels/PG, Homestays, or Co-Living.'
                            }
                            className="min-w-0"
                        >
                            {(a11y) => (
                                <Select
                                    value={form.data.property_category_id}
                                    disabled={readOnly || form.processing}
                                    onValueChange={(value) =>
                                        form.setData(
                                            'property_category_id',
                                            value,
                                        )
                                    }
                                >
                                    <SelectTrigger
                                        id={a11y.id}
                                        aria-invalid={a11y['aria-invalid']}
                                        aria-describedby={
                                            a11y['aria-describedby']
                                        }
                                        className="w-full min-w-0"
                                    >
                                        <SelectValue placeholder="Select canonical category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((cat) => (
                                            <SelectItem
                                                key={cat.id}
                                                value={String(cat.id)}
                                            >
                                                {cat.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </FormField>

                        <FormField
                            id="ownership-arrangement"
                            label="Operator Legal Arrangement"
                            required
                            error={form.errors.ownership_arrangement}
                            hint={selectedArrangement?.guidance}
                            className="min-w-0"
                        >
                            {(a11y) => (
                                <Select
                                    value={form.data.ownership_arrangement}
                                    disabled={readOnly || form.processing}
                                    onValueChange={(value) =>
                                        form.setData(
                                            'ownership_arrangement',
                                            value as PropertyOwnershipArrangement,
                                        )
                                    }
                                >
                                    <SelectTrigger
                                        id={a11y.id}
                                        aria-invalid={a11y['aria-invalid']}
                                        aria-describedby={
                                            a11y['aria-describedby']
                                        }
                                        className="w-full min-w-0"
                                    >
                                        <SelectValue placeholder="Select arrangement" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ownershipArrangements.map((arr) => (
                                            <SelectItem
                                                key={arr.value}
                                                value={arr.value}
                                            >
                                                {arr.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </FormField>

                        <FormField
                            id="property-description"
                            label="Property Description"
                            required
                            error={form.errors.description}
                            hint="Describe property surroundings, room layout, and general stay experience (at least 20 characters). Do not list meal pricing here; mandatory food packages are configured in the food module."
                            className="min-w-0 md:col-span-2"
                        >
                            {(a11y) => (
                                <Textarea
                                    {...a11y}
                                    name="description"
                                    rows={4}
                                    value={form.data.description}
                                    placeholder="Well-maintained accommodation situated near tech parks and transit routes..."
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
                            id="contact-person-name"
                            label="Property Contact Person"
                            required
                            error={form.errors.contact_person_name}
                            className="min-w-0"
                        >
                            {(a11y) => (
                                <Input
                                    {...a11y}
                                    name="contact_person_name"
                                    value={form.data.contact_person_name}
                                    autoComplete="name"
                                    placeholder="On-site warden or manager name"
                                    onChange={(e) =>
                                        form.setData(
                                            'contact_person_name',
                                            e.target.value,
                                        )
                                    }
                                />
                            )}
                        </FormField>

                        <FormField
                            id="contact-phone"
                            label="Property Contact Phone"
                            required
                            error={form.errors.contact_phone}
                            className="min-w-0"
                        >
                            {(a11y) => (
                                <Input
                                    {...a11y}
                                    name="contact_phone"
                                    type="tel"
                                    value={form.data.contact_phone}
                                    autoComplete="tel"
                                    inputMode="tel"
                                    placeholder="+91 98765 43210"
                                    onChange={(e) =>
                                        form.setData(
                                            'contact_phone',
                                            e.target.value,
                                        )
                                    }
                                />
                            )}
                        </FormField>

                        <FormField
                            id="contact-email"
                            label="Property Contact Email (Optional)"
                            error={form.errors.contact_email}
                            className="min-w-0 md:col-span-2"
                        >
                            {(a11y) => (
                                <Input
                                    {...a11y}
                                    name="contact_email"
                                    type="email"
                                    value={form.data.contact_email}
                                    autoComplete="email"
                                    autoCorrect="off"
                                    autoCapitalize="none"
                                    spellCheck={false}
                                    placeholder="desk@property.example"
                                    onChange={(e) =>
                                        form.setData(
                                            'contact_email',
                                            e.target.value,
                                        )
                                    }
                                />
                            )}
                        </FormField>
                    </fieldset>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MapPin
                            className="size-4 text-tijum-coral"
                            aria-hidden="true"
                        />
                        <span>Step 2 · Location &amp; Launch City</span>
                    </CardTitle>
                    <CardDescription>
                        Properties must belong to an active TIJUM launch city
                        and maintain matching state data.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <fieldset
                        disabled={readOnly || form.processing}
                        className="grid gap-4 md:grid-cols-2"
                    >
                        <legend className="sr-only">Property Address</legend>

                        <FormField
                            id="property-city"
                            label="TIJUM Launch City"
                            required
                            error={form.errors.city_id}
                            className="min-w-0"
                        >
                            {(a11y) => (
                                <Select
                                    value={form.data.city_id}
                                    disabled={readOnly || form.processing}
                                    onValueChange={(value) =>
                                        form.setData('city_id', value)
                                    }
                                >
                                    <SelectTrigger
                                        id={a11y.id}
                                        aria-invalid={a11y['aria-invalid']}
                                        aria-describedby={
                                            a11y['aria-describedby']
                                        }
                                        className="w-full min-w-0"
                                    >
                                        <SelectValue placeholder="Select launch city" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {cities.map((c) => (
                                            <SelectItem
                                                key={c.id}
                                                value={String(c.id)}
                                            >
                                                {c.name}, {c.state}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </FormField>

                        <div className="grid gap-2">
                            <span className="font-heading text-sm font-medium text-tijum-plum dark:text-foreground">
                                State &amp; Country
                            </span>
                            <div className="flex h-12 items-center rounded-xl border border-tijum-surface/80 bg-tijum-cream/55 px-4 text-sm text-tijum-plum-muted dark:border-border dark:bg-muted/45 dark:text-muted-foreground">
                                {selectedCity
                                    ? `${selectedCity.state}, ${selectedCity.country_code}`
                                    : 'Auto-populated from selected launch city'}
                            </div>
                        </div>

                        <FormField
                            id="address-line-1"
                            label="Street Address Line 1"
                            required
                            error={form.errors.address_line_1}
                            className="min-w-0 md:col-span-2"
                        >
                            {(a11y) => (
                                <Input
                                    {...a11y}
                                    name="address_line_1"
                                    value={form.data.address_line_1}
                                    autoComplete="address-line1"
                                    placeholder="Building/Plot number and street name"
                                    onChange={(e) =>
                                        form.setData(
                                            'address_line_1',
                                            e.target.value,
                                        )
                                    }
                                />
                            )}
                        </FormField>

                        <FormField
                            id="address-line-2"
                            label="Address Line 2 (Optional)"
                            error={form.errors.address_line_2}
                            className="min-w-0 md:col-span-2"
                        >
                            {(a11y) => (
                                <Input
                                    {...a11y}
                                    name="address_line_2"
                                    value={form.data.address_line_2}
                                    autoComplete="address-line2"
                                    placeholder="Sector, block, or floor detail"
                                    onChange={(e) =>
                                        form.setData(
                                            'address_line_2',
                                            e.target.value,
                                        )
                                    }
                                />
                            )}
                        </FormField>

                        <FormField
                            id="locality"
                            label="Locality / Neighbourhood"
                            required
                            error={form.errors.locality}
                            className="min-w-0"
                        >
                            {(a11y) => (
                                <Input
                                    {...a11y}
                                    name="locality"
                                    value={form.data.locality}
                                    placeholder="e.g. Madhapur, MVP Colony"
                                    onChange={(e) =>
                                        form.setData('locality', e.target.value)
                                    }
                                />
                            )}
                        </FormField>

                        <FormField
                            id="landmark"
                            label="Nearby Landmark (Optional)"
                            error={form.errors.landmark}
                            className="min-w-0"
                        >
                            {(a11y) => (
                                <Input
                                    {...a11y}
                                    name="landmark"
                                    value={form.data.landmark}
                                    placeholder="Opposite Metro Pillar or Junction"
                                    onChange={(e) =>
                                        form.setData('landmark', e.target.value)
                                    }
                                />
                            )}
                        </FormField>

                        <FormField
                            id="postal-code"
                            label="Postal / PIN Code"
                            required
                            error={form.errors.postal_code}
                            className="min-w-0"
                        >
                            {(a11y) => (
                                <Input
                                    {...a11y}
                                    name="postal_code"
                                    value={form.data.postal_code}
                                    autoComplete="postal-code"
                                    inputMode="numeric"
                                    placeholder="500081"
                                    onChange={(e) =>
                                        form.setData(
                                            'postal_code',
                                            e.target.value,
                                        )
                                    }
                                />
                            )}
                        </FormField>

                        <div className="grid grid-cols-2 gap-3">
                            <FormField
                                id="latitude"
                                label="Latitude (Optional)"
                                error={form.errors.latitude}
                                className="min-w-0"
                            >
                                {(a11y) => (
                                    <Input
                                        {...a11y}
                                        name="latitude"
                                        value={form.data.latitude}
                                        inputMode="decimal"
                                        placeholder="17.448292"
                                        onChange={(e) =>
                                            form.setData(
                                                'latitude',
                                                e.target.value,
                                            )
                                        }
                                    />
                                )}
                            </FormField>

                            <FormField
                                id="longitude"
                                label="Longitude (Optional)"
                                error={form.errors.longitude}
                                className="min-w-0"
                            >
                                {(a11y) => (
                                    <Input
                                        {...a11y}
                                        name="longitude"
                                        value={form.data.longitude}
                                        inputMode="decimal"
                                        placeholder="78.391485"
                                        onChange={(e) =>
                                            form.setData(
                                                'longitude',
                                                e.target.value,
                                            )
                                        }
                                    />
                                )}
                            </FormField>
                        </div>
                    </fieldset>
                </CardContent>
            </Card>

            <Alert>
                <Clock aria-hidden="true" />
                <AlertTitle>Fixed TIJUM Check-In Timing Policy</AlertTitle>
                <AlertDescription>
                    Platform check-in starts at{' '}
                    <strong>
                        {formatStayTime(timingRules.standard_check_in_time)}
                    </strong>
                    , standard checkout is{' '}
                    <strong>
                        {formatStayTime(timingRules.standard_check_out_time)}
                    </strong>{' '}
                    on the stay end date, and optional early check-in can never
                    be earlier than{' '}
                    <strong>
                        {formatStayTime(
                            timingRules.earliest_early_check_in_time,
                        )}
                    </strong>
                    . You can enable or disable early check-in per room type.
                </AlertDescription>
            </Alert>

            {!readOnly && (
                <div className="flex flex-wrap justify-end gap-3">
                    <Button type="submit" loading={form.processing}>
                        {submitLabel}
                    </Button>
                </div>
            )}
        </form>
    );
}
