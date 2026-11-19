import { Form, Head, Link } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowRight,
    CheckCircle2,
    ChevronDown,
    Gift,
    Loader2,
    Lock,
    Mail,
    Phone,
    User,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { login, register } from '@/routes';
import { privacy, terms as publicTerms } from '@/routes/public';
import { store } from '@/routes/register';

type Props = {
    passwordRules: string;
};

type ReferralValidationState = {
    valid: boolean;
    message: string;
    referrerName?: string;
    rewardPoints?: number;
} | null;

export default function Register({ passwordRules }: Props) {
    const getInitialReferralCode = (): string => {
        if (typeof window === 'undefined') return '';
        const searchParams = new URLSearchParams(window.location.search);
        const queryRef = searchParams.get('ref');
        const cookieMatch = document.cookie.match(
            /(?:^|;\s*)tijum_referral_code=([^;]+)/,
        );
        const cookieRef = cookieMatch ? decodeURIComponent(cookieMatch[1]) : '';
        return (queryRef || cookieRef || '').trim().toUpperCase();
    };

    const [referralCode, setReferralCode] = useState<string>(() =>
        getInitialReferralCode(),
    );
    const [showReferralField, setShowReferralField] = useState<boolean>(() =>
        Boolean(getInitialReferralCode()),
    );
    const [isValidating, setIsValidating] = useState<boolean>(false);
    const [validationResult, setValidationResult] =
        useState<ReferralValidationState>(null);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const validateCode = useCallback(async (codeToValidate: string) => {
        const normalized = codeToValidate.trim().toUpperCase();
        if (!normalized || normalized.length < 3) {
            setValidationResult(null);
            setIsValidating(false);
            return;
        }

        setIsValidating(true);
        try {
            const response = await fetch(
                `/api/referrals/validate?code=${encodeURIComponent(normalized)}`,
                {
                    headers: {
                        Accept: 'application/json',
                    },
                },
            );

            if (!response.ok) {
                setValidationResult({
                    valid: false,
                    message: 'Unable to verify referral code at this moment.',
                });
                return;
            }

            const data = await response.json();
            if (data.valid) {
                setValidationResult({
                    valid: true,
                    message:
                        data.message ||
                        `Valid code from ${data.referrer_name}! You will receive ${data.reward_points ?? 250} bonus points instantly.`,
                    referrerName: data.referrer_name,
                    rewardPoints: data.reward_points,
                });
            } else {
                setValidationResult({
                    valid: false,
                    message:
                        data.message ||
                        'Referral code not found. Please verify with your friend.',
                });
            }
        } catch {
            setValidationResult({
                valid: false,
                message: 'Network error while checking referral code.',
            });
        } finally {
            setIsValidating(false);
        }
    }, []);

    const handleReferralChange = (newVal: string) => {
        const cleaned = newVal.replace(/[^A-Za-z0-9_-]/g, '').toUpperCase();
        setReferralCode(cleaned);

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        if (!cleaned.trim()) {
            setValidationResult(null);
            setIsValidating(false);
            return;
        }

        setIsValidating(true);
        debounceTimerRef.current = setTimeout(() => {
            void validateCode(cleaned);
        }, 400);
    };

    useEffect(() => {
        const initial = getInitialReferralCode();
        if (initial) {
            void validateCode(initial);
        }
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [validateCode]);

    return (
        <>
            <Head title="Create account" />

            <div
                role="tablist"
                aria-label="Account access"
                className="mb-6 grid grid-cols-2 rounded-xl border border-tijum-surface/80 bg-tijum-cream/85 p-1"
            >
                <Link
                    href={login()}
                    role="tab"
                    aria-selected="false"
                    className="inline-flex h-10 items-center justify-center rounded-lg font-heading text-sm font-medium text-tijum-plum-muted transition-colors hover:text-tijum-plum"
                >
                    Log in
                </Link>
                <Link
                    href={register()}
                    role="tab"
                    aria-selected="true"
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-white font-heading text-sm font-semibold text-tijum-plum shadow-2xs"
                >
                    Create account
                </Link>
            </div>

            <Form
                {...store.form()}
                resetOnSuccess={['password', 'password_confirmation']}
                disableWhileProcessing
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => {
                    const isReferralOpen =
                        showReferralField || Boolean(errors.referral_code);

                    return (
                        <>
                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label
                                        htmlFor="name"
                                        className="text-[13px] font-semibold text-tijum-plum"
                                    >
                                        Full name
                                    </Label>
                                    <div className="relative">
                                        <User
                                            className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-4 -translate-y-1/2 text-tijum-plum-muted/80"
                                            aria-hidden="true"
                                        />
                                        <Input
                                            id="name"
                                            type="text"
                                            required
                                            autoFocus
                                            autoComplete="name"
                                            name="name"
                                            placeholder="Aarav Sharma"
                                            className="bg-white pl-10 shadow-2xs"
                                            aria-invalid={Boolean(errors.name)}
                                            aria-describedby={
                                                errors.name
                                                    ? 'name-error'
                                                    : undefined
                                            }
                                        />
                                    </div>
                                    <InputError
                                        id="name-error"
                                        message={errors.name}
                                    />
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="email"
                                            className="text-[13px] font-semibold text-tijum-plum"
                                        >
                                            Email address
                                        </Label>
                                        <div className="relative">
                                            <Mail
                                                className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-4 -translate-y-1/2 text-tijum-plum-muted/80"
                                                aria-hidden="true"
                                            />
                                            <Input
                                                id="email"
                                                type="email"
                                                required
                                                autoComplete="email"
                                                name="email"
                                                placeholder="you@example.com"
                                                className="bg-white pl-10 shadow-2xs"
                                                aria-invalid={Boolean(
                                                    errors.email,
                                                )}
                                                aria-describedby={
                                                    errors.email
                                                        ? 'email-error'
                                                        : undefined
                                                }
                                            />
                                        </div>
                                        <InputError
                                            id="email-error"
                                            message={errors.email}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="phone"
                                            className="text-[13px] font-semibold text-tijum-plum"
                                        >
                                            Mobile number
                                        </Label>
                                        <div className="relative">
                                            <Phone
                                                className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-4 -translate-y-1/2 text-tijum-plum-muted/80"
                                                aria-hidden="true"
                                            />
                                            <Input
                                                id="phone"
                                                type="tel"
                                                required
                                                autoComplete="tel"
                                                name="phone"
                                                placeholder="9876543210"
                                                pattern="[6-9][0-9]{9}"
                                                maxLength={10}
                                                className="bg-white pl-10 shadow-2xs"
                                                aria-invalid={Boolean(
                                                    errors.phone,
                                                )}
                                                aria-describedby={
                                                    errors.phone
                                                        ? 'phone-error'
                                                        : undefined
                                                }
                                            />
                                        </div>
                                        <InputError
                                            id="phone-error"
                                            message={errors.phone}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="password"
                                            className="text-[13px] font-semibold text-tijum-plum"
                                        >
                                            Password
                                        </Label>
                                        <div className="relative">
                                            <Lock
                                                className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-4 -translate-y-1/2 text-tijum-plum-muted/80"
                                                aria-hidden="true"
                                            />
                                            <PasswordInput
                                                id="password"
                                                required
                                                autoComplete="new-password"
                                                name="password"
                                                placeholder="Create password"
                                                passwordrules={passwordRules}
                                                className="bg-white pl-10 shadow-2xs"
                                                aria-invalid={Boolean(
                                                    errors.password,
                                                )}
                                                aria-describedby={
                                                    errors.password
                                                        ? 'password-error'
                                                        : undefined
                                                }
                                            />
                                        </div>
                                        <InputError
                                            id="password-error"
                                            message={errors.password}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="password_confirmation"
                                            className="text-[13px] font-semibold text-tijum-plum"
                                        >
                                            Confirm password
                                        </Label>
                                        <div className="relative">
                                            <Lock
                                                className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-4 -translate-y-1/2 text-tijum-plum-muted/80"
                                                aria-hidden="true"
                                            />
                                            <PasswordInput
                                                id="password_confirmation"
                                                required
                                                autoComplete="new-password"
                                                name="password_confirmation"
                                                placeholder="Repeat password"
                                                passwordrules={passwordRules}
                                                className="bg-white pl-10 shadow-2xs"
                                                aria-invalid={Boolean(
                                                    errors.password_confirmation,
                                                )}
                                                aria-describedby={
                                                    errors.password_confirmation
                                                        ? 'password-confirmation-error'
                                                        : undefined
                                                }
                                            />
                                        </div>
                                        <InputError
                                            id="password-confirmation-error"
                                            message={
                                                errors.password_confirmation
                                            }
                                        />
                                    </div>
                                </div>

                                {/* Optional referral code drawer */}
                                <div className="rounded-xl border border-tijum-surface/85 bg-tijum-cream/45 transition-colors">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowReferralField(
                                                (prev) => !prev,
                                            )
                                        }
                                        aria-expanded={isReferralOpen}
                                        className="flex w-full cursor-pointer items-center justify-between gap-3 px-3.5 py-3 text-left"
                                    >
                                        <span className="flex items-center gap-2.5">
                                            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-tijum-peach/40 text-tijum-plum">
                                                <Gift
                                                    className="size-3.5"
                                                    aria-hidden="true"
                                                />
                                            </span>
                                            <span className="font-heading text-xs font-semibold text-tijum-plum">
                                                Have a referral code?
                                            </span>
                                        </span>
                                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-tijum-plum-muted">
                                            <span>₹250 bonus points</span>
                                            <ChevronDown
                                                className={cn(
                                                    'size-3.5 transition-transform duration-200',
                                                    isReferralOpen &&
                                                        'rotate-180',
                                                )}
                                                aria-hidden="true"
                                            />
                                        </span>
                                    </button>

                                    {!isReferralOpen && referralCode && (
                                        <input
                                            type="hidden"
                                            name="referral_code"
                                            value={referralCode}
                                        />
                                    )}

                                    {isReferralOpen && (
                                        <div className="space-y-2.5 border-t border-tijum-surface/70 px-3.5 pt-3 pb-3.5">
                                            <div className="grid gap-1.5">
                                                <Label
                                                    htmlFor="referral_code"
                                                    className="text-xs font-semibold text-tijum-plum"
                                                >
                                                    Referral code (optional)
                                                </Label>
                                                <div className="relative">
                                                    <Input
                                                        id="referral_code"
                                                        type="text"
                                                        name="referral_code"
                                                        autoComplete="off"
                                                        value={referralCode}
                                                        onChange={(e) =>
                                                            handleReferralChange(
                                                                e.target.value,
                                                            )
                                                        }
                                                        placeholder="e.g. TIJUM-AARAV12"
                                                        maxLength={24}
                                                        className="h-11 bg-white pr-10 font-mono text-sm tracking-wider uppercase shadow-2xs"
                                                        aria-invalid={
                                                            validationResult?.valid ===
                                                                false ||
                                                            Boolean(
                                                                errors.referral_code,
                                                            )
                                                        }
                                                        aria-describedby="referral-code-status"
                                                    />
                                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                                        {isValidating && (
                                                            <Loader2
                                                                className="size-4 animate-spin text-tijum-plum-muted"
                                                                aria-label="Checking code..."
                                                            />
                                                        )}
                                                        {!isValidating &&
                                                            validationResult?.valid ===
                                                                true && (
                                                                <CheckCircle2
                                                                    className="size-4 text-tijum-emerald"
                                                                    aria-label="Code is valid"
                                                                />
                                                            )}
                                                        {!isValidating &&
                                                            validationResult?.valid ===
                                                                false && (
                                                                <AlertCircle
                                                                    className="size-4 text-tijum-coral"
                                                                    aria-label="Code is invalid"
                                                                />
                                                            )}
                                                    </div>
                                                </div>
                                            </div>

                                            {validationResult?.valid ===
                                                true && (
                                                <div
                                                    id="referral-code-status"
                                                    className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900"
                                                >
                                                    <CheckCircle2
                                                        className="mt-0.5 size-3.5 shrink-0 text-tijum-emerald"
                                                        aria-hidden="true"
                                                    />
                                                    <span>
                                                        {
                                                            validationResult.message
                                                        }
                                                    </span>
                                                </div>
                                            )}

                                            {validationResult?.valid ===
                                                false && (
                                                <div
                                                    id="referral-code-status"
                                                    className="flex items-start gap-2 rounded-lg border border-tijum-coral/40 bg-tijum-coral/10 px-3 py-2 text-xs text-tijum-plum"
                                                >
                                                    <AlertCircle
                                                        className="mt-0.5 size-3.5 shrink-0 text-tijum-coral"
                                                        aria-hidden="true"
                                                    />
                                                    <span>
                                                        {
                                                            validationResult.message
                                                        }
                                                    </span>
                                                </div>
                                            )}

                                            <InputError
                                                id="referral-code-error"
                                                message={errors.referral_code}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-1.5 pt-0.5">
                                    <div className="flex items-start gap-2.5">
                                        <Checkbox
                                            id="terms"
                                            name="terms"
                                            required
                                            value="1"
                                            aria-invalid={Boolean(errors.terms)}
                                            aria-describedby={
                                                errors.terms
                                                    ? 'terms-error'
                                                    : undefined
                                            }
                                            className="mt-0.5"
                                        />
                                        <Label
                                            htmlFor="terms"
                                            className="cursor-pointer font-body text-xs leading-relaxed font-normal text-tijum-plum-muted"
                                        >
                                            I agree to the{' '}
                                            <a
                                                href={publicTerms.url()}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="font-semibold text-tijum-plum underline decoration-tijum-coral/60 underline-offset-2 hover:text-tijum-coral"
                                            >
                                                Terms &amp; Conditions
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
                                            .
                                        </Label>
                                    </div>
                                    <InputError
                                        id="terms-error"
                                        message={errors.terms}
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                size="lg"
                                className="h-12 w-full rounded-xl"
                                loading={processing}
                                data-test="register-user-button"
                            >
                                <span>Create account</span>
                                <ArrowRight
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            </Button>

                            <p className="pt-1 text-center text-sm text-tijum-plum-muted">
                                Already have an account?{' '}
                                <TextLink
                                    href={login()}
                                    className="font-semibold text-tijum-plum"
                                >
                                    Log in
                                </TextLink>
                            </p>
                        </>
                    );
                }}
            </Form>
        </>
    );
}

Register.authMeta = {
    title: 'Create your account',
    description:
        'Book verified Hostels/PG, Homestays, and Co-Living stays with clear pricing and meal details.',
    maxWidth: 'comfortable' as const,
};

Register.layout = Register.authMeta;
