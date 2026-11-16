import { Form, Head } from '@inertiajs/react';
import { ArrowRight, Shield } from 'lucide-react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { store } from '@/routes/admin/login';
import { request as passwordRequest } from '@/routes/admin/password';

type AdminLoginProps = {
    status?: string;
    canResetPassword: boolean;
};

export default function AdminLogin({
    status,
    canResetPassword,
}: AdminLoginProps) {
    return (
        <>
            <Head title="Admin Sign In" />

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
                                    Administrator email
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    required
                                    autoFocus
                                    autoComplete="email"
                                    placeholder="admin@tijum.in"
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
                                            className="text-xs font-semibold text-tijum-plum-muted no-underline hover:text-tijum-plum hover:underline dark:text-muted-foreground dark:hover:text-foreground"
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
                                    placeholder="Enter administrator password"
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
                                    className="cursor-pointer font-body font-normal text-tijum-plum-muted dark:text-muted-foreground"
                                >
                                    Remember administrator session
                                </Label>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            size="lg"
                            variant="plum"
                            className="w-full"
                            loading={processing}
                            data-test="admin-login-button"
                        >
                            <span>Continue to Admin Verification</span>
                            <ArrowRight
                                className="size-4"
                                aria-hidden="true"
                            />
                        </Button>

                        <div className="flex items-start gap-2.5 rounded-xl border border-tijum-surface/80 bg-tijum-cream/65 p-3.5 text-xs leading-relaxed text-tijum-plum-muted dark:border-border dark:bg-muted/55 dark:text-muted-foreground">
                            <Shield
                                className="mt-0.5 size-4 shrink-0 text-tijum-coral"
                                aria-hidden="true"
                            />
                            <p>
                                Public administrator sign-up is disabled.
                                Accounts are provisioned strictly by authorized
                                platform operators.
                            </p>
                        </div>
                    </>
                )}
            </Form>
        </>
    );
}

AdminLogin.authMeta = {
    title: 'Administrator console sign in',
    description:
        'Sign in with your provisioned administrator account and complete TOTP verification.',
};

AdminLogin.layout = AdminLogin.authMeta;
