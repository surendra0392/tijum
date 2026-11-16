import { Link, useForm } from '@inertiajs/react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import type { FormEvent } from 'react';
import { FormField } from '@/components/shared/form-field';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
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
import { cities as citiesRoute } from '@/routes/owner/onboarding';
import { update } from '@/routes/owner/onboarding/business-profile';
import type {
    OwnerBusinessProfileData,
    OwnerEntityType,
    OwnerEntityTypeOption,
} from '@/types';

type BusinessProfileFormProps = {
    businessProfile: OwnerBusinessProfileData | null;
    entityTypes: OwnerEntityTypeOption[];
    defaultContactName: string;
    defaultEmail: string;
    isEditable: boolean;
    status?: string;
};

export function BusinessProfileForm({
    businessProfile,
    entityTypes,
    defaultContactName,
    defaultEmail,
    isEditable,
    status,
}: BusinessProfileFormProps) {
    const form = useForm({
        entity_type: (businessProfile?.entity_type ??
            'individual') as OwnerEntityType,
        legal_business_name: businessProfile?.legal_business_name ?? '',
        display_business_name: businessProfile?.display_business_name ?? '',
        primary_contact_name:
            businessProfile?.primary_contact_name ?? defaultContactName,
        primary_contact_designation:
            businessProfile?.primary_contact_designation ?? '',
        business_email: businessProfile?.business_email ?? defaultEmail,
        business_address_line_1: businessProfile?.business_address_line_1 ?? '',
        business_address_line_2: businessProfile?.business_address_line_2 ?? '',
        locality: businessProfile?.locality ?? '',
        postal_code: businessProfile?.postal_code ?? '',
        city: businessProfile?.city ?? '',
        state: businessProfile?.state ?? '',
        country_code: businessProfile?.country_code ?? 'IN',
        website_url: businessProfile?.website_url ?? '',
        description: businessProfile?.description ?? '',
    });

    const selectedEntityMeta =
        entityTypes.find((t) => t.value === form.data.entity_type) ??
        entityTypes[0];

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!isEditable) {
            return;
        }
        form.put(update.url(), {
            preserveScroll: true,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {status === 'business-profile-saved' && (
                <Alert variant="success">
                    <CheckCircle2 aria-hidden="true" />
                    <AlertTitle>Business profile saved</AlertTitle>
                    <AlertDescription>
                        Your operator details have been saved. Continue to{' '}
                        <Link
                            href={citiesRoute()}
                            className="font-semibold underline underline-offset-4"
                        >
                            Step 3: Operating Cities
                        </Link>
                        .
                    </AlertDescription>
                </Alert>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">
                        Operator Entity Structure
                    </CardTitle>
                    <CardDescription>
                        Select how your accommodation business is structured.
                        Individual operators are not required to provide
                        company-only registration details.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-5">
                    <FormField
                        id="entity_type"
                        label="Business / Operator Structure"
                        required
                        error={form.errors.entity_type}
                    >
                        {({ id, ...a11yProps }) => (
                            <Select
                                value={form.data.entity_type}
                                disabled={!isEditable}
                                onValueChange={(value) =>
                                    form.setData(
                                        'entity_type',
                                        value as OwnerEntityType,
                                    )
                                }
                            >
                                <SelectTrigger
                                    id={id}
                                    className="h-12 rounded-xl border-tijum-surface/80 bg-white dark:border-border dark:bg-card"
                                    {...a11yProps}
                                >
                                    <SelectValue placeholder="Choose operator structure" />
                                </SelectTrigger>
                                <SelectContent>
                                    {entityTypes.map((option) => (
                                        <SelectItem
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </FormField>

                    {selectedEntityMeta && (
                        <div className="rounded-xl border border-tijum-peach/80 bg-tijum-cream/60 p-4 text-xs leading-relaxed text-tijum-plum dark:border-tijum-coral/35 dark:bg-tijum-coral/12 dark:text-foreground">
                            <p className="font-heading font-semibold">
                                {selectedEntityMeta.label}
                            </p>
                            <p className="mt-1 text-tijum-plum-muted dark:text-muted-foreground">
                                {selectedEntityMeta.description}
                            </p>
                            <p className="mt-2 font-medium">
                                Required verification documents for this
                                structure:{' '}
                                {selectedEntityMeta.requiredDocuments.join(
                                    ', ',
                                )}
                                .
                            </p>
                        </div>
                    )}

                    <div className="grid gap-5 md:grid-cols-2">
                        <FormField
                            id="display_business_name"
                            label="Display / Trading Name"
                            required
                            hint="Name used to identify your partner account in TIJUM portals."
                            error={form.errors.display_business_name}
                        >
                            {(a11yProps) => (
                                <Input
                                    {...a11yProps}
                                    name="display_business_name"
                                    value={form.data.display_business_name}
                                    disabled={!isEditable}
                                    required
                                    autoComplete="organization"
                                    placeholder="e.g., Sai Krupa Hostels & PG"
                                    onChange={(e) =>
                                        form.setData(
                                            'display_business_name',
                                            e.target.value,
                                        )
                                    }
                                />
                            )}
                        </FormField>

                        <FormField
                            id="legal_business_name"
                            label={
                                selectedEntityMeta?.requiresLegalBusinessName
                                    ? 'Legal Registered Business Name'
                                    : 'Legal Name (Optional for Individual)'
                            }
                            required={
                                selectedEntityMeta?.requiresLegalBusinessName
                            }
                            hint={
                                selectedEntityMeta?.requiresLegalBusinessName
                                    ? 'Registered name matching your firm, LLP, or company records.'
                                    : 'Leave blank if operating directly under your personal name.'
                            }
                            error={form.errors.legal_business_name}
                        >
                            {(a11yProps) => (
                                <Input
                                    {...a11yProps}
                                    name="legal_business_name"
                                    value={form.data.legal_business_name}
                                    disabled={!isEditable}
                                    required={
                                        selectedEntityMeta?.requiresLegalBusinessName
                                    }
                                    placeholder="Registered entity name"
                                    onChange={(e) =>
                                        form.setData(
                                            'legal_business_name',
                                            e.target.value,
                                        )
                                    }
                                />
                            )}
                        </FormField>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">
                        Authorised Contact &amp; Correspondence Address
                    </CardTitle>
                    <CardDescription>
                        Used by TIJUM verification specialists during partner
                        review.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-5">
                    <div className="grid gap-5 md:grid-cols-2">
                        <FormField
                            id="primary_contact_name"
                            label="Authorised Contact Name"
                            required
                            error={form.errors.primary_contact_name}
                        >
                            {(a11yProps) => (
                                <Input
                                    {...a11yProps}
                                    name="primary_contact_name"
                                    value={form.data.primary_contact_name}
                                    disabled={!isEditable}
                                    required
                                    autoComplete="name"
                                    onChange={(e) =>
                                        form.setData(
                                            'primary_contact_name',
                                            e.target.value,
                                        )
                                    }
                                />
                            )}
                        </FormField>

                        <FormField
                            id="primary_contact_designation"
                            label="Designation (Optional)"
                            hint="e.g., Proprietor, Managing Partner, Director"
                            error={form.errors.primary_contact_designation}
                        >
                            {(a11yProps) => (
                                <Input
                                    {...a11yProps}
                                    name="primary_contact_designation"
                                    value={
                                        form.data.primary_contact_designation
                                    }
                                    disabled={!isEditable}
                                    autoComplete="organization-title"
                                    placeholder="Optional designation"
                                    onChange={(e) =>
                                        form.setData(
                                            'primary_contact_designation',
                                            e.target.value,
                                        )
                                    }
                                />
                            )}
                        </FormField>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                        <FormField
                            id="business_email"
                            label="Business Contact Email (Optional)"
                            error={form.errors.business_email}
                        >
                            {(a11yProps) => (
                                <Input
                                    {...a11yProps}
                                    type="email"
                                    name="business_email"
                                    value={form.data.business_email}
                                    disabled={!isEditable}
                                    autoComplete="email"
                                    autoCorrect="off"
                                    autoCapitalize="none"
                                    spellCheck={false}
                                    placeholder="operations@example.com"
                                    onChange={(e) =>
                                        form.setData(
                                            'business_email',
                                            e.target.value,
                                        )
                                    }
                                />
                            )}
                        </FormField>

                        <FormField
                            id="website_url"
                            label="Business Website (Optional)"
                            error={form.errors.website_url}
                        >
                            {(a11yProps) => (
                                <Input
                                    {...a11yProps}
                                    type="url"
                                    name="website_url"
                                    value={form.data.website_url}
                                    disabled={!isEditable}
                                    autoComplete="url"
                                    autoCorrect="off"
                                    autoCapitalize="none"
                                    spellCheck={false}
                                    placeholder="https://example.com"
                                    onChange={(e) =>
                                        form.setData(
                                            'website_url',
                                            e.target.value,
                                        )
                                    }
                                />
                            )}
                        </FormField>
                    </div>

                    <FormField
                        id="business_address_line_1"
                        label="Address Line 1"
                        required
                        error={form.errors.business_address_line_1}
                    >
                        {(a11yProps) => (
                            <Input
                                {...a11yProps}
                                name="business_address_line_1"
                                value={form.data.business_address_line_1}
                                disabled={!isEditable}
                                required
                                autoComplete="address-line1"
                                placeholder="Building, street, or correspondence office"
                                onChange={(e) =>
                                    form.setData(
                                        'business_address_line_1',
                                        e.target.value,
                                    )
                                }
                            />
                        )}
                    </FormField>

                    <div className="grid gap-5 md:grid-cols-2">
                        <FormField
                            id="business_address_line_2"
                            label="Address Line 2 (Optional)"
                            error={form.errors.business_address_line_2}
                        >
                            {(a11yProps) => (
                                <Input
                                    {...a11yProps}
                                    name="business_address_line_2"
                                    value={form.data.business_address_line_2}
                                    disabled={!isEditable}
                                    autoComplete="address-line2"
                                    onChange={(e) =>
                                        form.setData(
                                            'business_address_line_2',
                                            e.target.value,
                                        )
                                    }
                                />
                            )}
                        </FormField>

                        <FormField
                            id="locality"
                            label="Locality / Neighbourhood (Optional)"
                            error={form.errors.locality}
                        >
                            {(a11yProps) => (
                                <Input
                                    {...a11yProps}
                                    name="locality"
                                    value={form.data.locality}
                                    disabled={!isEditable}
                                    placeholder="e.g., Madhapur"
                                    onChange={(e) =>
                                        form.setData('locality', e.target.value)
                                    }
                                />
                            )}
                        </FormField>
                    </div>

                    <div className="grid gap-5 md:grid-cols-3">
                        <FormField
                            id="city"
                            label="City"
                            required
                            error={form.errors.city}
                        >
                            {(a11yProps) => (
                                <Input
                                    {...a11yProps}
                                    name="city"
                                    value={form.data.city}
                                    disabled={!isEditable}
                                    required
                                    autoComplete="address-level2"
                                    placeholder="Hyderabad"
                                    onChange={(e) =>
                                        form.setData('city', e.target.value)
                                    }
                                />
                            )}
                        </FormField>

                        <FormField
                            id="state"
                            label="State"
                            required
                            error={form.errors.state}
                        >
                            {(a11yProps) => (
                                <Input
                                    {...a11yProps}
                                    name="state"
                                    value={form.data.state}
                                    disabled={!isEditable}
                                    required
                                    autoComplete="address-level1"
                                    placeholder="Telangana"
                                    onChange={(e) =>
                                        form.setData('state', e.target.value)
                                    }
                                />
                            )}
                        </FormField>

                        <FormField
                            id="postal_code"
                            label="Postal Code (Optional)"
                            error={form.errors.postal_code}
                        >
                            {(a11yProps) => (
                                <Input
                                    {...a11yProps}
                                    name="postal_code"
                                    value={form.data.postal_code}
                                    disabled={!isEditable}
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
                    </div>

                    <FormField
                        id="description"
                        label="Operator Overview (Optional)"
                        hint="Briefly describe the type of food-inclusive accommodation you operate (Hostels/PG, Homestays, or Co-Living)."
                        error={form.errors.description}
                    >
                        {(a11yProps) => (
                            <Textarea
                                {...a11yProps}
                                name="description"
                                rows={3}
                                value={form.data.description}
                                disabled={!isEditable}
                                placeholder="e.g., Operating 2 mens and womens PG buildings with included South Indian meals."
                                onChange={(e) =>
                                    form.setData('description', e.target.value)
                                }
                            />
                        )}
                    </FormField>
                </CardContent>

                <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t border-tijum-surface/70 pt-4 dark:border-border">
                    <div className="flex flex-wrap items-center gap-2">
                        {isEditable && (
                            <Button
                                type="submit"
                                loading={form.processing}
                                data-test="save-business-profile-button"
                            >
                                Save Business Profile
                            </Button>
                        )}
                        {form.isDirty && isEditable && (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => form.reset()}
                            >
                                Reset Changes
                            </Button>
                        )}
                    </div>

                    <Button variant="outline" asChild>
                        <Link href={citiesRoute()}>
                            <span>Continue to Operating Cities</span>
                            <ArrowRight aria-hidden="true" />
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </form>
    );
}
