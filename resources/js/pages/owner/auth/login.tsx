import { Form, Head } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { register } from '@/routes/owner';
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

            {status && (
                <Alert variant="info" className="mb-5">
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
                                <Label htmlFor="email">
                                    Email address or Mobile number
                                </Label>
                                <Input
                                    id="email"
                                    type="text"
                                    name="email"
                                    required
                                    autoFocus
                                    autoComplete="username"
                                    placeholder="partner@property.in or 10-digit mobile"
                                    aria-invalid={Boolean(errors.email)}
                                    aria-describedby={
                                        errors.email ? 'email-error' : undefined
                                    }
                                />
                                <InputError
                                    id="email-error"
                                    message={errors.email}
                                />
                            </div>

                            <div className="grid gap-2">
                                <div className="flex items-center justify-between gap-2">
                                    <Label htmlFor="password">Password</Label>
                                    {canResetPassword && (
                                        <TextLink
                                            href={passwordRequest()}
                                            className="text-xs font-semibold text-tijum-plum-muted no-underline hover:text-tijum-plum hover:underline"
                                        >
                                            Forgot password?
                                        </TextLink>
                                    )}
                                </div>
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    required
                                    autoComplete="current-password"
                                    placeholder="Enter your password"
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

                            <div className="flex items-center gap-2.5 pt-0.5">
                                <Checkbox id="remember" name="remember" />
                                <Label
                                    htmlFor="remember"
                                    className="cursor-pointer font-body font-normal text-tijum-plum-muted"
                                >
                                    Keep me signed in on this device
                                </Label>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            size="lg"
                            className="w-full"
                            loading={processing}
                            data-test="owner-login-button"
                        >
                            <span>Sign in to Partner Portal</span>
                            <ArrowRight
                                className="size-4"
                                aria-hidden="true"
                            />
                        </Button>

                        <div className="border-t border-tijum-surface/80 pt-5 text-center">
                            <p className="text-sm text-tijum-plum-muted">
                                New hostel, PG, or homestay partner?{' '}
                                <TextLink
                                    href={register()}
                                    className="font-semibold text-tijum-plum"
                                >
                                    Create a partner account
                                </TextLink>
                            </p>
                        </div>
                    </>
                )}
            </Form>
        </>
    );
}

OwnerLogin.authMeta = {
    title: 'Partner Sign In',
    description:
        'Access your TIJUM Partner portal to manage your Hostel/PG, Homestay, or Co-Living listings, allocations, and payouts.',
};

OwnerLogin.layout = OwnerLogin.authMeta;
