import { Form, Head } from '@inertiajs/react';
import { KeyRound, Lock, ShieldCheck } from 'lucide-react';
import { useRef } from 'react';
import SecurityController from '@/actions/App/Http/Controllers/Settings/SecurityController';
import type { Props as ManagePasskeysProps } from '@/components/manage-passkeys';
import ManagePasskeys from '@/components/manage-passkeys';
import type { Props as ManageTwoFactorProps } from '@/components/manage-two-factor';
import ManageTwoFactor from '@/components/manage-two-factor';
import PasswordInput from '@/components/password-input';
import { FormField } from '@/components/shared/form-field';
import { StatCard } from '@/components/shared/info-card';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { edit } from '@/routes/security';

// oxfmt-ignore
type Props = {
    passwordRules: string;
    passwordConfigured?: boolean;
    twoFactorConfirmed?: boolean;
} & ManagePasskeysProps &
    ManageTwoFactorProps;

export default function Security(props: Props) {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    const passwordConfigured = props.passwordConfigured ?? true;
    const passkeyCount = props.passkeys?.length ?? 0;
    const twoFactorEnabled = props.twoFactorEnabled ?? false;
    const twoFactorConfirmed = props.twoFactorConfirmed ?? twoFactorEnabled;

    return (
        <>
            <Head title="Security settings" />

            <div className="space-y-6">
                <PageHeader
                    title="Account Security"
                    description="Manage your customer password, two-factor authentication, and passwordless passkeys."
                />

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <StatCard
                        label="Password"
                        value={passwordConfigured ? 'Configured' : 'Not set'}
                        helperText="Hashed credential protection"
                        icon={Lock}
                        badge={
                            <StatusBadge
                                status={
                                    passwordConfigured ? 'verified' : 'pending'
                                }
                            />
                        }
                    />

                    <StatCard
                        label="Two-factor (2FA)"
                        value={
                            !props.canManageTwoFactor
                                ? 'Disabled'
                                : twoFactorEnabled
                                  ? twoFactorConfirmed
                                      ? 'Enabled'
                                      : 'Pending'
                                  : 'Off'
                        }
                        helperText="Authenticator TOTP protection"
                        icon={ShieldCheck}
                        badge={
                            <StatusBadge
                                status={
                                    props.canManageTwoFactor && twoFactorEnabled
                                        ? twoFactorConfirmed
                                            ? 'verified'
                                            : 'pending'
                                        : 'neutral'
                                }
                                label={
                                    props.canManageTwoFactor && twoFactorEnabled
                                        ? twoFactorConfirmed
                                            ? 'Protected'
                                            : 'Confirm Setup'
                                        : 'Optional'
                                }
                            />
                        }
                    />

                    <StatCard
                        label="Passkeys"
                        value={
                            props.canManagePasskeys
                                ? `${passkeyCount} registered`
                                : 'Disabled'
                        }
                        helperText="WebAuthn biometric sign-in"
                        icon={KeyRound}
                        badge={
                            <StatusBadge
                                status={passkeyCount > 0 ? 'active' : 'neutral'}
                                label={passkeyCount > 0 ? 'Active' : 'None'}
                            />
                        }
                    />
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Update password</CardTitle>
                        <CardDescription>
                            Ensure your customer account uses a strong, unique
                            password.
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <Form
                            {...SecurityController.update.form()}
                            options={{
                                preserveScroll: true,
                            }}
                            resetOnError={[
                                'password',
                                'password_confirmation',
                                'current_password',
                            ]}
                            resetOnSuccess
                            onError={(errors) => {
                                if (errors.password) {
                                    passwordInput.current?.focus();
                                }

                                if (errors.current_password) {
                                    currentPasswordInput.current?.focus();
                                }
                            }}
                            className="max-w-xl space-y-5"
                        >
                            {({ errors, processing, recentlySuccessful }) => (
                                <>
                                    <FormField
                                        id="current_password"
                                        label="Current password"
                                        required
                                        error={errors.current_password}
                                    >
                                        {(a11y) => (
                                            <PasswordInput
                                                {...a11y}
                                                ref={currentPasswordInput}
                                                name="current_password"
                                                autoComplete="current-password"
                                                placeholder="Enter current password"
                                                required
                                            />
                                        )}
                                    </FormField>

                                    <FormField
                                        id="password"
                                        label="New password"
                                        required
                                        error={errors.password}
                                    >
                                        {(a11y) => (
                                            <PasswordInput
                                                {...a11y}
                                                ref={passwordInput}
                                                name="password"
                                                autoComplete="new-password"
                                                placeholder="Enter new password"
                                                passwordrules={
                                                    props.passwordRules
                                                }
                                                required
                                            />
                                        )}
                                    </FormField>

                                    <FormField
                                        id="password_confirmation"
                                        label="Confirm new password"
                                        required
                                        error={errors.password_confirmation}
                                    >
                                        {(a11y) => (
                                            <PasswordInput
                                                {...a11y}
                                                name="password_confirmation"
                                                autoComplete="new-password"
                                                placeholder="Re-enter new password"
                                                passwordrules={
                                                    props.passwordRules
                                                }
                                                required
                                            />
                                        )}
                                    </FormField>

                                    <div className="flex items-center gap-3 pt-1">
                                        <Button
                                            type="submit"
                                            loading={processing}
                                            data-test="update-password-button"
                                        >
                                            Update Password
                                        </Button>
                                        {recentlySuccessful && (
                                            <p
                                                role="status"
                                                className="text-sm font-medium text-emerald-700 dark:text-emerald-400"
                                            >
                                                Password updated.
                                            </p>
                                        )}
                                    </div>
                                </>
                            )}
                        </Form>
                    </CardContent>
                </Card>

                {props.canManageTwoFactor && (
                    <Card>
                        <CardContent className="pt-2">
                            <ManageTwoFactor
                                canManageTwoFactor={props.canManageTwoFactor}
                                requiresConfirmation={
                                    props.requiresConfirmation
                                }
                                twoFactorEnabled={props.twoFactorEnabled}
                            />
                        </CardContent>
                    </Card>
                )}

                {props.canManagePasskeys && (
                    <Card>
                        <CardContent className="pt-2">
                            <ManagePasskeys
                                canManagePasskeys={props.canManagePasskeys}
                                passkeys={props.passkeys}
                            />
                        </CardContent>
                    </Card>
                )}
            </div>
        </>
    );
}

Security.layout = {
    breadcrumbs: [
        {
            title: 'Account Security',
            href: edit(),
        },
    ],
};
