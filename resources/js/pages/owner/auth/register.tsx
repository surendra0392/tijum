import { Form, Head } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    Building2,
    Check,
    ShieldCheck,
    UserCheck,
} from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { login } from '@/routes/owner';
import { store } from '@/routes/owner/register';
import { privacy, terms as publicTerms } from '@/routes/public';

type CityOption = {
    id: number;
    name: string;
    slug: string;
};

type CategoryOption = {
    id: number;
    name: string;
    slug: string;
    code: string;
};

type Props = {
    cities?: CityOption[];
    categories?: CategoryOption[];
};

const STEPS = [
    {
        number: 1,
        title: 'Contact',
        subtitle: 'Owner & contact info',
    },
    {
        number: 2,
        title: 'Property',
        subtitle: 'Classification & area',
    },
    {
        number: 3,
        title: 'Security',
        subtitle: 'Password & terms',
    },
] as const;

const selectControlClassName =
    'h-12 w-full cursor-pointer rounded-xl border border-tijum-surface/80 bg-white px-4 py-2 text-sm text-tijum-plum transition-[color,border-color,box-shadow] outline-none hover:border-tijum-plum/55 focus-visible:border-tijum-coral focus-visible:ring-[3px] focus-visible:ring-tijum-coral/25';

export default function OwnerRegister({ cities = [], categories = [] }: Props) {
    const defaultCities: CityOption[] =
        cities.length > 0
            ? cities
            : [
                  { id: 1, name: 'Hyderabad', slug: 'hyderabad' },
                  { id: 2, name: 'Guntur', slug: 'guntur' },
                  { id: 3, name: 'Vijayawada', slug: 'vijayawada' },
                  { id: 4, name: 'Visakhapatnam', slug: 'visakhapatnam' },
              ];

    const defaultCategories: CategoryOption[] =
        categories.length > 0
            ? categories
            : [
                  {
                      id: 1,
                      name: 'Hostels/PG',
                      slug: 'hostels-pg',
                      code: 'hostel_pg',
                  },
                  {
                      id: 2,
                      name: 'Homestays',
                      slug: 'homestays',
                      code: 'homestay',
                  },
                  {
                      id: 3,
                      name: 'Co-Living',
                      slug: 'co-living',
                      code: 'coliving',
                  },
              ];

    const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
    const [highestVisitedStep, setHighestVisitedStep] = useState<number>(1);
    const [clientErrors, setClientErrors] = useState<Record<string, string>>(
        {},
    );

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [propertyName, setPropertyName] = useState('');
    const [propertyCategoryId, setPropertyCategoryId] = useState<string>(
        String(defaultCategories[0]?.id ?? 1),
    );
    const [availableFor, setAvailableFor] = useState('both');
    const [cityId, setCityId] = useState<string>(
        String(defaultCities[0]?.id ?? 1),
    );
    const [locality, setLocality] = useState('');
    const [description, setDescription] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [terms, setTerms] = useState(false);

    const moveToServerErrorStep = (errors: Record<string, string>) => {
        if (errors.name || errors.email || errors.phone) {
            setCurrentStep(1);
        } else if (
            errors.property_name ||
            errors.property_category_id ||
            errors.available_for ||
            errors.city_id ||
            errors.locality ||
            errors.description
        ) {
            setCurrentStep(2);
        } else if (
            errors.password ||
            errors.password_confirmation ||
            errors.terms
        ) {
            setCurrentStep(3);
        }
    };

    const clearClientError = (key: string) => {
        if (clientErrors[key]) {
            setClientErrors((prev) => {
                const next = { ...prev };
                delete next[key];
                return next;
            });
        }
    };

    const validateStep1 = (): boolean => {
        const errors: Record<string, string> = {};
        if (!name.trim()) {
            errors.name = 'Full name or primary contact name is required.';
        }
        if (!email.trim()) {
            errors.email = 'Email address is required.';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            errors.email = 'Please enter a valid email address.';
        }
        if (!phone.trim()) {
            errors.phone =
                'Mobile number is required for partner verification.';
        } else if (!/^[+0-9\s\-()]{7,20}$/.test(phone.trim())) {
            errors.phone =
                'Please enter a valid mobile number (minimum 7 digits).';
        }

        setClientErrors((prev) => ({
            ...prev,
            ...errors,
        }));

        return Object.keys(errors).length === 0;
    };

    const validateStep2 = (): boolean => {
        const errors: Record<string, string> = {};
        if (!propertyName.trim()) {
            errors.property_name = 'Property name is required.';
        }
        if (!locality.trim()) {
            errors.locality = 'Property area / locality is required.';
        }

        setClientErrors((prev) => ({
            ...prev,
            ...errors,
        }));

        return Object.keys(errors).length === 0;
    };

    const validateStep3 = (): boolean => {
        const errors: Record<string, string> = {};
        if (!password) {
            errors.password = 'Password is required.';
        } else if (password.length < 8) {
            errors.password = 'Password must be at least 8 characters.';
        }
        if (!passwordConfirmation) {
            errors.password_confirmation = 'Please confirm your password.';
        } else if (password !== passwordConfirmation) {
            errors.password_confirmation = 'Passwords do not match.';
        }
        if (!terms) {
            errors.terms =
                'Please accept the Partner Terms & Conditions to proceed.';
        }

        setClientErrors((prev) => ({
            ...prev,
            ...errors,
        }));

        return Object.keys(errors).length === 0;
    };

    const goToStep = (targetStep: 1 | 2 | 3) => {
        if (targetStep === currentStep) return;

        if (targetStep > currentStep) {
            if (currentStep === 1 && !validateStep1()) return;
            if (currentStep === 2 && !validateStep2()) return;
        }

        setCurrentStep(targetStep);
        if (targetStep > highestVisitedStep) {
            setHighestVisitedStep(targetStep);
        }
    };

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        if (currentStep === 1) {
            e.preventDefault();
            if (validateStep1()) {
                goToStep(2);
            }
            return;
        }
        if (currentStep === 2) {
            e.preventDefault();
            if (validateStep2()) {
                goToStep(3);
            }
            return;
        }
        if (currentStep === 3) {
            const isStep1Valid = validateStep1();
            if (!isStep1Valid) {
                e.preventDefault();
                goToStep(1);
                return;
            }
            const isStep2Valid = validateStep2();
            if (!isStep2Valid) {
                e.preventDefault();
                goToStep(2);
                return;
            }
            const isStep3Valid = validateStep3();
            if (!isStep3Valid) {
                e.preventDefault();
            }
        }
    };

    const selectedCategoryName =
        defaultCategories.find((c) => String(c.id) === propertyCategoryId)
            ?.name ?? 'Hostels/PG';
    const selectedCityName =
        defaultCities.find((c) => String(c.id) === cityId)?.name ?? 'Hyderabad';
    const genderLabel =
        availableFor === 'male'
            ? 'Male Only'
            : availableFor === 'female'
              ? 'Female Only'
              : 'Both / All Genders';

    return (
        <>
            <Head title="Partner Registration — List Your Property" />

            <div className="mb-6 space-y-2.5">
                <nav
                    aria-label="Registration Progress"
                    className="rounded-2xl border border-tijum-surface bg-tijum-cream/65 p-1.5"
                >
                    <ol className="grid grid-cols-3 gap-1.5">
                        {STEPS.map((s) => {
                            const isCompleted = currentStep > s.number;
                            const isCurrent = currentStep === s.number;
                            return (
                                <li key={s.number}>
                                    <button
                                        type="button"
                                        onClick={() => goToStep(s.number)}
                                        disabled={
                                            s.number > highestVisitedStep &&
                                            s.number > currentStep
                                        }
                                        className={cn(
                                            'group flex w-full flex-col gap-0.5 rounded-xl px-2.5 py-2 text-left transition-all',
                                            isCurrent
                                                ? 'border border-tijum-surface bg-white font-bold text-tijum-plum shadow-2xs'
                                                : isCompleted
                                                  ? 'cursor-pointer text-tijum-plum hover:bg-white/75'
                                                  : 'cursor-not-allowed text-tijum-plum-muted/65 opacity-70',
                                        )}
                                        aria-current={
                                            isCurrent ? 'step' : undefined
                                        }
                                    >
                                        <div className="flex items-center gap-2 text-xs font-semibold">
                                            <span
                                                className={cn(
                                                    'flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-all',
                                                    isCurrent
                                                        ? 'bg-tijum-coral text-white'
                                                        : isCompleted
                                                          ? 'bg-tijum-plum text-tijum-cream'
                                                          : 'bg-tijum-surface text-tijum-plum-muted',
                                                )}
                                            >
                                                {isCompleted ? (
                                                    <Check
                                                        className="size-3 stroke-[3]"
                                                        aria-hidden="true"
                                                    />
                                                ) : (
                                                    s.number
                                                )}
                                            </span>
                                            <span className="truncate font-heading">
                                                {s.title}
                                            </span>
                                        </div>
                                        <p className="hidden truncate pl-7 text-[11px] font-normal text-tijum-plum-muted sm:block">
                                            {s.subtitle}
                                        </p>
                                    </button>
                                </li>
                            );
                        })}
                    </ol>
                </nav>

                <div className="h-1.5 w-full overflow-hidden rounded-full bg-tijum-surface/80">
                    <div
                        className="h-full rounded-full bg-tijum-coral transition-all duration-300 ease-out"
                        style={{
                            width:
                                currentStep === 1
                                    ? '33.3%'
                                    : currentStep === 2
                                      ? '66.6%'
                                      : '100%',
                        }}
                        aria-hidden="true"
                    />
                </div>
            </div>

            <Form
                {...store.form()}
                resetOnSuccess={['password', 'password_confirmation']}
                disableWhileProcessing
                onSubmit={handleFormSubmit}
                onError={moveToServerErrorStep}
                noValidate
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => {
                    const mergedErrors = { ...errors, ...clientErrors };

                    return (
                        <>
                            <div
                                className={cn(
                                    'space-y-4 transition-all duration-200',
                                    currentStep !== 1 && 'hidden',
                                )}
                            >
                                <div className="flex items-start gap-3 border-b border-tijum-surface pb-3">
                                    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-tijum-peach/30 text-tijum-plum">
                                        <UserCheck
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <div>
                                        <h3 className="font-heading text-sm font-bold text-tijum-plum">
                                            1. Primary Contact &amp; Account
                                        </h3>
                                        <p className="text-xs text-tijum-plum-muted">
                                            Primary contact details for
                                            verification and reservation alerts.
                                        </p>
                                    </div>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="grid gap-2 sm:col-span-2">
                                        <Label htmlFor="name">
                                            Full Name / Owner or Primary Contact{' '}
                                            <span className="text-tijum-coral">
                                                *
                                            </span>
                                        </Label>
                                        <Input
                                            id="name"
                                            type="text"
                                            name="name"
                                            value={name}
                                            onChange={(e) => {
                                                setName(e.target.value);
                                                clearClientError('name');
                                            }}
                                            autoComplete="name"
                                            placeholder="e.g. Ramesh Naidu"
                                            aria-invalid={Boolean(
                                                mergedErrors.name,
                                            )}
                                            aria-describedby={
                                                mergedErrors.name
                                                    ? 'name-error'
                                                    : undefined
                                            }
                                        />
                                        <InputError
                                            id="name-error"
                                            message={mergedErrors.name}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="email">
                                            Email Address{' '}
                                            <span className="text-tijum-coral">
                                                *
                                            </span>
                                        </Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            name="email"
                                            value={email}
                                            onChange={(e) => {
                                                setEmail(e.target.value);
                                                clearClientError('email');
                                            }}
                                            autoComplete="email"
                                            placeholder="owner@property.in"
                                            aria-invalid={Boolean(
                                                mergedErrors.email,
                                            )}
                                            aria-describedby={
                                                mergedErrors.email
                                                    ? 'email-error'
                                                    : undefined
                                            }
                                        />
                                        <InputError
                                            id="email-error"
                                            message={mergedErrors.email}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="phone">
                                            Mobile Number (Mandatory){' '}
                                            <span className="text-tijum-coral">
                                                *
                                            </span>
                                        </Label>
                                        <Input
                                            id="phone"
                                            type="tel"
                                            name="phone"
                                            value={phone}
                                            onChange={(e) => {
                                                setPhone(e.target.value);
                                                clearClientError('phone');
                                            }}
                                            autoComplete="tel"
                                            placeholder="e.g. 9876543210"
                                            aria-invalid={Boolean(
                                                mergedErrors.phone,
                                            )}
                                            aria-describedby={
                                                mergedErrors.phone
                                                    ? 'phone-error'
                                                    : undefined
                                            }
                                        />
                                        <InputError
                                            id="phone-error"
                                            message={mergedErrors.phone}
                                        />
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <Button
                                        type="button"
                                        size="lg"
                                        onClick={() => goToStep(2)}
                                        data-test="step-1-next"
                                        className="w-full"
                                    >
                                        <span>
                                            Continue to Property Details
                                        </span>
                                        <ArrowRight
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    </Button>
                                </div>
                            </div>

                            <div
                                className={cn(
                                    'space-y-4 transition-all duration-200',
                                    currentStep !== 2 && 'hidden',
                                )}
                            >
                                <div className="flex items-start gap-3 border-b border-tijum-surface pb-3">
                                    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-tijum-peach/30 text-tijum-plum">
                                        <Building2
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <div>
                                        <h3 className="font-heading text-sm font-bold text-tijum-plum">
                                            2. Property Information &amp;
                                            Classification
                                        </h3>
                                        <p className="text-xs text-tijum-plum-muted">
                                            Tell prospective guests about your
                                            property location and stay category.
                                        </p>
                                    </div>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="grid gap-2 sm:col-span-2">
                                        <Label htmlFor="property_name">
                                            Property Name{' '}
                                            <span className="text-tijum-coral">
                                                *
                                            </span>
                                        </Label>
                                        <Input
                                            id="property_name"
                                            type="text"
                                            name="property_name"
                                            value={propertyName}
                                            onChange={(e) => {
                                                setPropertyName(e.target.value);
                                                clearClientError(
                                                    'property_name',
                                                );
                                            }}
                                            placeholder="e.g. Sri Balaji Executive PG & Hostel"
                                            aria-invalid={Boolean(
                                                mergedErrors.property_name,
                                            )}
                                            aria-describedby={
                                                mergedErrors.property_name
                                                    ? 'property_name-error'
                                                    : undefined
                                            }
                                        />
                                        <InputError
                                            id="property_name-error"
                                            message={mergedErrors.property_name}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="property_category_id">
                                            Select Property Type{' '}
                                            <span className="text-tijum-coral">
                                                *
                                            </span>
                                        </Label>
                                        <select
                                            id="property_category_id"
                                            name="property_category_id"
                                            value={propertyCategoryId}
                                            onChange={(e) =>
                                                setPropertyCategoryId(
                                                    e.target.value,
                                                )
                                            }
                                            className={selectControlClassName}
                                        >
                                            {defaultCategories.map((cat) => (
                                                <option
                                                    key={cat.id}
                                                    value={cat.id}
                                                >
                                                    {cat.name}
                                                </option>
                                            ))}
                                        </select>
                                        <InputError
                                            id="property_category_id-error"
                                            message={
                                                mergedErrors.property_category_id
                                            }
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="available_for">
                                            Property Available For{' '}
                                            <span className="text-tijum-coral">
                                                *
                                            </span>
                                        </Label>
                                        <select
                                            id="available_for"
                                            name="available_for"
                                            value={availableFor}
                                            onChange={(e) =>
                                                setAvailableFor(e.target.value)
                                            }
                                            className={selectControlClassName}
                                        >
                                            <option value="male">
                                                Male Guests Only
                                            </option>
                                            <option value="female">
                                                Female Guests Only
                                            </option>
                                            <option value="both">
                                                Both / All Genders (Co-ed)
                                            </option>
                                        </select>
                                        <InputError
                                            id="available_for-error"
                                            message={mergedErrors.available_for}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="city_id">
                                            Property Location (City){' '}
                                            <span className="text-tijum-coral">
                                                *
                                            </span>
                                        </Label>
                                        <select
                                            id="city_id"
                                            name="city_id"
                                            value={cityId}
                                            onChange={(e) =>
                                                setCityId(e.target.value)
                                            }
                                            className={selectControlClassName}
                                        >
                                            {defaultCities.map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    {c.name}
                                                </option>
                                            ))}
                                        </select>
                                        <InputError
                                            id="city_id-error"
                                            message={mergedErrors.city_id}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="locality">
                                            Property Area / Locality{' '}
                                            <span className="text-tijum-coral">
                                                *
                                            </span>
                                        </Label>
                                        <Input
                                            id="locality"
                                            type="text"
                                            name="locality"
                                            value={locality}
                                            onChange={(e) => {
                                                setLocality(e.target.value);
                                                clearClientError('locality');
                                            }}
                                            placeholder="e.g. Madhapur, Brodipet, Benz Circle"
                                            aria-invalid={Boolean(
                                                mergedErrors.locality,
                                            )}
                                            aria-describedby={
                                                mergedErrors.locality
                                                    ? 'locality-error'
                                                    : undefined
                                            }
                                        />
                                        <InputError
                                            id="locality-error"
                                            message={mergedErrors.locality}
                                        />
                                    </div>

                                    <div className="grid gap-2 sm:col-span-2">
                                        <Label htmlFor="description">
                                            Describe Property{' '}
                                            <span className="text-xs font-normal text-tijum-plum-muted">
                                                (optional brief intro)
                                            </span>
                                        </Label>
                                        <Textarea
                                            id="description"
                                            name="description"
                                            value={description}
                                            onChange={(e) =>
                                                setDescription(e.target.value)
                                            }
                                            rows={3}
                                            placeholder="Briefly describe your building, surroundings, nearby landmarks, or facilities..."
                                            className="rounded-xl border-tijum-surface/80 bg-white text-tijum-plum"
                                            aria-invalid={Boolean(
                                                mergedErrors.description,
                                            )}
                                            aria-describedby={
                                                mergedErrors.description
                                                    ? 'description-error'
                                                    : undefined
                                            }
                                        />
                                        <InputError
                                            id="description-error"
                                            message={mergedErrors.description}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="lg"
                                        onClick={() => goToStep(1)}
                                        data-test="step-2-back"
                                    >
                                        <ArrowLeft
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                        <span>Back</span>
                                    </Button>
                                    <Button
                                        type="button"
                                        size="lg"
                                        onClick={() => goToStep(3)}
                                        data-test="step-2-next"
                                        className="flex-1"
                                    >
                                        <span>Continue to Security</span>
                                        <ArrowRight
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    </Button>
                                </div>
                            </div>

                            <div
                                className={cn(
                                    'space-y-4 transition-all duration-200',
                                    currentStep !== 3 && 'hidden',
                                )}
                            >
                                <div className="flex items-start gap-3 border-b border-tijum-surface pb-3">
                                    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-tijum-peach/30 text-tijum-plum">
                                        <ShieldCheck
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <div>
                                        <h3 className="font-heading text-sm font-bold text-tijum-plum">
                                            3. Account Security &amp; Agreement
                                        </h3>
                                        <p className="text-xs text-tijum-plum-muted">
                                            Set your password and confirm
                                            listing details to activate your
                                            partner account.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3 rounded-2xl border border-tijum-surface bg-tijum-cream/60 p-4">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-heading text-[11px] font-bold tracking-[0.12em] text-tijum-plum uppercase">
                                            Listing Summary
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => goToStep(2)}
                                            className="cursor-pointer font-heading text-xs font-semibold text-tijum-plum underline decoration-tijum-coral/65 underline-offset-4 hover:text-tijum-coral"
                                        >
                                            Edit Details
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                                        <div>
                                            <span className="block text-[11px] text-tijum-plum-muted">
                                                Property
                                            </span>
                                            <span className="block truncate font-semibold text-tijum-plum">
                                                {propertyName.trim() ||
                                                    'Property'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="block text-[11px] text-tijum-plum-muted">
                                                Type &amp; Gender
                                            </span>
                                            <span className="block truncate font-semibold text-tijum-plum">
                                                {selectedCategoryName} ·{' '}
                                                {genderLabel}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="block text-[11px] text-tijum-plum-muted">
                                                Location
                                            </span>
                                            <span className="block truncate font-semibold text-tijum-plum">
                                                {locality.trim()
                                                    ? `${locality.trim()}, ${selectedCityName}`
                                                    : selectedCityName}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="block text-[11px] text-tijum-plum-muted">
                                                Owner / Contact
                                            </span>
                                            <span className="block truncate font-semibold text-tijum-plum">
                                                {name.trim() || 'Contact'}{' '}
                                                {phone.trim()
                                                    ? `(${phone.trim()})`
                                                    : ''}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="password">
                                            Password{' '}
                                            <span className="text-tijum-coral">
                                                *
                                            </span>
                                        </Label>
                                        <PasswordInput
                                            id="password"
                                            name="password"
                                            value={password}
                                            onChange={(e) => {
                                                setPassword(e.target.value);
                                                clearClientError('password');
                                            }}
                                            autoComplete="new-password"
                                            placeholder="Minimum 8 characters"
                                            aria-invalid={Boolean(
                                                mergedErrors.password,
                                            )}
                                            aria-describedby={
                                                mergedErrors.password
                                                    ? 'password-error'
                                                    : undefined
                                            }
                                        />
                                        <InputError
                                            id="password-error"
                                            message={mergedErrors.password}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="password_confirmation">
                                            Confirm Password{' '}
                                            <span className="text-tijum-coral">
                                                *
                                            </span>
                                        </Label>
                                        <PasswordInput
                                            id="password_confirmation"
                                            name="password_confirmation"
                                            value={passwordConfirmation}
                                            onChange={(e) => {
                                                setPasswordConfirmation(
                                                    e.target.value,
                                                );
                                                clearClientError(
                                                    'password_confirmation',
                                                );
                                            }}
                                            autoComplete="new-password"
                                            placeholder="Re-enter password"
                                            aria-invalid={Boolean(
                                                mergedErrors.password_confirmation,
                                            )}
                                            aria-describedby={
                                                mergedErrors.password_confirmation
                                                    ? 'password_confirmation-error'
                                                    : undefined
                                            }
                                        />
                                        <InputError
                                            id="password_confirmation-error"
                                            message={
                                                mergedErrors.password_confirmation
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5 pt-1">
                                    <div className="flex items-start gap-3 rounded-xl border border-tijum-surface bg-tijum-cream/45 p-3.5">
                                        <Checkbox
                                            id="terms"
                                            name="terms"
                                            checked={terms}
                                            onCheckedChange={(checked) => {
                                                setTerms(Boolean(checked));
                                                clearClientError('terms');
                                            }}
                                            value="1"
                                            aria-invalid={Boolean(
                                                mergedErrors.terms,
                                            )}
                                            aria-describedby={
                                                mergedErrors.terms
                                                    ? 'terms-error'
                                                    : undefined
                                            }
                                            className="mt-0.5"
                                        />
                                        <Label
                                            htmlFor="terms"
                                            className="cursor-pointer font-body text-xs leading-relaxed text-tijum-plum-muted"
                                        >
                                            I confirm that I am the authorized
                                            owner or operator of this property,
                                            and I agree to the{' '}
                                            <a
                                                href={publicTerms.url()}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="font-semibold text-tijum-plum underline decoration-tijum-coral/60 underline-offset-2 hover:text-tijum-coral"
                                            >
                                                TIJUM Partner Terms &amp;
                                                Conditions
                                            </a>{' '}
                                            and{' '}
                                            <a
                                                href={privacy.url()}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="font-semibold text-tijum-plum underline decoration-tijum-coral/60 underline-offset-2 hover:text-tijum-coral"
                                            >
                                                Privacy Policy
                                            </a>
                                            .{' '}
                                            <span className="text-tijum-coral">
                                                *
                                            </span>
                                        </Label>
                                    </div>
                                    <InputError
                                        id="terms-error"
                                        message={mergedErrors.terms}
                                    />
                                </div>

                                <div className="flex items-center gap-3 pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="lg"
                                        onClick={() => goToStep(2)}
                                        data-test="step-3-back"
                                    >
                                        <ArrowLeft
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                        <span>Back</span>
                                    </Button>
                                    <Button
                                        type="submit"
                                        size="lg"
                                        className="flex-1"
                                        loading={processing}
                                        data-test="owner-register-button"
                                    >
                                        <ShieldCheck
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                        <span>Register Property</span>
                                    </Button>
                                </div>
                            </div>

                            <div className="border-t border-tijum-surface/80 pt-5 text-center">
                                <p className="text-sm text-tijum-plum-muted">
                                    Already registered as a partner?{' '}
                                    <TextLink
                                        href={login()}
                                        className="font-semibold text-tijum-plum"
                                    >
                                        Sign in to Partner Portal
                                    </TextLink>
                                </p>
                            </div>
                        </>
                    );
                }}
            </Form>
        </>
    );
}

OwnerRegister.authMeta = {
    title: 'Partner Registration & Property Listing',
    description:
        'List your Hostel/PG, Homestay, or Co-Living property on TIJUM and start accepting direct guest bookings.',
    maxWidth: 'wide' as const,
};

OwnerRegister.layout = OwnerRegister.authMeta;
