import { Form, Head, setLayoutProps } from '@inertiajs/react';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { ArrowRight, KeyRound, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';
import { OTP_MAX_LENGTH } from '@/hooks/use-two-factor-auth';
import { store } from '@/routes/two-factor/login';

export default function TwoFactorChallenge() {
    const [showRecoveryInput, setShowRecoveryInput] = useState<boolean>(false);
    const [code, setCode] = useState<string>('');

    const authConfigContent = useMemo<{
        title: string;
        description: string;
        toggleText: string;
    }>(() => {
        if (showRecoveryInput) {
            return {
                title: 'Use a recovery code',
                description:
                    'Enter one of your single-use emergency recovery codes to access your account.',
                toggleText: 'Sign in with an authenticator code instead',
            };
        }

        return {
            title: 'Two-factor verification',
            description:
                'Enter the 6-digit code from your authenticator app to finish signing in.',
            toggleText: 'Use an emergency recovery code instead',
        };
    }, [showRecoveryInput]);

    setLayoutProps({
        title: authConfigContent.title,
        description: authConfigContent.description,
    });

    const toggleRecoveryMode = (clearErrors: () => void): void => {
        setShowRecoveryInput((prev) => !prev);
        clearErrors();
        setCode('');
    };

    return (
        <>
            <Head title="Two-factor authentication" />

            <Form
                {...store.form()}
                className="flex flex-col gap-5"
                resetOnError
                resetOnSuccess={!showRecoveryInput}
            >
                {({ errors, processing, clearErrors }) => (
                    <>
                        {showRecoveryInput ? (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 rounded-2xl border border-tijum-surface/85 bg-tijum-cream/55 p-3.5">
                                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-tijum-coral shadow-2xs ring-1 ring-tijum-surface/70">
                                        <KeyRound
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <p className="text-xs leading-relaxed text-tijum-plum-muted">
                                        Enter one of the single-use recovery
                                        codes you saved when enabling two-factor
                                        authentication.
                                    </p>
                                </div>

                                <div className="grid gap-2">
                                    <Label
                                        htmlFor="recovery_code"
                                        className="text-[13px] font-semibold text-tijum-plum"
                                    >
                                        Emergency recovery code
                                    </Label>
                                    <div className="relative">
                                        <KeyRound
                                            className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-4 -translate-y-1/2 text-tijum-plum-muted/80"
                                            aria-hidden="true"
                                        />
                                        <Input
                                            id="recovery_code"
                                            name="recovery_code"
                                            type="text"
                                            placeholder="xxxxxxxxxx-xxxxxxxxxx"
                                            autoFocus={showRecoveryInput}
                                            required
                                            className="bg-white pl-10 font-mono shadow-2xs"
                                            aria-invalid={Boolean(
                                                errors.recovery_code,
                                            )}
                                            aria-describedby={
                                                errors.recovery_code
                                                    ? 'recovery-code-error'
                                                    : undefined
                                            }
                                        />
                                    </div>
                                    <InputError
                                        id="recovery-code-error"
                                        message={errors.recovery_code}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center space-y-4 rounded-2xl border border-tijum-surface/85 bg-tijum-cream/50 px-4 py-6 text-center">
                                <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-white text-tijum-coral shadow-2xs ring-1 ring-tijum-surface/70">
                                    <ShieldCheck
                                        className="size-5"
                                        aria-hidden="true"
                                    />
                                </span>

                                <div className="space-y-1">
                                    <p className="font-heading text-xs font-semibold text-tijum-plum">
                                        6-digit authenticator code
                                    </p>
                                    <p className="text-xs text-tijum-plum-muted">
                                        Refreshes every 30 seconds in your
                                        authenticator app
                                    </p>
                                </div>

                                <div className="flex w-full items-center justify-center pt-1">
                                    <InputOTP
                                        name="code"
                                        maxLength={OTP_MAX_LENGTH}
                                        value={code}
                                        onChange={(value) => setCode(value)}
                                        disabled={processing}
                                        pattern={REGEXP_ONLY_DIGITS}
                                        autoFocus
                                    >
                                        <InputOTPGroup className="gap-2 sm:gap-2.5">
                                            {Array.from(
                                                { length: OTP_MAX_LENGTH },
                                                (_, index) => (
                                                    <InputOTPSlot
                                                        key={index}
                                                        index={index}
                                                        className="h-12 w-10 rounded-xl border border-tijum-surface bg-white text-base font-bold text-tijum-plum shadow-2xs first:rounded-xl last:rounded-xl sm:h-13 sm:w-11 sm:text-lg"
                                                    />
                                                ),
                                            )}
                                        </InputOTPGroup>
                                    </InputOTP>
                                </div>
                                <InputError message={errors.code} />
                            </div>
                        )}

                        <Button
                            type="submit"
                            size="lg"
                            className="h-12 w-full rounded-xl"
                            loading={processing}
                        >
                            <span>Verify &amp; continue</span>
                            <ArrowRight
                                className="size-4"
                                aria-hidden="true"
                            />
                        </Button>

                        <div className="pt-1 text-center">
                            <button
                                type="button"
                                className="cursor-pointer font-heading text-xs font-semibold text-tijum-plum-muted underline decoration-tijum-surface underline-offset-4 transition-colors hover:text-tijum-plum hover:decoration-tijum-coral"
                                onClick={() => toggleRecoveryMode(clearErrors)}
                            >
                                {authConfigContent.toggleText}
                            </button>
                        </div>
                    </>
                )}
            </Form>
        </>
    );
}

TwoFactorChallenge.authMeta = {
    title: 'Two-factor verification',
    description:
        'Enter the 6-digit code from your authenticator app to finish signing in.',
};

TwoFactorChallenge.layout = TwoFactorChallenge.authMeta;
