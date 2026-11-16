import { Form, Head } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowRight,
    CheckCircle2,
    Gift,
    Loader2,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login } from '@/routes';
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
            validateCode(cleaned);
        }, 400);
    };

    useEffect(() => {
        const initial = getInitialReferralCode();
        if (initial) {
            validateCode(initial);
        }
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [validateCode]);

    return (
        <>
            <Head title="Register" />

            <Form
                {...store.form()}
                resetOnSuccess={['password', 'password_confirmation']}
                disableWhileProcessing
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Full name</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    required
                                    autoFocus
                                    autoComplete="name"
                                    name="name"
                                    placeholder="Aarav Sharma"
                                    aria-invalid={Boolean(errors.name)}
                                    aria-describedby={
                                        errors.name ? 'name-error' : undefined
                                    }
                                />
                                <InputError
                                    id="name-error"
                                    message={errors.name}
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email address</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        required
                                        autoComplete="email"
                                        name="email"
                                        placeholder="you@example.com"
                                        aria-invalid={Boolean(errors.email)}
                                        aria-describedby={
                                            errors.email
                                                ? 'email-error'
                                                : undefined
                                        }
                                    />
                                    <InputError
                                        id="email-error"
                                        message={errors.email}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="phone">Mobile number</Label>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        required
                                        autoComplete="tel"
                                        name="phone"
                                        placeholder="9876543210"
                                        pattern="[6-9][0-9]{9}"
                                        maxLength={10}
                                        aria-invalid={Boolean(errors.phone)}
                                        aria-describedby={
                                            errors.phone
                                                ? 'phone-error'
                                                : undefined
                                        }
                                    />
                                    <InputError
                                        id="phone-error"
                                        message={errors.phone}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="password">Password</Label>
                                    <PasswordInput
                                        id="password"
                                        required
                                        autoComplete="new-password"
                                        name="password"
                                        placeholder="Create password"
                                        passwordrules={passwordRules}
                                        aria-invalid={Boolean(errors.password)}
                                        aria-describedby={
                                            errors.password
                                                ? 'password-error'
                                                : undefined
                                        }
                                    />
                                    <InputError
                                        id="password-error"
                                        message={errors.password}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="password_confirmation">
                                        Confirm password
                                    </Label>
                                    <PasswordInput
                                        id="password_confirmation"
                                        required
                                        autoComplete="new-password"
                                        name="password_confirmation"
                                        placeholder="Repeat password"
                                        passwordrules={passwordRules}
                                        aria-invalid={Boolean(
                                            errors.password_confirmation,
                                        )}
                                        aria-describedby={
                                            errors.password_confirmation
                                                ? 'password-confirmation-error'
                                                : undefined
                                        }
                                    />
                                    <InputError
                                        id="password-confirmation-error"
                                        message={errors.password_confirmation}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2.5 rounded-2xl border border-tijum-surface bg-tijum-cream/55 p-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <Label
                                        htmlFor="referral_code"
                                        className="flex items-center gap-1.5 font-semibold"
                                    >
                                        <span className="inline-flex size-6 items-center justify-center rounded-lg bg-tijum-peach/35 text-tijum-plum">
                                            <Gift
                                                className="size-3.5"
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <span>Referral Code</span>
                                    </Label>
                                    <span className="font-heading text-[11px] font-semibold text-tijum-plum-muted">
                                        Optional · ₹250 Welcome Points
                                    </span>
                                </div>

                                <div className="relative">
                                    <Input
                                        id="referral_code"
                                        type="text"
                                        name="referral_code"
                                        autoComplete="off"
                                        value={referralCode}
                                        onChange={(e) =>
                                            handleReferralChange(e.target.value)
                                        }
                                        placeholder="e.g. TIJUM-AARAV12"
                                        maxLength={24}
                                        className="pr-10 font-mono text-sm tracking-wider uppercase"
                                        aria-invalid={
                                            validationResult?.valid === false ||
                                            Boolean(errors.referral_code)
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

                                {validationResult?.valid === true && (
                                    <div
                                        id="referral-code-status"
                                        className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-900"
                                    >
                                        <CheckCircle2
                                            className="mt-0.5 size-4 shrink-0 text-tijum-emerald"
                                            aria-hidden="true"
                                        />
                                        <span>{validationResult.message}</span>
                                    </div>
                                )}

                                {validationResult?.valid === false && (
                                    <div
                                        id="referral-code-status"
                                        className="flex items-start gap-2 rounded-xl border border-tijum-coral/40 bg-tijum-coral/10 p-2.5 text-xs text-tijum-plum"
                                    >
                                        <AlertCircle
                                            className="mt-0.5 size-4 shrink-0 text-tijum-coral"
                                            aria-hidden="true"
                                        />
                                        <span>{validationResult.message}</span>
                                    </div>
                                )}

                                <InputError
                                    id="referral-code-error"
                                    message={errors.referral_code}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-start gap-3 rounded-xl border border-tijum-surface bg-tijum-cream/40 p-3.5">
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
                                        className="cursor-pointer font-body text-xs leading-relaxed text-tijum-plum-muted"
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
                            className="w-full"
                            loading={processing}
                            data-test="register-user-button"
                        >
                            <span>Create account</span>
                            <ArrowRight
                                className="size-4"
                                aria-hidden="true"
                            />
                        </Button>

                        <div className="border-t border-tijum-surface/80 pt-5 text-center">
                            <p className="text-sm text-tijum-plum-muted">
                                Already have an account?{' '}
                                <TextLink
                                    href={login()}
                                    className="font-semibold text-tijum-plum"
                                >
                                    Log in
                                </TextLink>
                            </p>
                        </div>
                    </>
                )}
            </Form>
        </>
    );
}

Register.authMeta = {
    title: 'Create your account',
    description:
        'Join TIJUM to explore affordable Hostels/PG, Homestays, and Co-Living stays with clear meal details.',
    maxWidth: 'comfortable' as const,
};

Register.layout = Register.authMeta;
