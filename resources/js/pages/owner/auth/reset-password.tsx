import { Form, Head } from '@inertiajs/react';
import { ShieldCheck } from 'lucide-react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login } from '@/routes/owner';
import { update } from '@/routes/owner/password';

type OwnerResetPasswordProps = {
    token: string;
    email: string;
};

export default function OwnerResetPassword({
    token,
    email,
}: OwnerResetPasswordProps) {
    return (
        <>
            <Head title="Set Partner Password" />

            <Form
                {...update.form()}
                resetOnSuccess={['password', 'password_confirmation']}
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        <input type="hidden" name="token" value={token} />

                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="email">
                                    Partner email address
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    defaultValue={email}
                                    required
                                    autoComplete="email"
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
                                <Label htmlFor="password">New password</Label>
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    required
                                    autoFocus
                                    autoComplete="new-password"
                                    placeholder="Choose a strong password"
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
                                    Confirm new password
                                </Label>
                                <PasswordInput
                                    id="password_confirmation"
                                    name="password_confirmation"
                                    required
                                    autoComplete="new-password"
                                    placeholder="Re-enter your new password"
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

                        <Button
                            type="submit"
                            size="lg"
                            className="w-full"
                            loading={processing}
                        >
                            <ShieldCheck
                                className="size-4"
                                aria-hidden="true"
                            />
                            <span>Update partner password</span>
                        </Button>

                        <div className="border-t border-tijum-surface/80 pt-5 text-center">
                            <TextLink
                                href={login()}
                                className="text-sm font-semibold text-tijum-plum"
                            >
                                Return to partner sign in
                            </TextLink>
                        </div>
                    </>
                )}
            </Form>
        </>
    );
}

OwnerResetPassword.authMeta = {
    title: 'Choose a new partner password',
    description:
        'Create a fresh password to regain access to your TIJUM Partner Portal.',
};

OwnerResetPassword.layout = OwnerResetPassword.authMeta;
