import { Form, Head, setLayoutProps } from '@inertiajs/react';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { KeyRound, ShieldCheck } from 'lucide-react';
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
                title: 'Recovery code',
                description:
                    'Please confirm access to your account by entering one of your emergency recovery codes.',
                toggleText: 'Sign in with an authenticator code',
            };
        }

        return {
            title: 'Two-factor verification',
            description:
                'Enter the 6-digit authentication code from your authenticator application.',
            toggleText: 'Use an emergency recovery code',
        };
    }, [showRecoveryInput]);

    setLayoutProps({
        title: authConfigContent.title,
        description: authConfigContent.description,
    });

    const toggleRecoveryMode = (clearErrors: () => void): void => {
        setShowRecoveryInput(!showRecoveryInput);
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
                                <div className="flex items-start gap-3 rounded-xl border border-tijum-surface bg-tijum-cream/55 p-3.5 text-xs leading-relaxed text-tijum-plum-muted">
                                    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-tijum-peach/30 text-tijum-plum">
                                        <KeyRound
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <p>
                                        Enter one of the single-use emergency
                                        recovery codes saved during setup.
                                    </p>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="recovery_code">
                                        Emergency recovery code
                                    </Label>
                                    <Input
                                        id="recovery_code"
                                        name="recovery_code"
                                        type="text"
                                        placeholder="xxxxxxxxxx-xxxxxxxxxx"
                                        autoFocus={showRecoveryInput}
                                        required
                                        className="font-mono"
                                        aria-invalid={Boolean(
                                            errors.recovery_code,
                                        )}
                                        aria-describedby={
                                            errors.recovery_code
                                                ? 'recovery-code-error'
                                                : undefined
                                        }
                                    />
                                    <InputError
                                        id="recovery-code-error"
                                        message={errors.recovery_code}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center space-y-4 rounded-2xl border border-tijum-surface bg-tijum-cream/50 px-4 py-6 text-center">
                                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-tijum-peach/35 text-tijum-plum">
                                    <ShieldCheck
                                        className="size-5"
                                        aria-hidden="true"
                                    />
                                </span>
                                <div className="flex w-full items-center justify-center">
                                    <InputOTP
                                        name="code"
                                        maxLength={OTP_MAX_LENGTH}
                                        value={code}
                                        onChange={(value) => setCode(value)}
                                        disabled={processing}
                                        pattern={REGEXP_ONLY_DIGITS}
                                        autoFocus
                                    >
                                        <InputOTPGroup>
                                            {Array.from(
                                                { length: OTP_MAX_LENGTH },
                                                (_, index) => (
                                                    <InputOTPSlot
                                                        key={index}
                                                        index={index}
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
                            className="w-full"
                            loading={processing}
                        >
                            Continue
                        </Button>

                        <div className="border-t border-tijum-surface/80 pt-5 text-center text-sm text-tijum-plum-muted">
                            <button
                                type="button"
                                className="cursor-pointer font-heading text-xs font-semibold text-tijum-plum underline decoration-tijum-coral/60 underline-offset-4 transition-colors hover:text-tijum-coral"
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
    title: 'Two-factor confirmation',
    description:
        'Please confirm access to your account by entering the authentication code provided by your authenticator application.',
};

TwoFactorChallenge.layout = TwoFactorChallenge.authMeta;
