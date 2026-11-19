import { Form, Head, Link } from '@inertiajs/react';
import { ArrowRight, CheckCircle2, Lock, Mail } from 'lucide-react';
import InputError from '@/components/input-error';
import PasskeyVerify from '@/components/passkey-verify';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login, register } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
};

export default function Login({ status, canResetPassword }: Props) {
    return (
        <>
            <Head title="Log in" />

            <div
                role="tablist"
                aria-label="Account access"
                className="mb-6 grid grid-cols-2 rounded-xl border border-tijum-surface/80 bg-tijum-cream/85 p-1"
            >
                <Link
                    href={login()}
                    role="tab"
                    aria-selected="true"
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-white font-heading text-sm font-semibold text-tijum-plum shadow-2xs"
                >
                    Log in
                </Link>
                <Link
                    href={register()}
                    role="tab"
                    aria-selected="false"
                    className="inline-flex h-10 items-center justify-center rounded-lg font-heading text-sm font-medium text-tijum-plum-muted transition-colors hover:text-tijum-plum"
                >
                    Create account
                </Link>
            </div>

            {status && (
                <Alert variant="success" className="mb-5">
                    <CheckCircle2 aria-hidden="true" />
                    <AlertDescription>{status}</AlertDescription>
                </Alert>
            )}

            <PasskeyVerify />

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label
                                    htmlFor="email"
                                    className="text-[13px] font-semibold text-tijum-plum"
                                >
                                    Email or mobile number
                                </Label>
                                <div className="relative">
                                    <Mail
                                        className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-4 -translate-y-1/2 text-tijum-plum-muted/80"
                                        aria-hidden="true"
                                    />
                                    <Input
                                        id="email"
                                        type="text"
                                        name="email"
                                        required
                                        autoFocus
                                        autoComplete="username"
                                        placeholder="you@example.com or 10-digit mobile"
                                        className="bg-white pl-10 shadow-2xs"
                                        aria-invalid={Boolean(errors.email)}
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
                                <div className="flex items-center justify-between gap-2">
                                    <Label
                                        htmlFor="password"
                                        className="text-[13px] font-semibold text-tijum-plum"
                                    >
                                        Password
                                    </Label>
                                    {canResetPassword && (
                                        <TextLink
                                            href={request()}
                                            className="text-xs font-semibold text-tijum-coral no-underline hover:text-tijum-plum hover:underline"
                                        >
                                            Forgot password?
                                        </TextLink>
                                    )}
                                </div>
                                <div className="relative">
                                    <Lock
                                        className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-4 -translate-y-1/2 text-tijum-plum-muted/80"
                                        aria-hidden="true"
                                    />
                                    <PasswordInput
                                        id="password"
                                        name="password"
                                        required
                                        autoComplete="current-password"
                                        placeholder="Enter your password"
                                        className="bg-white pl-10 shadow-2xs"
                                        aria-invalid={Boolean(errors.password)}
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

                            <div className="flex items-center gap-2.5 pt-0.5">
                                <Checkbox id="remember" name="remember" />
                                <Label
                                    htmlFor="remember"
                                    className="cursor-pointer font-body text-sm font-normal text-tijum-plum-muted"
                                >
                                    Keep me signed in on this device
                                </Label>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            size="lg"
                            className="h-12 w-full rounded-xl"
                            loading={processing}
                            data-test="login-button"
                        >
                            <span>Log in</span>
                            <ArrowRight
                                className="size-4"
                                aria-hidden="true"
                            />
                        </Button>

                        <p className="pt-1 text-center text-sm text-tijum-plum-muted">
                            New to TIJUM?{' '}
                            <TextLink
                                href={register()}
                                className="font-semibold text-tijum-plum"
                            >
                                Create an account
                            </TextLink>
                        </p>
                    </>
                )}
            </Form>
        </>
    );
}

Login.authMeta = {
    title: 'Welcome back',
    description:
        'Sign in to manage your bookings, saved stays, and meal preferences.',
};

Login.layout = Login.authMeta;
