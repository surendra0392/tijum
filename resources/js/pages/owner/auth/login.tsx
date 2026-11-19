import { Form, Head, Link } from '@inertiajs/react';
import { ArrowRight, CheckCircle2, Lock, Mail } from 'lucide-react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login, register } from '@/routes/owner';
import { store } from '@/routes/owner/login';
import { request as passwordRequest } from '@/routes/owner/password';

type OwnerLoginProps = {
    status?: string;
    canResetPassword: boolean;
};

export default function OwnerLogin({
    status,
    canResetPassword,
}: OwnerLoginProps) {
    return (
        <>
            <Head title="Partner Sign In" />

            <div
                role="tablist"
                aria-label="Partner portal access"
                className="mb-6 grid grid-cols-2 rounded-xl border border-tijum-surface/80 bg-tijum-cream/65 p-1"
            >
                <Link
                    href={login()}
                    role="tab"
                    aria-selected="true"
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-tijum-plum font-heading text-sm font-semibold text-tijum-cream shadow-xs"
                >
                    Partner sign in
                </Link>
                <Link
                    href={register()}
                    role="tab"
                    aria-selected="false"
                    className="inline-flex h-10 items-center justify-center rounded-lg font-heading text-sm font-medium text-tijum-plum-muted transition-colors hover:text-tijum-plum"
                >
                    List your property
                </Link>
            </div>

            {status && (
                <Alert variant="success" className="mb-5">
                    <CheckCircle2 aria-hidden="true" />
                    <AlertDescription>{status}</AlertDescription>
                </Alert>
            )}

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
                                    Partner email or mobile number
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
                                        placeholder="partner@property.in or 10-digit mobile"
                                        className="bg-tijum-cream/25 pl-10 focus-visible:bg-white"
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
                                            href={passwordRequest()}
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
                                        className="bg-tijum-cream/25 pl-10 focus-visible:bg-white"
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
                            data-test="owner-login-button"
                        >
                            <span>Sign in to Partner Portal</span>
                            <ArrowRight
                                className="size-4"
                                aria-hidden="true"
                            />
                        </Button>

                        <p className="pt-1 text-center text-sm text-tijum-plum-muted">
                            New Hostel/PG, Homestay, or Co-Living partner?{' '}
                            <TextLink
                                href={register()}
                                className="font-semibold text-tijum-plum"
                            >
                                Create a partner account
                            </TextLink>
                        </p>
                    </>
                )}
            </Form>
        </>
    );
}

OwnerLogin.authMeta = {
    title: 'Partner sign in',
    description:
        'Access your listings, room allocations, guest check-ins, and settlement statements.',
};

OwnerLogin.layout = OwnerLogin.authMeta;
