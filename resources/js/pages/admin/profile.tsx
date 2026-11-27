import { Head, Link, router } from '@inertiajs/react';
import {
    Calendar,
    Check,
    CheckCircle2,
    Clock,
    KeyRound,
    Lock,
    Mail,
    Save,
    Shield,
    ShieldCheck,
    User,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { dashboard } from '@/routes/admin';
import {
    edit as profileEdit,
    update as profileUpdate,
} from '@/routes/admin/profile';
import { update as passwordUpdate } from '@/routes/admin/profile/password';
import { setup as twoFactorSetup } from '@/routes/admin/two-factor';

interface AdminProfileData {
    id: number;
    name: string;
    email: string;
    role: string;
    role_label: string;
    permissions: string[];
    is_active: boolean;
    email_verified_at?: string | null;
    two_factor_enabled: boolean;
    two_factor_confirmed_at?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
}

interface AdminProfilePageProps {
    admin: AdminProfileData;
    status?: string;
    errors?: Record<string, string>;
}

export default function AdminProfile({
    admin,
    status,
    errors = {},
}: AdminProfilePageProps) {
    const [name, setName] = useState(admin.name);
    const [email, setEmail] = useState(admin.email);
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    const [currentPassword, setCurrentPassword] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [isSavingPassword, setIsSavingPassword] = useState(false);

    const handleProfileSubmit = (e: FormEvent) => {
        e.preventDefault();
        setIsSavingProfile(true);

        router.patch(
            profileUpdate.url(),
            { name, email },
            {
                preserveScroll: true,
                onFinish: () => setIsSavingProfile(false),
            },
        );
    };

    const handlePasswordSubmit = (e: FormEvent) => {
        e.preventDefault();
        setIsSavingPassword(true);

        router.put(
            passwordUpdate.url(),
            {
                current_password: currentPassword,
                password,
                password_confirmation: passwordConfirmation,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setCurrentPassword('');
                    setPassword('');
                    setPasswordConfirmation('');
                },
                onFinish: () => setIsSavingPassword(false),
            },
        );
    };

    const isLengthValid = password.length >= 8;
    const isMatching = password.length > 0 && password === passwordConfirmation;

    return (
        <div className="mx-auto max-w-6xl space-y-6 pb-8">
            <Head title="Admin Profile · TIJUM Admin Console" />

            <PageHeader
                eyebrow="Admin Account"
                title="Administrator profile"
                description="Update your staff contact details, sign-in password, and two-factor authentication settings."
                badges={
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="plum">{admin.role_label}</Badge>
                        <StatusBadge
                            status={admin.is_active ? 'active' : 'suspended'}
                            label={
                                admin.is_active ? 'Active Staff' : 'Inactive'
                            }
                        />
                        <StatusBadge
                            status={
                                admin.two_factor_enabled
                                    ? 'verified'
                                    : 'pending'
                            }
                            label={
                                admin.two_factor_enabled
                                    ? 'TOTP Active'
                                    : 'TOTP Setup Required'
                            }
                        />
                    </div>
                }
                actions={
                    <Button asChild variant="outline" size="sm">
                        <Link href={twoFactorSetup.url()}>
                            <ShieldCheck
                                className="size-4 text-status-success-fg"
                                aria-hidden="true"
                            />
                            <span>2FA Security Settings</span>
                        </Link>
                    </Button>
                }
            />

            {status === 'profile-updated' && (
                <Alert variant="success">
                    <CheckCircle2 aria-hidden="true" />
                    <AlertTitle className="text-xs font-semibold">
                        Profile Updated
                    </AlertTitle>
                    <AlertDescription className="text-xs">
                        Your administrator profile details have been saved
                        successfully.
                    </AlertDescription>
                </Alert>
            )}

            {status === 'password-updated' && (
                <Alert variant="success">
                    <CheckCircle2 aria-hidden="true" />
                    <AlertTitle className="text-xs font-semibold">
                        Password Changed
                    </AlertTitle>
                    <AlertDescription className="text-xs">
                        Your account password has been updated. Use the new
                        credentials on your next sign-in.
                    </AlertDescription>
                </Alert>
            )}

            {/* Side-by-Side Primary Forms (matching Partner Portal layout) */}
            <div className="grid gap-6 lg:grid-cols-2">
                <Card className="h-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2.5 text-base sm:text-lg">
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15">
                                <User className="size-4" aria-hidden="true" />
                            </span>
                            <span>Profile Information</span>
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                            Update your display name and official staff email
                            address.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form
                            onSubmit={handleProfileSubmit}
                            className="space-y-4"
                        >
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="admin_name"
                                    className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground"
                                >
                                    Full Name *
                                </Label>
                                <div className="relative">
                                    <User
                                        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-tijum-plum-muted/70 dark:text-muted-foreground"
                                        aria-hidden="true"
                                    />
                                    <Input
                                        id="admin_name"
                                        type="text"
                                        value={name}
                                        onChange={(e) =>
                                            setName(e.target.value)
                                        }
                                        placeholder="e.g. Rahul Sharma"
                                        className="h-10.5 pl-10 text-sm"
                                        required
                                    />
                                </div>
                                <InputError
                                    message={errors.name}
                                    className="text-xs"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="admin_email"
                                    className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground"
                                >
                                    Staff Email Address *
                                </Label>
                                <div className="relative">
                                    <Mail
                                        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-tijum-plum-muted/70 dark:text-muted-foreground"
                                        aria-hidden="true"
                                    />
                                    <Input
                                        id="admin_email"
                                        type="email"
                                        value={email}
                                        onChange={(e) =>
                                            setEmail(e.target.value)
                                        }
                                        placeholder="e.g. rahul.sharma@tijum.com"
                                        className="h-10.5 pl-10 text-sm"
                                        required
                                    />
                                </div>
                                <InputError
                                    message={errors.email}
                                    className="text-xs"
                                />
                            </div>

                            <div className="pt-2">
                                <Button
                                    type="submit"
                                    variant="plum"
                                    size="sm"
                                    loading={isSavingProfile}
                                    disabled={!name.trim() || !email.trim()}
                                >
                                    {!isSavingProfile && (
                                        <Save
                                            className="size-3.5"
                                            aria-hidden="true"
                                        />
                                    )}
                                    <span>
                                        {isSavingProfile
                                            ? 'Saving Changes...'
                                            : 'Save Profile Changes'}
                                    </span>
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <Card className="h-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2.5 text-base sm:text-lg">
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15">
                                <KeyRound
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            </span>
                            <span>Update Password</span>
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                            Use a strong, unique password to protect console
                            access.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form
                            onSubmit={handlePasswordSubmit}
                            className="space-y-4"
                        >
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="current_password"
                                    className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground"
                                >
                                    Current Password *
                                </Label>
                                <PasswordInput
                                    id="current_password"
                                    value={currentPassword}
                                    onChange={(e) =>
                                        setCurrentPassword(e.target.value)
                                    }
                                    placeholder="Enter your current account password"
                                    className="h-10.5 text-sm"
                                    required
                                />
                                <InputError
                                    message={errors.current_password}
                                    className="text-xs"
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label
                                        htmlFor="new_password"
                                        className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground"
                                    >
                                        New Password *
                                    </Label>
                                    <PasswordInput
                                        id="new_password"
                                        value={password}
                                        onChange={(e) =>
                                            setPassword(e.target.value)
                                        }
                                        placeholder="Min 8 characters"
                                        className="h-10.5 text-sm"
                                        required
                                    />
                                    <InputError
                                        message={errors.password}
                                        className="text-xs"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label
                                        htmlFor="password_confirmation"
                                        className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground"
                                    >
                                        Confirm New Password *
                                    </Label>
                                    <PasswordInput
                                        id="password_confirmation"
                                        value={passwordConfirmation}
                                        onChange={(e) =>
                                            setPasswordConfirmation(
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Re-enter new password"
                                        className="h-10.5 text-sm"
                                        required
                                    />
                                </div>
                            </div>

                            {password.length > 0 && (
                                <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 px-3.5 py-2.5 text-xs dark:border-border dark:bg-muted/45">
                                    <span
                                        className={`inline-flex items-center gap-1.5 ${
                                            isLengthValid
                                                ? 'font-medium text-status-success-fg'
                                                : 'text-tijum-plum-muted dark:text-muted-foreground'
                                        }`}
                                    >
                                        {isLengthValid ? (
                                            <CheckCircle2 className="size-3.5 shrink-0" />
                                        ) : (
                                            <Clock className="size-3.5 shrink-0" />
                                        )}
                                        At least 8 characters
                                    </span>
                                    <span
                                        className={`inline-flex items-center gap-1.5 ${
                                            isMatching
                                                ? 'font-medium text-status-success-fg'
                                                : 'text-tijum-plum-muted dark:text-muted-foreground'
                                        }`}
                                    >
                                        {isMatching ? (
                                            <CheckCircle2 className="size-3.5 shrink-0" />
                                        ) : (
                                            <Clock className="size-3.5 shrink-0" />
                                        )}
                                        Passwords match
                                    </span>
                                </div>
                            )}

                            <div className="pt-2">
                                <Button
                                    type="submit"
                                    variant="plum"
                                    size="sm"
                                    loading={isSavingPassword}
                                    disabled={
                                        !currentPassword ||
                                        !password ||
                                        password.length < 8 ||
                                        password !== passwordConfirmation
                                    }
                                >
                                    {!isSavingPassword && (
                                        <Lock
                                            className="size-3.5"
                                            aria-hidden="true"
                                        />
                                    )}
                                    <span>
                                        {isSavingPassword
                                            ? 'Updating Password...'
                                            : 'Update Password'}
                                    </span>
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>

            {/* Compact Account Metadata & Assigned Privileges */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Shield
                                    className="size-4 text-tijum-coral"
                                    aria-hidden="true"
                                />
                                <span>
                                    Assigned Role &amp; Capabilities (
                                    {admin.permissions.length})
                                </span>
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Role assignments are managed by Super
                                Administrators under System &rarr; Admin
                                Accounts.
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-tijum-plum-muted dark:text-muted-foreground">
                            <span className="tabular-nums">
                                Staff ID #{admin.id}
                            </span>
                            {admin.created_at && (
                                <span className="inline-flex items-center gap-1 tabular-nums">
                                    <Calendar
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                    Joined{' '}
                                    {new Date(
                                        admin.created_at,
                                    ).toLocaleDateString()}
                                </span>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                        {admin.permissions.map((perm) => (
                            <span
                                key={perm}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-tijum-surface/80 bg-tijum-cream/40 px-2.5 py-1 font-mono text-[11px] text-tijum-plum dark:border-border dark:bg-muted/45 dark:text-foreground"
                            >
                                <Check
                                    className="size-3 shrink-0 text-status-success-fg"
                                    aria-hidden="true"
                                />
                                {perm === '*'
                                    ? 'Full Platform Access (*)'
                                    : perm}
                            </span>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

AdminProfile.layout = {
    breadcrumbs: [
        { title: 'Admin Console', href: dashboard() },
        { title: 'Profile', href: profileEdit() },
    ],
};
