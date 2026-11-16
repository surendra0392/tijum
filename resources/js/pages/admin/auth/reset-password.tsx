import { Form, Head } from '@inertiajs/react';
import { KeyRound } from 'lucide-react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { update } from '@/routes/admin/password';

type AdminResetPasswordProps = {
    token: string;
    email: string;
};

export default function AdminResetPassword({
    token,
    email,
}: AdminResetPasswordProps) {
    return (
        <>
            <Head title="Set Admin Password" />

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
                                    Administrator email
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
                            variant="plum"
                            className="w-full"
                            loading={processing}
                        >
                            <KeyRound className="size-4" aria-hidden="true" />
                            <span>Update administrator password</span>
                        </Button>
                    </>
                )}
            </Form>
        </>
    );
}

AdminResetPassword.authMeta = {
    title: 'Choose a new admin password',
    description:
        'Reset your TIJUM Administrator password cleanly without affecting customer or partner credentials.',
};

AdminResetPassword.layout = AdminResetPassword.authMeta;
