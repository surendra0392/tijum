import { Head, router, useForm } from '@inertiajs/react';
import {
    KeyRound,
    Lock,
    Pencil,
    Plus,
    Search,
    ShieldAlert,
    ShieldCheck,
    UserCheck,
    Users,
    X,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import InputError from '@/components/input-error';
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import {
    DataTable,
    type DataTableColumn,
} from '@/components/shared/data-table';
import { StatCard } from '@/components/shared/info-card';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { StatusBadge } from '@/components/shared/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { dashboard } from '@/routes/admin';
import {
    index as adminsIndex,
    reset2fa,
    store as adminsStore,
    toggleStatus,
    update as adminsUpdate,
} from '@/routes/admin/system/admins';

interface AdminAccount {
    id: number;
    name: string;
    email: string;
    role: string;
    role_label: string;
    is_active: boolean;
    two_factor_enabled: boolean;
    is_current: boolean;
    created_at: string;
}

interface RoleOption {
    value: string;
    label: string;
}

interface PaginatedAdmins {
    data: AdminAccount[];
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
}

interface Props {
    admins: PaginatedAdmins;
    filters: {
        search: string;
        role: string;
        status: string;
    };
    roles: RoleOption[];
}

export default function AdminAccountsIndex({ admins, filters, roles }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [roleFilter, setRoleFilter] = useState(filters.role || 'all');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');

    // Create Modal
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const createForm = useForm({
        name: '',
        email: '',
        role: 'property_verification',
        password: '',
        password_confirmation: '',
    });

    // Edit Modal
    const [editingAdmin, setEditingAdmin] = useState<AdminAccount | null>(null);
    const editForm = useForm({
        name: '',
        email: '',
        role: 'property_verification',
        is_active: true,
        password: '',
        password_confirmation: '',
    });

    // Reset 2FA Confirmation
    const [reset2faAdmin, setReset2faAdmin] = useState<AdminAccount | null>(
        null,
    );
    const [isResetting2fa, setIsResetting2fa] = useState(false);

    const activeCountOnPage = admins.data.filter((a) => a.is_active).length;
    const twoFactorCountOnPage = admins.data.filter(
        (a) => a.two_factor_enabled,
    ).length;

    const handleFilter = (e?: FormEvent) => {
        e?.preventDefault();
        router.get(
            adminsIndex.url(),
            {
                search: search || undefined,
                role: roleFilter !== 'all' ? roleFilter : undefined,
                status: statusFilter !== 'all' ? statusFilter : undefined,
            },
            { preserveState: true, replace: true },
        );
    };

    const handleClearFilters = () => {
        setSearch('');
        setRoleFilter('all');
        setStatusFilter('all');
        router.get(
            adminsIndex.url(),
            {},
            { preserveState: true, replace: true },
        );
    };

    const openCreateDialog = () => {
        createForm.reset();
        createForm.clearErrors();
        setIsCreateOpen(true);
    };

    const handleCreateSubmit = (e: FormEvent) => {
        e.preventDefault();
        createForm.post(adminsStore.url(), {
            onSuccess: () => {
                setIsCreateOpen(false);
                createForm.reset();
            },
        });
    };

    const openEditDialog = (admin: AdminAccount) => {
        setEditingAdmin(admin);
        editForm.setData({
            name: admin.name,
            email: admin.email,
            role: admin.role,
            is_active: admin.is_active,
            password: '',
            password_confirmation: '',
        });
        editForm.clearErrors();
    };

    const handleEditSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!editingAdmin) return;

        editForm.put(adminsUpdate.url(editingAdmin.id), {
            onSuccess: () => {
                setEditingAdmin(null);
                editForm.reset();
            },
        });
    };

    const handleToggleStatus = (admin: AdminAccount) => {
        if (admin.is_current) return;
        router.post(toggleStatus.url(admin.id), {}, { preserveScroll: true });
    };

    const handleConfirmReset2fa = () => {
        if (!reset2faAdmin) return;
        setIsResetting2fa(true);
        router.post(
            reset2fa.url(reset2faAdmin.id),
            {},
            {
                preserveScroll: true,
                onFinish: () => {
                    setIsResetting2fa(false);
                    setReset2faAdmin(null);
                },
            },
        );
    };

    const columns: DataTableColumn<AdminAccount>[] = [
        {
            key: 'name',
            header: 'Administrator',
            isRowHeader: true,
            render: (admin) => (
                <div className="flex flex-col gap-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                            {admin.name}
                        </span>
                        {admin.is_current && (
                            <Badge variant="peach" className="text-[10px]">
                                You
                            </Badge>
                        )}
                    </div>
                    <span className="font-mono text-xs font-normal text-tijum-plum-muted dark:text-muted-foreground">
                        {admin.email}
                    </span>
                </div>
            ),
        },
        {
            key: 'role',
            header: 'Role',
            render: (admin) => {
                const isSuper = admin.role === 'super_admin';
                return (
                    <Badge
                        variant={isSuper ? 'outline' : 'default'}
                        className={
                            isSuper
                                ? 'border-status-warning-border bg-status-warning-bg text-status-warning-fg'
                                : undefined
                        }
                    >
                        {admin.role_label}
                    </Badge>
                );
            },
        },
        {
            key: 'two_factor',
            header: '2FA Security',
            render: (admin) => (
                <StatusBadge
                    status={admin.two_factor_enabled ? 'verified' : 'pending'}
                    label={
                        admin.two_factor_enabled ? 'Configured' : 'Not Setup'
                    }
                />
            ),
        },
        {
            key: 'status',
            header: 'Status',
            render: (admin) => (
                <div className="flex items-center gap-2.5">
                    <Switch
                        checked={admin.is_active}
                        disabled={admin.is_current}
                        onCheckedChange={() => handleToggleStatus(admin)}
                        aria-label={`Toggle active status for ${admin.name}`}
                    />
                    <span
                        className={`text-xs font-semibold ${
                            admin.is_active
                                ? 'text-status-success-fg'
                                : 'text-tijum-plum-muted dark:text-muted-foreground'
                        }`}
                    >
                        {admin.is_active ? 'Active' : 'Disabled'}
                    </span>
                </div>
            ),
        },
        {
            key: 'created_at',
            header: 'Created On',
            render: (admin) => (
                <span className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                    {admin.created_at}
                </span>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (admin) => (
                <div className="flex items-center justify-end gap-2">
                    {admin.two_factor_enabled && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 border-status-warning-border text-xs text-status-warning-fg hover:bg-status-warning-bg/70"
                            onClick={() => setReset2faAdmin(admin)}
                            title="Reset Two-Factor Authentication"
                        >
                            <KeyRound className="size-3.5" aria-hidden="true" />
                            <span className="hidden sm:inline">Reset 2FA</span>
                        </Button>
                    )}
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                        onClick={() => openEditDialog(admin)}
                    >
                        <Pencil className="size-3.5" aria-hidden="true" />
                        <span>Edit</span>
                    </Button>
                </div>
            ),
        },
    ];

    const hasActiveFilters =
        Boolean(search) || roleFilter !== 'all' || statusFilter !== 'all';

    return (
        <>
            <Head title="Admin Accounts — System Management — TIJUM" />

            <div className="space-y-6 pb-12">
                <PageHeader
                    eyebrow="System Management"
                    title="Admin Accounts"
                    description="Manage staff profiles, assign operational roles, enforce 2FA, and control platform access."
                    actions={
                        <Button
                            type="button"
                            variant="plum"
                            size="sm"
                            onClick={openCreateDialog}
                        >
                            <Plus className="size-4" aria-hidden="true" />
                            <span>Add Administrator</span>
                        </Button>
                    }
                />

                {/* Summary KPIs */}
                <section
                    aria-label="Administrator directory summary"
                    className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
                >
                    <StatCard
                        label="Total Administrators"
                        value={admins.total}
                        helperText="Across all access tiers"
                        icon={Users}
                    />
                    <StatCard
                        label="Active (This Page)"
                        value={`${activeCountOnPage} / ${admins.data.length}`}
                        helperText="Enabled accounts in view"
                        icon={UserCheck}
                    />
                    <StatCard
                        label="2FA Configured (Page)"
                        value={`${twoFactorCountOnPage} / ${admins.data.length}`}
                        helperText="TOTP verified in view"
                        icon={ShieldCheck}
                    />
                    <StatCard
                        label="Access Roles"
                        value={roles.length}
                        helperText="Operational staff tiers"
                        icon={Lock}
                    />
                </section>

                {/* Filters */}
                <Card className="py-4">
                    <CardContent className="px-5">
                        <form
                            onSubmit={handleFilter}
                            className="flex flex-wrap items-center gap-3"
                        >
                            <div className="relative min-w-[220px] flex-1">
                                <Search
                                    className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-tijum-plum-muted dark:text-muted-foreground"
                                    aria-hidden="true"
                                />
                                <Input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search by name or email..."
                                    className="h-10 pl-10 text-sm"
                                />
                            </div>

                            <div className="w-full sm:w-[190px]">
                                <Select
                                    value={roleFilter}
                                    onValueChange={setRoleFilter}
                                >
                                    <SelectTrigger size="sm" className="w-full">
                                        <SelectValue placeholder="All Roles" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All Roles
                                        </SelectItem>
                                        {roles.map((r) => (
                                            <SelectItem
                                                key={r.value}
                                                value={r.value}
                                            >
                                                {r.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="w-full sm:w-[150px]">
                                <Select
                                    value={statusFilter}
                                    onValueChange={setStatusFilter}
                                >
                                    <SelectTrigger size="sm" className="w-full">
                                        <SelectValue placeholder="All Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All Status
                                        </SelectItem>
                                        <SelectItem value="active">
                                            Active
                                        </SelectItem>
                                        <SelectItem value="inactive">
                                            Disabled
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button type="submit" variant="plum" size="sm">
                                    Filter
                                </Button>
                                {hasActiveFilters && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleClearFilters}
                                    >
                                        <X
                                            className="size-3.5"
                                            aria-hidden="true"
                                        />
                                        <span>Clear</span>
                                    </Button>
                                )}
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Table */}
                <DataTable
                    caption="Administrators List"
                    title="Administrator Directory"
                    description="Platform staff accounts, assigned access roles, and 2FA enforcement status."
                    headerActions={
                        <Badge variant="outline" className="tabular-nums">
                            {admins.total} total
                        </Badge>
                    }
                    columns={columns}
                    rows={admins.data}
                    getRowKey={(admin) => admin.id}
                    emptyTitle="No administrator accounts found"
                    emptyDescription="Adjust your search filters or add a new administrator."
                    footer={
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                Showing {admins.data.length} of {admins.total}{' '}
                                administrator(s)
                            </p>

                            <Pagination
                                currentPage={admins.current_page}
                                totalPages={admins.last_page}
                                getPageHref={(p) =>
                                    adminsIndex.url({
                                        query: {
                                            page: p,
                                            search: search || undefined,
                                            role:
                                                roleFilter !== 'all'
                                                    ? roleFilter
                                                    : undefined,
                                            status:
                                                statusFilter !== 'all'
                                                    ? statusFilter
                                                    : undefined,
                                        },
                                    })
                                }
                            />
                        </div>
                    }
                />
            </div>

            {/* Create Admin Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add New Administrator</DialogTitle>
                        <DialogDescription>
                            Create a new staff account and assign their
                            operational responsibilities.
                        </DialogDescription>
                    </DialogHeader>

                    <form
                        onSubmit={handleCreateSubmit}
                        className="space-y-4 py-1"
                    >
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="create-name"
                                className="text-tijum-plum dark:text-foreground"
                            >
                                Full Name
                            </Label>
                            <Input
                                id="create-name"
                                required
                                value={createForm.data.name}
                                onChange={(e) =>
                                    createForm.setData('name', e.target.value)
                                }
                                placeholder="e.g. Priya Sharma"
                                className="h-10.5"
                            />
                            <InputError
                                message={createForm.errors.name}
                                className="text-xs"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label
                                htmlFor="create-email"
                                className="text-tijum-plum dark:text-foreground"
                            >
                                Corporate Email
                            </Label>
                            <Input
                                id="create-email"
                                type="email"
                                required
                                value={createForm.data.email}
                                onChange={(e) =>
                                    createForm.setData('email', e.target.value)
                                }
                                placeholder="name@tijum.com"
                                className="h-10.5"
                            />
                            <InputError
                                message={createForm.errors.email}
                                className="text-xs"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label
                                htmlFor="create-role"
                                className="text-tijum-plum dark:text-foreground"
                            >
                                Access Role
                            </Label>
                            <Select
                                value={createForm.data.role}
                                onValueChange={(val) =>
                                    createForm.setData('role', val)
                                }
                            >
                                <SelectTrigger
                                    id="create-role"
                                    size="sm"
                                    className="h-10.5 w-full"
                                >
                                    <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                                <SelectContent>
                                    {roles.map((r) => (
                                        <SelectItem
                                            key={r.value}
                                            value={r.value}
                                        >
                                            {r.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError
                                message={createForm.errors.role}
                                className="text-xs"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label
                                htmlFor="create-password"
                                className="text-tijum-plum dark:text-foreground"
                            >
                                Initial Password
                            </Label>
                            <Input
                                id="create-password"
                                type="password"
                                required
                                value={createForm.data.password}
                                onChange={(e) =>
                                    createForm.setData(
                                        'password',
                                        e.target.value,
                                    )
                                }
                                placeholder="Minimum 8 characters"
                                className="h-10.5"
                            />
                            <InputError
                                message={createForm.errors.password}
                                className="text-xs"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label
                                htmlFor="create-password-confirmation"
                                className="text-tijum-plum dark:text-foreground"
                            >
                                Confirm Password
                            </Label>
                            <Input
                                id="create-password-confirmation"
                                type="password"
                                required
                                value={createForm.data.password_confirmation}
                                onChange={(e) =>
                                    createForm.setData(
                                        'password_confirmation',
                                        e.target.value,
                                    )
                                }
                                placeholder="Re-enter password"
                                className="h-10.5"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsCreateOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="plum"
                                loading={createForm.processing}
                            >
                                {createForm.processing
                                    ? 'Creating...'
                                    : 'Create Account'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Admin Dialog */}
            <Dialog
                open={Boolean(editingAdmin)}
                onOpenChange={(open) => !open && setEditingAdmin(null)}
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Administrator</DialogTitle>
                        <DialogDescription>
                            Update staff details, modify operational
                            permissions, or set a new password.
                        </DialogDescription>
                    </DialogHeader>

                    <form
                        onSubmit={handleEditSubmit}
                        className="space-y-4 py-1"
                    >
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="edit-name"
                                className="text-tijum-plum dark:text-foreground"
                            >
                                Full Name
                            </Label>
                            <Input
                                id="edit-name"
                                required
                                value={editForm.data.name}
                                onChange={(e) =>
                                    editForm.setData('name', e.target.value)
                                }
                                className="h-10.5"
                            />
                            <InputError
                                message={editForm.errors.name}
                                className="text-xs"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label
                                htmlFor="edit-email"
                                className="text-tijum-plum dark:text-foreground"
                            >
                                Email
                            </Label>
                            <Input
                                id="edit-email"
                                type="email"
                                required
                                value={editForm.data.email}
                                onChange={(e) =>
                                    editForm.setData('email', e.target.value)
                                }
                                className="h-10.5"
                            />
                            <InputError
                                message={editForm.errors.email}
                                className="text-xs"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label
                                htmlFor="edit-role"
                                className="text-tijum-plum dark:text-foreground"
                            >
                                Access Role
                            </Label>
                            <Select
                                value={editForm.data.role}
                                onValueChange={(val) =>
                                    editForm.setData('role', val)
                                }
                                disabled={editingAdmin?.is_current}
                            >
                                <SelectTrigger
                                    id="edit-role"
                                    size="sm"
                                    className="h-10.5 w-full"
                                >
                                    <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                                <SelectContent>
                                    {roles.map((r) => (
                                        <SelectItem
                                            key={r.value}
                                            value={r.value}
                                        >
                                            {r.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {editingAdmin?.is_current && (
                                <p className="flex items-center gap-1 text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                    <ShieldAlert
                                        className="size-3.5 shrink-0"
                                        aria-hidden="true"
                                    />
                                    <span>
                                        You cannot change your own role.
                                    </span>
                                </p>
                            )}
                            <InputError
                                message={editForm.errors.role}
                                className="text-xs"
                            />
                        </div>

                        <div className="flex items-center justify-between gap-3 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 dark:border-border dark:bg-muted/45">
                            <div className="space-y-0.5">
                                <Label
                                    htmlFor="edit-status"
                                    className="text-sm font-medium text-tijum-plum dark:text-foreground"
                                >
                                    Account Status
                                </Label>
                                <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                    Allow this administrator to log in to the
                                    portal
                                </p>
                            </div>
                            <Switch
                                id="edit-status"
                                checked={editForm.data.is_active}
                                disabled={editingAdmin?.is_current}
                                onCheckedChange={(val) =>
                                    editForm.setData('is_active', val)
                                }
                            />
                        </div>

                        <div className="space-y-1.5 border-t border-tijum-surface/80 pt-3 dark:border-border">
                            <Label
                                htmlFor="edit-password"
                                className="text-tijum-plum dark:text-foreground"
                            >
                                Reset Password{' '}
                                <span className="text-xs font-normal text-tijum-plum-muted dark:text-muted-foreground">
                                    (leave blank to keep current)
                                </span>
                            </Label>
                            <Input
                                id="edit-password"
                                type="password"
                                value={editForm.data.password}
                                onChange={(e) =>
                                    editForm.setData('password', e.target.value)
                                }
                                placeholder="New password"
                                className="h-10.5"
                            />
                            <InputError
                                message={editForm.errors.password}
                                className="text-xs"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditingAdmin(null)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="plum"
                                loading={editForm.processing}
                            >
                                {editForm.processing
                                    ? 'Saving...'
                                    : 'Save Changes'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Reset 2FA Confirmation Dialog */}
            <ConfirmationDialog
                isOpen={Boolean(reset2faAdmin)}
                onOpenChange={(open) => !open && setReset2faAdmin(null)}
                title="Reset Two-Factor Authentication?"
                description={`This will clear the TOTP secret key for ${reset2faAdmin?.name} (${reset2faAdmin?.email}). They will be required to re-scan the QR code and configure 2FA upon their next sign-in.`}
                confirmLabel={
                    isResetting2fa ? 'Resetting...' : 'Reset 2FA Secret'
                }
                cancelLabel="Cancel"
                variant="destructive"
                loading={isResetting2fa}
                onConfirm={handleConfirmReset2fa}
                onCancel={() => setReset2faAdmin(null)}
            />
        </>
    );
}

AdminAccountsIndex.layout = {
    breadcrumbs: [
        { title: 'Admin Console', href: dashboard() },
        { title: 'System Management', href: adminsIndex() },
        { title: 'Admin Accounts', href: adminsIndex() },
    ],
};
