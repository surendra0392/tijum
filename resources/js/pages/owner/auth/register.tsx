import { Form, Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    Building2,
    Check,
    ChevronDown,
    Lock,
    Mail,
    MapPin,
    Phone,
    ShieldCheck,
    User,
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
import { login, register } from '@/routes/owner';
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
        number: 1 as const,
        code: '01',
        title: 'Contact',
        subtitle: 'Owner details',
    },
    {
        number: 2 as const,
        code: '02',
        title: 'Property',
        subtitle: 'Type & location',
    },
    {
        number: 3 as const,
        code: '03',
        title: 'Security',
        subtitle: 'Password & review',
    },
] as const;

const selectControlClassName =
    'h-12 w-full cursor-pointer appearance-none rounded-xl border border-tijum-surface/85 bg-tijum-cream/25 pr-10 pl-4 py-2 text-sm text-tijum-plum transition-[color,border-color,box-shadow,background-color] outline-none hover:border-tijum-plum/55 focus-visible:border-tijum-coral focus-visible:bg-white focus-visible:ring-[3px] focus-visible:ring-tijum-coral/25';

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
              : 'All Genders';

    return (
        <>
            <Head title="Partner Registration — List Your Property" />

            <div
                role="tablist"
                aria-label="Partner portal access"
                className="mb-6 grid grid-cols-2 rounded-xl border border-tijum-surface/80 bg-tijum-cream/65 p-1"
            >
                <Link
                    href={login()}
                    role="tab"
                    aria-selected="false"
                    className="inline-flex h-10 items-center justify-center rounded-lg font-heading text-sm font-medium text-tijum-plum-muted transition-colors hover:text-tijum-plum"
                >
                    Partner sign in
                </Link>
                <Link
                    href={register()}
                    role="tab"
                    aria-selected="true"
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-tijum-plum font-heading text-sm font-semibold text-tijum-cream shadow-xs"
                >
                    List your property
                </Link>
            </div>

            {/* Clean architectural 3-step progress rail */}
            <div className="mb-6 space-y-2.5">
                <nav aria-label="Registration Progress">
                    <ol className="grid grid-cols-3 gap-2">
                        {STEPS.map((s) => {
                            const isCompleted = currentStep > s.number;
                            const isCurrent = currentStep === s.number;
                            const isReachable =
                                s.number <= highestVisitedStep ||
                                s.number <= currentStep;

                            return (
                                <li key={s.number}>
                                    <button
                                        type="button"
                                        onClick={() => goToStep(s.number)}
                                        disabled={!isReachable}
                                        className={cn(
                                            'flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all',
                                            isCurrent
                                                ? 'border-tijum-plum/30 bg-tijum-cream/75 text-tijum-plum shadow-2xs'
                                                : isCompleted
                                                  ? 'cursor-pointer border-tijum-surface/85 bg-white text-tijum-plum hover:border-tijum-plum/30'
                                                  : 'cursor-not-allowed border-tijum-surface/60 bg-tijum-cream/25 text-tijum-plum-muted/70',
                                        )}
                                        aria-current={
                                            isCurrent ? 'step' : undefined
                                        }
                                    >
                                        <span
                                            className={cn(
                                                'flex size-6 shrink-0 items-center justify-center rounded-lg font-heading text-[11px] font-bold transition-colors',
                                                isCurrent
                                                    ? 'bg-tijum-coral text-white'
                                                    : isCompleted
                                                      ? 'bg-tijum-plum text-tijum-cream'
                                                      : 'bg-tijum-surface/80 text-tijum-plum-muted',
                                            )}
                                        >
                                            {isCompleted ? (
                                                <Check
                                                    className="size-3.5 stroke-[2.75]"
                                                    aria-hidden="true"
                                                />
                                            ) : (
                                                s.code
                                            )}
                                        </span>
                                        <div className="min-w-0">
                                            <p className="truncate font-heading text-xs font-bold">
                                                {s.title}
                                            </p>
                                            <p className="hidden truncate text-[11px] text-tijum-plum-muted sm:block">
                                                {s.subtitle}
                                            </p>
                                        </div>
                                    </button>
                                </li>
                            );
                        })}
                    </ol>
                </nav>

                <div className="h-1 w-full overflow-hidden rounded-full bg-tijum-surface/75">
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
                            {/* Step 1: Primary Contact */}
                            <div
                                className={cn(
                                    'space-y-4',
                                    currentStep !== 1 && 'hidden',
                                )}
                            >
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="grid gap-2 sm:col-span-2">
                                        <Label
                                            htmlFor="name"
                                            className="text-[13px] font-semibold text-tijum-plum"
                                        >
                                            Owner or primary contact name{' '}
                                            <span className="text-tijum-coral">
                                                *
                                            </span>
                                        </Label>
                                        <div className="relative">
                                            <User
                                                className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-4 -translate-y-1/2 text-tijum-plum-muted/80"
                                                aria-hidden="true"
                                            />
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
                                                className="bg-tijum-cream/25 pl-10 focus-visible:bg-white"
                                                aria-invalid={Boolean(
                                                    mergedErrors.name,
                                                )}
                                                aria-describedby={
                                                    mergedErrors.name
                                                        ? 'name-error'
                                                        : undefined
                                                }
                                            />
                                        </div>
                                        <InputError
                                            id="name-error"
                                            message={mergedErrors.name}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="email"
                                            className="text-[13px] font-semibold text-tijum-plum"
                                        >
                                            Business email{' '}
                                            <span className="text-tijum-coral">
                                                *
                                            </span>
                                        </Label>
                                        <div className="relative">
                                            <Mail
                                                className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-4 -translate-y-1/2 text-tijum-plum-muted/80"
                                                aria-hidden="true"
                                            />
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
                                                className="bg-tijum-cream/25 pl-10 focus-visible:bg-white"
                                                aria-invalid={Boolean(
                                                    mergedErrors.email,
                                                )}
                                                aria-describedby={
                                                    mergedErrors.email
                                                        ? 'email-error'
                                                        : undefined
                                                }
                                            />
                                        </div>
                                        <InputError
                                            id="email-error"
                                            message={mergedErrors.email}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="phone"
                                            className="text-[13px] font-semibold text-tijum-plum"
                                        >
                                            Mobile number{' '}
                                            <span className="text-tijum-coral">
                                                *
                                            </span>
                                        </Label>
                                        <div className="relative">
                                            <Phone
                                                className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-4 -translate-y-1/2 text-tijum-plum-muted/80"
                                                aria-hidden="true"
                                            />
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
                                                placeholder="9876543210"
                                                className="bg-tijum-cream/25 pl-10 focus-visible:bg-white"
                                                aria-invalid={Boolean(
                                                    mergedErrors.phone,
                                                )}
                                                aria-describedby={
                                                    mergedErrors.phone
                                                        ? 'phone-error'
                                                        : undefined
                                                }
                                            />
                                        </div>
                                        <InputError
                                            id="phone-error"
                                            message={mergedErrors.phone}
                                        />
                                    </div>
                                </div>

                                <div className="pt-1">
                                    <Button
                                        type="button"
                                        size="lg"
                                        onClick={() => goToStep(2)}
                                        data-test="step-1-next"
                                        className="h-12 w-full rounded-xl"
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

                            {/* Step 2: Property Information */}
                            <div
                                className={cn(
                                    'space-y-4',
                                    currentStep !== 2 && 'hidden',
                                )}
                            >
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="grid gap-2 sm:col-span-2">
                                        <Label
                                            htmlFor="property_name"
                                            className="text-[13px] font-semibold text-tijum-plum"
                                        >
                                            Property name{' '}
                                            <span className="text-tijum-coral">
                                                *
                                            </span>
                                        </Label>
                                        <div className="relative">
                                            <Building2
                                                className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-4 -translate-y-1/2 text-tijum-plum-muted/80"
                                                aria-hidden="true"
                                            />
                                            <Input
                                                id="property_name"
                                                type="text"
                                                name="property_name"
                                                value={propertyName}
                                                onChange={(e) => {
                                                    setPropertyName(
                                                        e.target.value,
                                                    );
                                                    clearClientError(
                                                        'property_name',
                                                    );
                                                }}
                                                placeholder="e.g. Sri Balaji Executive PG & Hostel"
                                                className="bg-tijum-cream/25 pl-10 focus-visible:bg-white"
                                                aria-invalid={Boolean(
                                                    mergedErrors.property_name,
                                                )}
                                                aria-describedby={
                                                    mergedErrors.property_name
                                                        ? 'property_name-error'
                                                        : undefined
                                                }
                                            />
                                        </div>
                                        <InputError
                                            id="property_name-error"
                                            message={mergedErrors.property_name}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="property_category_id"
                                            className="text-[13px] font-semibold text-tijum-plum"
                                        >
                                            Property type{' '}
                                            <span className="text-tijum-coral">
                                                *
                                            </span>
                                        </Label>
                                        <div className="relative">
                                            <select
                                                id="property_category_id"
                                                name="property_category_id"
                                                value={propertyCategoryId}
                                                onChange={(e) =>
                                                    setPropertyCategoryId(
                                                        e.target.value,
                                                    )
                                                }
                                                className={
                                                    selectControlClassName
                                                }
                                            >
                                                {defaultCategories.map(
                                                    (cat) => (
                                                        <option
                                                            key={cat.id}
                                                            value={cat.id}
                                                        >
                                                            {cat.name}
                                                        </option>
                                                    ),
                                                )}
                                            </select>
                                            <ChevronDown
                                                className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-tijum-plum-muted"
                                                aria-hidden="true"
                                            />
                                        </div>
                                        <InputError
                                            id="property_category_id-error"
                                            message={
                                                mergedErrors.property_category_id
                                            }
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="available_for"
                                            className="text-[13px] font-semibold text-tijum-plum"
                                        >
                                            Guest eligibility{' '}
                                            <span className="text-tijum-coral">
                                                *
                                            </span>
                                        </Label>
                                        <div className="relative">
                                            <select
                                                id="available_for"
                                                name="available_for"
                                                value={availableFor}
                                                onChange={(e) =>
                                                    setAvailableFor(
                                                        e.target.value,
                                                    )
                                                }
                                                className={
                                                    selectControlClassName
                                                }
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
                                            <ChevronDown
                                                className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-tijum-plum-muted"
                                                aria-hidden="true"
                                            />
                                        </div>
                                        <InputError
                                            id="available_for-error"
                                            message={mergedErrors.available_for}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="city_id"
                                            className="text-[13px] font-semibold text-tijum-plum"
                                        >
                                            City{' '}
                                            <span className="text-tijum-coral">
                                                *
                                            </span>
                                        </Label>
                                        <div className="relative">
                                            <select
                                                id="city_id"
                                                name="city_id"
                                                value={cityId}
                                                onChange={(e) =>
                                                    setCityId(e.target.value)
                                                }
                                                className={
                                                    selectControlClassName
                                                }
                                            >
                                                {defaultCities.map((c) => (
                                                    <option
                                                        key={c.id}
                                                        value={c.id}
                                                    >
                                                        {c.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <ChevronDown
                                                className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-tijum-plum-muted"
                                                aria-hidden="true"
                                            />
                                        </div>
                                        <InputError
                                            id="city_id-error"
                                            message={mergedErrors.city_id}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="locality"
                                            className="text-[13px] font-semibold text-tijum-plum"
                                        >
                                            Area / locality{' '}
                                            <span className="text-tijum-coral">
                                                *
                                            </span>
                                        </Label>
                                        <div className="relative">
                                            <MapPin
                                                className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-4 -translate-y-1/2 text-tijum-plum-muted/80"
                                                aria-hidden="true"
                                            />
                                            <Input
                                                id="locality"
                                                type="text"
                                                name="locality"
                                                value={locality}
                                                onChange={(e) => {
                                                    setLocality(e.target.value);
                                                    clearClientError(
                                                        'locality',
                                                    );
                                                }}
                                                placeholder="e.g. Madhapur, Benz Circle"
                                                className="bg-tijum-cream/25 pl-10 focus-visible:bg-white"
                                                aria-invalid={Boolean(
                                                    mergedErrors.locality,
                                                )}
                                                aria-describedby={
                                                    mergedErrors.locality
                                                        ? 'locality-error'
                                                        : undefined
                                                }
                                            />
                                        </div>
                                        <InputError
                                            id="locality-error"
                                            message={mergedErrors.locality}
                                        />
                                    </div>

                                    <div className="grid gap-2 sm:col-span-2">
                                        <Label
                                            htmlFor="description"
                                            className="text-[13px] font-semibold text-tijum-plum"
                                        >
                                            Property overview{' '}
                                            <span className="text-xs font-normal text-tijum-plum-muted">
                                                (optional)
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
                                            placeholder="Briefly describe your rooms, nearby landmarks, or facilities..."
                                            className="rounded-xl border-tijum-surface/85 bg-tijum-cream/25 text-tijum-plum focus-visible:bg-white"
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

                                <div className="flex items-center gap-3 pt-1">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="lg"
                                        onClick={() => goToStep(1)}
                                        data-test="step-2-back"
                                        className="h-12 rounded-xl"
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
                                        className="h-12 flex-1 rounded-xl"
                                    >
                                        <span>Continue to Security</span>
                                        <ArrowRight
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    </Button>
                                </div>
                            </div>

                            {/* Step 3: Security & Review */}
                            <div
                                className={cn(
                                    'space-y-4',
                                    currentStep !== 3 && 'hidden',
                                )}
                            >
                                <div className="space-y-3 rounded-2xl border border-tijum-surface/85 bg-tijum-cream/50 p-4">
                                    <div className="flex items-center justify-between gap-2 border-b border-tijum-surface/75 pb-2.5">
                                        <span className="font-heading text-xs font-bold text-tijum-plum">
                                            Property submission summary
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => goToStep(2)}
                                            className="cursor-pointer font-heading text-xs font-semibold text-tijum-coral hover:text-tijum-plum hover:underline"
                                        >
                                            Edit details
                                        </button>
                                    </div>
                                    <dl className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                                        <div>
                                            <dt className="text-[11px] text-tijum-plum-muted">
                                                Property
                                            </dt>
                                            <dd className="truncate font-semibold text-tijum-plum">
                                                {propertyName.trim() ||
                                                    'Property'}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-[11px] text-tijum-plum-muted">
                                                Category &amp; guests
                                            </dt>
                                            <dd className="truncate font-semibold text-tijum-plum">
                                                {selectedCategoryName} ·{' '}
                                                {genderLabel}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-[11px] text-tijum-plum-muted">
                                                Location
                                            </dt>
                                            <dd className="truncate font-semibold text-tijum-plum">
                                                {locality.trim()
                                                    ? `${locality.trim()}, ${selectedCityName}`
                                                    : selectedCityName}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-[11px] text-tijum-plum-muted">
                                                Primary contact
                                            </dt>
                                            <dd className="truncate font-semibold text-tijum-plum">
                                                {name.trim() || 'Contact'}
                                                {phone.trim()
                                                    ? ` · ${phone.trim()}`
                                                    : ''}
                                            </dd>
                                        </div>
                                    </dl>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="password"
                                            className="text-[13px] font-semibold text-tijum-plum"
                                        >
                                            Password{' '}
                                            <span className="text-tijum-coral">
                                                *
                                            </span>
                                        </Label>
                                        <div className="relative">
                                            <Lock
                                                className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-4 -translate-y-1/2 text-tijum-plum-muted/80"
                                                aria-hidden="true"
                                            />
                                            <PasswordInput
                                                id="password"
                                                name="password"
                                                value={password}
                                                onChange={(e) => {
                                                    setPassword(e.target.value);
                                                    clearClientError(
                                                        'password',
                                                    );
                                                }}
                                                autoComplete="new-password"
                                                placeholder="Minimum 8 characters"
                                                className="bg-tijum-cream/25 pl-10 focus-visible:bg-white"
                                                aria-invalid={Boolean(
                                                    mergedErrors.password,
                                                )}
                                                aria-describedby={
                                                    mergedErrors.password
                                                        ? 'password-error'
                                                        : undefined
                                                }
                                            />
                                        </div>
                                        <InputError
                                            id="password-error"
                                            message={mergedErrors.password}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="password_confirmation"
                                            className="text-[13px] font-semibold text-tijum-plum"
                                        >
                                            Confirm password{' '}
                                            <span className="text-tijum-coral">
                                                *
                                            </span>
                                        </Label>
                                        <div className="relative">
                                            <Lock
                                                className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-4 -translate-y-1/2 text-tijum-plum-muted/80"
                                                aria-hidden="true"
                                            />
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
                                                className="bg-tijum-cream/25 pl-10 focus-visible:bg-white"
                                                aria-invalid={Boolean(
                                                    mergedErrors.password_confirmation,
                                                )}
                                                aria-describedby={
                                                    mergedErrors.password_confirmation
                                                        ? 'password_confirmation-error'
                                                        : undefined
                                                }
                                            />
                                        </div>
                                        <InputError
                                            id="password_confirmation-error"
                                            message={
                                                mergedErrors.password_confirmation
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5 pt-0.5">
                                    <div className="flex items-start gap-2.5">
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
                                            className="cursor-pointer font-body text-xs leading-relaxed font-normal text-tijum-plum-muted"
                                        >
                                            I confirm I am the authorized owner
                                            or operator of this property, and I
                                            agree to the{' '}
                                            <a
                                                href={publicTerms.url()}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="font-semibold text-tijum-plum underline decoration-tijum-coral/60 underline-offset-2 hover:text-tijum-coral"
                                            >
                                                Partner Terms &amp; Conditions
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

                                <div className="flex items-center gap-3 pt-1">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="lg"
                                        onClick={() => goToStep(2)}
                                        data-test="step-3-back"
                                        className="h-12 rounded-xl"
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
                                        className="h-12 flex-1 rounded-xl"
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

                            <p className="pt-1 text-center text-sm text-tijum-plum-muted">
                                Already registered as a partner?{' '}
                                <TextLink
                                    href={login()}
                                    className="font-semibold text-tijum-plum"
                                >
                                    Sign in to Partner Portal
                                </TextLink>
                            </p>
                        </>
                    );
                }}
            </Form>
        </>
    );
}

OwnerRegister.authMeta = {
    title: 'List your property on TIJUM',
    description:
        'Register your Hostel/PG, Homestay, or Co-Living space in three quick steps to start accepting direct guest bookings.',
    maxWidth: 'wide' as const,
};

OwnerRegister.layout = OwnerRegister.authMeta;
