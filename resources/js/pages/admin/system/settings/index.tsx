import { Head, useForm, usePage } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import {
    Activity,
    AlertCircle,
    Bell,
    CheckCircle2,
    Clock,
    CreditCard,
    ExternalLink,
    Eye,
    EyeOff,
    Globe,
    Grid,
    Image as ImageIcon,
    Info,
    Key,
    Layers,
    Loader2,
    Mail,
    MapPin,
    Maximize2,
    MessageSquare,
    Moon,
    Palette,
    Percent,
    Radio,
    Receipt,
    Save,
    Scale,
    Search,
    ShieldCheck,
    Smartphone,
    Sparkles,
    Sun,
    ToggleLeft,
    Upload,
    Zap,
} from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import InputError from '@/components/input-error';
import { StatCard } from '@/components/shared/info-card';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import AdminLayout from '@/layouts/admin-layout';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';

interface GeneralSettings {
    platform_name: string;
    platform_legal_name: string;
    website_url: string;
    support_email: string;
    support_phone: string;
    default_address: string;
    tagline: string;
    description: string;
}

interface BrandSettings {
    primary_logo_url: string;
    horizontal_logo_url: string;
    light_logo_url: string;
    dark_logo_url: string;
    mobile_icon_url: string;
    favicon_url: string;
    og_image_url: string;
    email_header_logo_url: string;
    color_primary: string;
    color_secondary: string;
    color_accent: string;
}

interface SeoSettings {
    default_meta_title: string;
    default_meta_description: string;
    canonical_url_base: string;
    og_site_name: string;
    twitter_handle: string;
    robots_directive: string;
    google_site_verification: string;
    bing_site_verification: string;
    sitemap_enabled: boolean;
}

interface IntegrationSettings {
    razorpay_mode: string;
    razorpay_key_id: string;
    razorpay_key_secret_masked: string;
    razorpay_webhook_secret_masked: string;
    whatsapp_phone_number_id: string;
    whatsapp_access_token_masked: string;
    whatsapp_business_account_id: string;
    sms_provider: string;
    sms_auth_key_masked: string;
    sms_sender_id: string;
    google_maps_api_key_masked: string;
    expo_access_token_masked: string;
    has_razorpay_secret: boolean;
    has_whatsapp_token: boolean;
    has_sms_key: boolean;
}

interface TimingsSettings {
    check_in_time: string;
    check_out_time: string;
    earliest_early_check_in_time: string;
    checkout_expiry_minutes: number;
}

interface FinancialSettings {
    platform_legal_name: string;
    platform_gstin: string;
    platform_sac_code: string;
    default_commission_rate_bps: number;
    commission_gst_rate_bps: number;
    default_tds_rate_bps: number;
    hold_interval_hours: number;
}

interface GrievanceSettings {
    officer_name: string;
    officer_designation: string;
    officer_email: string;
    officer_phone: string;
    officer_address: string;
    sla_acknowledgement_hours: number;
    sla_resolution_days: number;
}

interface NotificationSettings {
    in_app: boolean;
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
    push: boolean;
}

interface LocalizationSettings {
    timezone: string;
    default_country: string;
    default_currency: string;
    currency_symbol: string;
    date_format: string;
    time_format: string;
    number_format: string;
    calling_code: string;
}

interface SecuritySettings {
    session_timeout_minutes: number;
    max_login_attempts: number;
    lockout_duration_minutes: number;
    enforce_admin_2fa: boolean;
    require_customer_email_verification: boolean;
    require_partner_email_verification: boolean;
    api_rate_limit_per_minute: number;
}

interface FeaturesSettings {
    maintenance_mode: boolean;
    maintenance_message: string;
    allow_customer_registration: boolean;
    allow_partner_registration: boolean;
    instant_booking_enabled: boolean;
    rewards_program_enabled: boolean;
    referral_program_enabled: boolean;
}

interface Props {
    settings: {
        general: GeneralSettings;
        brand: BrandSettings;
        seo: SeoSettings;
        integrations: IntegrationSettings;
        timings: TimingsSettings;
        financial: FinancialSettings;
        grievance: GrievanceSettings;
        notifications: NotificationSettings;
        localization: LocalizationSettings;
        security: SecuritySettings;
        features: FeaturesSettings;
    };
}

type SettingTab =
    | 'general'
    | 'brand'
    | 'seo'
    | 'integrations'
    | 'timings'
    | 'financial'
    | 'grievance'
    | 'notifications'
    | 'localization'
    | 'security'
    | 'features';

type AssetBackdropMode = 'light' | 'dark' | 'checker';

type BrandAssetConfig = {
    id: string;
    field:
        | 'primary_logo_url'
        | 'horizontal_logo_url'
        | 'light_logo_url'
        | 'dark_logo_url'
        | 'mobile_icon_url'
        | 'favicon_url'
        | 'og_image_url'
        | 'email_header_logo_url';
    title: string;
    desc: string;
    spec: string;
    ratio: string;
    accept: string;
    hasBackdrop: boolean;
    defaultBackdrop?: AssetBackdropMode;
};

const SETTINGS_BREADCRUMBS: BreadcrumbItem[] = [
    { title: 'Admin Console', href: '/admin/dashboard' },
    { title: 'System Management', href: '/admin/system/admins' },
    { title: 'Platform Settings', href: '/admin/system/settings' },
];

const BRAND_ASSETS: BrandAssetConfig[] = [
    {
        id: 'primary_logo',
        field: 'primary_logo_url',
        title: 'Primary Brand Logo',
        desc: 'Main platform logo shown on navbar, footer, auth screens, and brand lockups.',
        spec: 'SVG vector (recommended) or transparent PNG · Min 300px width',
        ratio: '3:1 Horizontal',
        accept: '.svg,.png,.webp',
        hasBackdrop: true,
    },
    {
        id: 'horizontal_logo',
        field: 'horizontal_logo_url',
        title: 'Horizontal Header Banner Logo',
        desc: 'Wide-aspect logo for desktop navigation bars, top menus, and partner portal headers.',
        spec: 'SVG vector or high-resolution PNG · Min 480x120px',
        ratio: '4:1 Wide Banner',
        accept: '.svg,.png,.webp',
        hasBackdrop: true,
    },
    {
        id: 'light_logo',
        field: 'light_logo_url',
        title: 'Light Variant Logo (for Dark Backdrops)',
        desc: 'White or cream monochrome variant used across deep Plum headers and dark mobile splash screens.',
        spec: 'Monochrome light SVG or PNG · Transparent background',
        ratio: 'Vector Scalable',
        accept: '.svg,.png,.webp',
        hasBackdrop: true,
        defaultBackdrop: 'dark',
    },
    {
        id: 'dark_logo',
        field: 'dark_logo_url',
        title: 'Dark Variant Logo (for Light Backdrops)',
        desc: 'Deep Plum logo variant used across clean white document printouts, receipts, and invoices.',
        spec: 'Plum #5C2D54 SVG or PNG · Transparent background',
        ratio: 'Vector Scalable',
        accept: '.svg,.png,.webp',
        hasBackdrop: true,
        defaultBackdrop: 'light',
    },
    {
        id: 'mobile_icon',
        field: 'mobile_icon_url',
        title: 'Mobile App Icon',
        desc: 'Square application launcher icon used for Expo React Native and iOS/Android home screens.',
        spec: 'PNG or WebP · 512x512px or 1024x1024px · 1:1 Aspect ratio · No transparency for iOS store',
        ratio: '1:1 Square (512x512)',
        accept: '.png,.webp,.jpg',
        hasBackdrop: false,
    },
    {
        id: 'favicon',
        field: 'favicon_url',
        title: 'Browser Favicon',
        desc: 'Website icon displayed in browser address bars, bookmarks, and tabs.',
        spec: 'ICO or PNG format · 32x32px or 64x64px',
        ratio: '1:1 Square (32x32)',
        accept: '.ico,.png',
        hasBackdrop: false,
    },
    {
        id: 'og_image',
        field: 'og_image_url',
        title: 'Default Social Share Image (OpenGraph)',
        desc: 'Social card thumbnail displayed when sharing TIJUM links across WhatsApp, X, Facebook, and LinkedIn.',
        spec: 'JPG or PNG · Exactly 1200 x 630px · 1.91:1 Aspect ratio · Max 2MB',
        ratio: '1.91:1 (1200x630)',
        accept: '.png,.jpg,.jpeg,.webp',
        hasBackdrop: false,
    },
    {
        id: 'email_header_logo',
        field: 'email_header_logo_url',
        title: 'Transactional Email Header Banner',
        desc: 'Branded header displayed at the top of booking confirmations, OTP verifications, and partner notifications.',
        spec: 'PNG, JPG, or SVG · Max width 600px · High contrast background',
        ratio: 'Banner (600px max)',
        accept: '.png,.jpg,.jpeg,.svg,.webp',
        hasBackdrop: true,
    },
];

const SETTING_TABS: ReadonlyArray<{
    id: SettingTab;
    label: string;
    icon: LucideIcon;
    badge: string;
}> = [
    { id: 'general', label: 'Platform Info', icon: Globe, badge: 'Core' },
    { id: 'brand', label: 'Brand & Assets', icon: Palette, badge: 'Design' },
    { id: 'seo', label: 'SEO & Search', icon: Search, badge: 'Growth' },
    {
        id: 'integrations',
        label: 'API Integrations',
        icon: Key,
        badge: 'Secure',
    },
    { id: 'timings', label: 'Timings', icon: Clock, badge: 'Live' },
    {
        id: 'financial',
        label: 'Financial & Tax',
        icon: Receipt,
        badge: 'Statutory',
    },
    { id: 'grievance', label: 'Grievance & SLA', icon: Scale, badge: 'Legal' },
    {
        id: 'notifications',
        label: 'Notifications',
        icon: Bell,
        badge: 'Delivery',
    },
    {
        id: 'localization',
        label: 'Localization',
        icon: Layers,
        badge: 'Regional',
    },
    {
        id: 'security',
        label: 'Security & Access',
        icon: ShieldCheck,
        badge: 'Protection',
    },
    {
        id: 'features',
        label: 'Platform Features',
        icon: ToggleLeft,
        badge: 'Switches',
    },
];

function getBackdropClasses(mode: AssetBackdropMode): string {
    if (mode === 'dark') {
        return 'bg-tijum-plum text-white';
    }

    if (mode === 'checker') {
        return 'bg-[repeating-conic-gradient(#e5e7eb_0%_25%,#ffffff_0%_50%)] bg-[length:16px_16px] dark:bg-[repeating-conic-gradient(#3b2839_0%_25%,#281a27_0%_50%)]';
    }

    return 'tijum-preview-light bg-white text-tijum-plum';
}

function SectionCardHeader({
    icon: Icon,
    title,
    description,
    action,
}: {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: ReactNode;
}) {
    return (
        <CardHeader className="border-b border-tijum-surface/70 pb-5 dark:border-border">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="flex items-start gap-3.5">
                    <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15 dark:text-tijum-coral">
                        <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <div className="space-y-1">
                        <CardTitle className="text-lg sm:text-xl">
                            {title}
                        </CardTitle>
                        <CardDescription className="max-w-2xl">
                            {description}
                        </CardDescription>
                    </div>
                </div>
                {action && <div className="shrink-0">{action}</div>}
            </div>
        </CardHeader>
    );
}

function SectionCardFooter({
    processing,
    isDirty,
    submitLabel,
}: {
    processing: boolean;
    isDirty: boolean;
    submitLabel: string;
}) {
    return (
        <CardFooter className="flex flex-wrap items-center justify-between gap-3 rounded-b-[20px] border-t border-tijum-surface/80 bg-tijum-cream/35 px-6 py-4 dark:border-border dark:bg-muted/35">
            <div className="flex items-center gap-2">
                {isDirty ? (
                    <Badge variant="peach" className="text-[11px]">
                        Unsaved edits in this section
                    </Badge>
                ) : (
                    <span className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                        Synced with live platform configuration store
                    </span>
                )}
            </div>
            <Button
                type="submit"
                variant="plum"
                loading={processing}
                disabled={processing}
            >
                {!processing && <Save className="size-4" aria-hidden="true" />}
                <span>{submitLabel}</span>
            </Button>
        </CardFooter>
    );
}

function SettingSwitchRow({
    id,
    title,
    description,
    checked,
    onCheckedChange,
    icon: Icon,
    iconBadgeClassName,
    showStatusBadge = true,
}: {
    id: string;
    title: string;
    description: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    icon?: LucideIcon;
    iconBadgeClassName?: string;
    showStatusBadge?: boolean;
}) {
    return (
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-tijum-surface/80 bg-tijum-cream/25 p-4 transition-colors hover:border-tijum-coral/40 sm:flex-row sm:items-center dark:border-border dark:bg-muted/35 dark:hover:border-tijum-coral/45">
            <div className="flex items-start gap-3.5 sm:items-center">
                {Icon && (
                    <span
                        className={cn(
                            'flex size-10 shrink-0 items-center justify-center rounded-xl border',
                            iconBadgeClassName ??
                                'border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15 dark:text-tijum-coral',
                        )}
                    >
                        <Icon className="size-4.5" aria-hidden="true" />
                    </span>
                )}
                <div className="space-y-0.5">
                    <Label
                        htmlFor={id}
                        className="cursor-pointer text-sm font-semibold text-tijum-plum dark:text-foreground"
                    >
                        {title}
                    </Label>
                    <p className="text-xs leading-relaxed text-tijum-plum-muted dark:text-muted-foreground">
                        {description}
                    </p>
                </div>
            </div>

            <div className="flex items-center justify-end gap-3 self-end sm:self-center">
                {showStatusBadge && (
                    <StatusBadge
                        status={checked ? 'active' : 'neutral'}
                        label={checked ? 'Enabled' : 'Disabled'}
                    />
                )}
                <Switch
                    id={id}
                    checked={checked}
                    onCheckedChange={onCheckedChange}
                />
            </div>
        </div>
    );
}

export default function AdminPlatformSettingsIndex({ settings }: Props) {
    const { flash } = usePage<{ flash?: { status?: string } }>().props;

    const [activeTab, setActiveTab] = useState<SettingTab>('general');
    const [showSecrets, setShowSecrets] = useState(false);
    const [testingIntegration, setTestingIntegration] = useState<string | null>(
        null,
    );
    const [uploadingAsset, setUploadingAsset] = useState<string | null>(null);
    const [backdrops, setBackdrops] = useState<
        Record<string, AssetBackdropMode>
    >({
        light_logo: 'dark',
        dark_logo: 'light',
    });
    const [brokenAssets, setBrokenAssets] = useState<Record<string, boolean>>(
        {},
    );
    const [previewAsset, setPreviewAsset] = useState<BrandAssetConfig | null>(
        null,
    );

    const setAssetBackdrop = (assetId: string, mode: AssetBackdropMode) => {
        setBackdrops((prev) => ({ ...prev, [assetId]: mode }));
    };

    // 1. General Form
    const generalForm = useForm({
        section: 'general',
        platform_name: settings.general.platform_name,
        platform_legal_name: settings.general.platform_legal_name,
        website_url: settings.general.website_url,
        support_email: settings.general.support_email,
        support_phone: settings.general.support_phone,
        default_address: settings.general.default_address,
        tagline: settings.general.tagline,
        description: settings.general.description,
    });

    const handleGeneralSubmit = (e: FormEvent) => {
        e.preventDefault();
        generalForm.post('/admin/system/settings', { preserveScroll: true });
    };

    // 2. Brand Form
    const brandForm = useForm({
        section: 'brand',
        primary_logo_url: settings.brand.primary_logo_url,
        horizontal_logo_url: settings.brand.horizontal_logo_url,
        light_logo_url: settings.brand.light_logo_url,
        dark_logo_url: settings.brand.dark_logo_url,
        mobile_icon_url: settings.brand.mobile_icon_url,
        favicon_url: settings.brand.favicon_url,
        og_image_url: settings.brand.og_image_url,
        email_header_logo_url: settings.brand.email_header_logo_url,
        color_primary: settings.brand.color_primary,
        color_secondary: settings.brand.color_secondary,
        color_accent: settings.brand.color_accent,
    });

    const handleBrandSubmit = (e: FormEvent) => {
        e.preventDefault();
        brandForm.post('/admin/system/settings', { preserveScroll: true });
    };

    const handleUploadAsset = async (assetType: string, file: File) => {
        if (!file) return;

        const validExtensions = ['svg', 'png', 'jpg', 'jpeg', 'webp', 'ico'];
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (!ext || !validExtensions.includes(ext)) {
            toast.error(
                'Invalid file format. Please upload SVG, PNG, JPG, WebP, or ICO.',
            );
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error('File size exceeds the 5MB limit.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('asset_type', assetType);

        setUploadingAsset(assetType);
        try {
            const token = document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute('content');
            const res = await fetch('/admin/system/settings/upload-asset', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': token || '',
                },
                body: formData,
            });

            const data = await res.json();
            if (res.ok && data.success) {
                const key = `${assetType}_url` as keyof typeof brandForm.data;
                brandForm.setData(key, data.url);
                setBrokenAssets((prev) => ({ ...prev, [assetType]: false }));
                toast.success(data.message || 'Asset uploaded and applied.');
            } else {
                toast.error(data.message || 'Upload failed.');
            }
        } catch {
            toast.error('Network error occurred while uploading.');
        } finally {
            setUploadingAsset(null);
        }
    };

    // 3. SEO Form
    const seoForm = useForm({
        section: 'seo',
        default_meta_title: settings.seo.default_meta_title,
        default_meta_description: settings.seo.default_meta_description,
        canonical_url_base: settings.seo.canonical_url_base,
        og_site_name: settings.seo.og_site_name,
        twitter_handle: settings.seo.twitter_handle,
        robots_directive: settings.seo.robots_directive,
        google_site_verification: settings.seo.google_site_verification,
        bing_site_verification: settings.seo.bing_site_verification,
        sitemap_enabled: settings.seo.sitemap_enabled,
    });

    const handleSeoSubmit = (e: FormEvent) => {
        e.preventDefault();
        seoForm.post('/admin/system/settings', { preserveScroll: true });
    };

    // 4. Integrations Form
    const integrationsForm = useForm({
        section: 'integrations',
        razorpay_mode: settings.integrations.razorpay_mode,
        razorpay_key_id: settings.integrations.razorpay_key_id,
        razorpay_key_secret: '',
        razorpay_webhook_secret: '',
        whatsapp_phone_number_id:
            settings.integrations.whatsapp_phone_number_id,
        whatsapp_access_token: '',
        whatsapp_business_account_id:
            settings.integrations.whatsapp_business_account_id,
        sms_provider: settings.integrations.sms_provider,
        sms_auth_key: '',
        sms_sender_id: settings.integrations.sms_sender_id,
        google_maps_api_key: '',
        expo_access_token: '',
    });

    const handleIntegrationsSubmit = (e: FormEvent) => {
        e.preventDefault();
        integrationsForm.post('/admin/system/settings', {
            preserveScroll: true,
        });
    };

    // 5. Timings Form (Preserved)
    const timingsForm = useForm({
        section: 'timings',
        check_in_time: settings.timings.check_in_time,
        check_out_time: settings.timings.check_out_time,
        earliest_early_check_in_time:
            settings.timings.earliest_early_check_in_time,
        checkout_expiry_minutes: settings.timings.checkout_expiry_minutes,
    });

    const handleTimingsSubmit = (e: FormEvent) => {
        e.preventDefault();
        timingsForm.post('/admin/system/settings', { preserveScroll: true });
    };

    // 6. Financial Form (Preserved)
    const financialForm = useForm({
        section: 'financial',
        platform_legal_name: settings.financial.platform_legal_name,
        platform_gstin: settings.financial.platform_gstin,
        platform_sac_code: settings.financial.platform_sac_code,
        default_commission_rate_bps:
            settings.financial.default_commission_rate_bps,
        commission_gst_rate_bps: settings.financial.commission_gst_rate_bps,
        default_tds_rate_bps: settings.financial.default_tds_rate_bps,
        hold_interval_hours: settings.financial.hold_interval_hours,
    });

    const handleFinancialSubmit = (e: FormEvent) => {
        e.preventDefault();
        financialForm.post('/admin/system/settings', { preserveScroll: true });
    };

    // 7. Grievance Form (Preserved)
    const grievanceForm = useForm({
        section: 'grievance',
        officer_name: settings.grievance.officer_name,
        officer_designation: settings.grievance.officer_designation,
        officer_email: settings.grievance.officer_email,
        officer_phone: settings.grievance.officer_phone,
        officer_address: settings.grievance.officer_address,
        sla_acknowledgement_hours: settings.grievance.sla_acknowledgement_hours,
        sla_resolution_days: settings.grievance.sla_resolution_days,
    });

    const handleGrievanceSubmit = (e: FormEvent) => {
        e.preventDefault();
        grievanceForm.post('/admin/system/settings', { preserveScroll: true });
    };

    // 8. Notifications Form (Preserved)
    const notificationsForm = useForm({
        section: 'notifications',
        in_app: settings.notifications.in_app,
        email: settings.notifications.email,
        sms: settings.notifications.sms,
        whatsapp: settings.notifications.whatsapp,
        push: settings.notifications.push,
    });

    const handleNotificationsSubmit = (e: FormEvent) => {
        e.preventDefault();
        notificationsForm.post('/admin/system/settings', {
            preserveScroll: true,
        });
    };

    // 9. Localization Form
    const localizationForm = useForm({
        section: 'localization',
        timezone: settings.localization.timezone,
        default_country: settings.localization.default_country,
        default_currency: settings.localization.default_currency,
        currency_symbol: settings.localization.currency_symbol,
        date_format: settings.localization.date_format,
        time_format: settings.localization.time_format,
        number_format: settings.localization.number_format,
        calling_code: settings.localization.calling_code,
    });

    const handleLocalizationSubmit = (e: FormEvent) => {
        e.preventDefault();
        localizationForm.post('/admin/system/settings', {
            preserveScroll: true,
        });
    };

    // 10. Security Form
    const securityForm = useForm({
        section: 'security',
        session_timeout_minutes: settings.security.session_timeout_minutes,
        max_login_attempts: settings.security.max_login_attempts,
        lockout_duration_minutes: settings.security.lockout_duration_minutes,
        enforce_admin_2fa: settings.security.enforce_admin_2fa,
        require_customer_email_verification:
            settings.security.require_customer_email_verification,
        require_partner_email_verification:
            settings.security.require_partner_email_verification,
        api_rate_limit_per_minute: settings.security.api_rate_limit_per_minute,
    });

    const handleSecuritySubmit = (e: FormEvent) => {
        e.preventDefault();
        securityForm.post('/admin/system/settings', { preserveScroll: true });
    };

    // 11. Features Form
    const featuresForm = useForm({
        section: 'features',
        maintenance_mode: settings.features.maintenance_mode,
        maintenance_message: settings.features.maintenance_message,
        allow_customer_registration:
            settings.features.allow_customer_registration,
        allow_partner_registration:
            settings.features.allow_partner_registration,
        instant_booking_enabled: settings.features.instant_booking_enabled,
        rewards_program_enabled: settings.features.rewards_program_enabled,
        referral_program_enabled: settings.features.referral_program_enabled,
    });

    const handleFeaturesSubmit = (e: FormEvent) => {
        e.preventDefault();
        featuresForm.post('/admin/system/settings', { preserveScroll: true });
    };

    // Test connection handler
    const runTestConnection = async (
        provider: 'razorpay' | 'sms' | 'whatsapp',
    ) => {
        setTestingIntegration(provider);
        try {
            const token = document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute('content');
            const res = await fetch('/admin/system/settings/test-integration', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': token || '',
                },
                body: JSON.stringify({ provider }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success(data.message);
            } else {
                toast.error(data.message || 'Connection test failed.');
            }
        } catch {
            toast.error('Network error during connection test.');
        } finally {
            setTestingIntegration(null);
        }
    };

    const enabledNotificationChannels = [
        notificationsForm.data.in_app,
        notificationsForm.data.email,
        notificationsForm.data.sms,
        notificationsForm.data.whatsapp,
        notificationsForm.data.push,
    ].filter(Boolean).length;

    const previewUrl = previewAsset ? brandForm.data[previewAsset.field] : '';
    const previewBackdrop: AssetBackdropMode = previewAsset
        ? backdrops[previewAsset.id] || previewAsset.defaultBackdrop || 'light'
        : 'light';

    return (
        <AdminLayout breadcrumbs={SETTINGS_BREADCRUMBS}>
            <Head title="Platform Settings — System Management — TIJUM" />

            <div className="space-y-6 pb-16">
                {/* Executive Page Header */}
                <PageHeader
                    eyebrow="System Governance"
                    title="Platform Settings"
                    description="Centralized single source of truth for platform rules, legal compliance, integrations, brand assets, and operational switches."
                    badges={
                        <>
                            <StatusBadge
                                status="active"
                                label="Config Engine Active"
                            />
                            {featuresForm.data.maintenance_mode && (
                                <StatusBadge
                                    status="warning"
                                    label="Maintenance Mode Enabled"
                                />
                            )}
                        </>
                    }
                    actions={
                        <Badge
                            variant="outline"
                            className="px-3 py-1.5 text-xs tabular-nums"
                        >
                            11 Configuration Domains
                        </Badge>
                    }
                />

                {/* Live Telemetry Summary Strip */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        label="Payment Gateway Mode"
                        value={
                            integrationsForm.data.razorpay_mode === 'live'
                                ? 'Production Live'
                                : 'Sandbox Mode'
                        }
                        icon={CreditCard}
                        helperText={`Hold window: ${timingsForm.data.checkout_expiry_minutes} mins`}
                        badge={
                            <StatusBadge
                                status={
                                    integrationsForm.data.razorpay_mode ===
                                    'live'
                                        ? 'active'
                                        : 'pending'
                                }
                                label={
                                    integrationsForm.data.razorpay_mode ===
                                    'live'
                                        ? 'Live'
                                        : 'Sandbox'
                                }
                            />
                        }
                    />
                    <StatCard
                        label="Platform Commission"
                        value={`${(financialForm.data.default_commission_rate_bps / 100).toFixed(2)}%`}
                        icon={Percent}
                        helperText={`GST ${(financialForm.data.commission_gst_rate_bps / 100).toFixed(2)}% · TDS ${(financialForm.data.default_tds_rate_bps / 100).toFixed(2)}%`}
                    />
                    <StatCard
                        label="Delivery Channels"
                        value={`${enabledNotificationChannels} / 5 Active`}
                        icon={Bell}
                        helperText={`Timezone: ${localizationForm.data.timezone}`}
                    />
                    <StatCard
                        label="Admin 2FA & Access"
                        value={
                            securityForm.data.enforce_admin_2fa
                                ? '2FA Enforced'
                                : '2FA Optional'
                        }
                        icon={ShieldCheck}
                        helperText={`Rate limit: ${securityForm.data.api_rate_limit_per_minute} req/min`}
                        badge={
                            <StatusBadge
                                status={
                                    featuresForm.data.maintenance_mode
                                        ? 'warning'
                                        : 'verified'
                                }
                                label={
                                    featuresForm.data.maintenance_mode
                                        ? 'Maintenance'
                                        : 'Marketplace Open'
                                }
                            />
                        }
                    />
                </div>

                {/* Elevated Flash Status Card */}
                {flash?.status && (
                    <Card className="border-l-4 border-l-emerald-500 py-4">
                        <CardContent className="flex items-center gap-3 px-6">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-status-success-border bg-status-success-bg text-status-success-fg">
                                <CheckCircle2
                                    className="size-4.5"
                                    aria-hidden="true"
                                />
                            </span>
                            <div className="space-y-0.5">
                                <p className="font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                    Configuration Updated
                                </p>
                                <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                    {flash.status}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Unified TIJUM Pill Tabs Navigation + Section Panels */}
                <Tabs
                    value={activeTab}
                    onValueChange={(value) => setActiveTab(value as SettingTab)}
                    className="space-y-6"
                >
                    <TabsList
                        variant="pill"
                        label="Platform settings sections"
                        className="flex w-full flex-wrap items-center gap-1.5 rounded-[20px] p-2"
                    >
                        {SETTING_TABS.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;

                            return (
                                <TabsTrigger
                                    key={tab.id}
                                    value={tab.id}
                                    className="group min-w-[138px] flex-1 justify-between gap-2 px-3 py-2.5 sm:flex-initial"
                                >
                                    <span className="flex items-center gap-2">
                                        <Icon
                                            className={cn(
                                                'size-3.5 shrink-0',
                                                isActive
                                                    ? 'text-tijum-peach dark:text-white'
                                                    : 'text-tijum-plum-muted group-hover:text-tijum-plum dark:text-muted-foreground dark:group-hover:text-foreground',
                                            )}
                                            aria-hidden="true"
                                        />
                                        <span>{tab.label}</span>
                                    </span>
                                    <span
                                        className={cn(
                                            'rounded-md px-1.5 py-0.5 text-[9px] leading-none font-bold tracking-wider uppercase',
                                            isActive
                                                ? 'bg-white/20 text-white'
                                                : 'bg-tijum-surface/75 text-tijum-plum-muted dark:bg-muted dark:text-muted-foreground',
                                        )}
                                    >
                                        {tab.badge}
                                    </span>
                                </TabsTrigger>
                            );
                        })}
                    </TabsList>

                    {/* 1. General Platform Information */}
                    <TabsContent value="general">
                        <Card>
                            <form onSubmit={handleGeneralSubmit}>
                                <SectionCardHeader
                                    icon={Globe}
                                    title="General Platform & Organization"
                                    description="Configure platform public identity, official legal entity, contact addresses, and promotional taglines."
                                />

                                <CardContent className="space-y-6 py-6">
                                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="platform_name">
                                                Platform Brand Name
                                            </Label>
                                            <Input
                                                id="platform_name"
                                                value={
                                                    generalForm.data
                                                        .platform_name
                                                }
                                                onChange={(e) =>
                                                    generalForm.setData(
                                                        'platform_name',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="TIJUM"
                                                required
                                            />
                                            <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                Used across navigation,
                                                notifications, and mobile app
                                                titles.
                                            </p>
                                            <InputError
                                                message={
                                                    generalForm.errors
                                                        .platform_name
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="platform_legal_name">
                                                Registered Legal Entity Name
                                            </Label>
                                            <Input
                                                id="platform_legal_name"
                                                value={
                                                    generalForm.data
                                                        .platform_legal_name
                                                }
                                                onChange={(e) =>
                                                    generalForm.setData(
                                                        'platform_legal_name',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="TIJUM Marketplace Private Limited"
                                                required
                                            />
                                            <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                Printed on official invoices,
                                                partner agreements, and
                                                receipts.
                                            </p>
                                            <InputError
                                                message={
                                                    generalForm.errors
                                                        .platform_legal_name
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="website_url">
                                                Primary Website URL
                                            </Label>
                                            <Input
                                                id="website_url"
                                                type="url"
                                                value={
                                                    generalForm.data.website_url
                                                }
                                                onChange={(e) =>
                                                    generalForm.setData(
                                                        'website_url',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="https://tijum.com"
                                                required
                                            />
                                            <InputError
                                                message={
                                                    generalForm.errors
                                                        .website_url
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="support_email">
                                                Public Support Email
                                            </Label>
                                            <Input
                                                id="support_email"
                                                type="email"
                                                value={
                                                    generalForm.data
                                                        .support_email
                                                }
                                                onChange={(e) =>
                                                    generalForm.setData(
                                                        'support_email',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="support@tijum.com"
                                                required
                                            />
                                            <InputError
                                                message={
                                                    generalForm.errors
                                                        .support_email
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="support_phone">
                                                Customer Care Hotline Phone
                                            </Label>
                                            <Input
                                                id="support_phone"
                                                value={
                                                    generalForm.data
                                                        .support_phone
                                                }
                                                onChange={(e) =>
                                                    generalForm.setData(
                                                        'support_phone',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="+91 40 6828 0000"
                                                required
                                            />
                                            <InputError
                                                message={
                                                    generalForm.errors
                                                        .support_phone
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="tagline">
                                                Official Tagline
                                            </Label>
                                            <Input
                                                id="tagline"
                                                value={generalForm.data.tagline}
                                                onChange={(e) =>
                                                    generalForm.setData(
                                                        'tagline',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Stay easy. Eat well. Spend less."
                                                required
                                            />
                                            <InputError
                                                message={
                                                    generalForm.errors.tagline
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="default_address">
                                            Registered Headquarters Physical
                                            Address
                                        </Label>
                                        <Textarea
                                            id="default_address"
                                            rows={3}
                                            value={
                                                generalForm.data.default_address
                                            }
                                            onChange={(e) =>
                                                generalForm.setData(
                                                    'default_address',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Level 4, Cyber Gateway, HITEC City, Hyderabad, Telangana 500081, India"
                                            required
                                        />
                                        <InputError
                                            message={
                                                generalForm.errors
                                                    .default_address
                                            }
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="description">
                                            Platform Public Description
                                        </Label>
                                        <Textarea
                                            id="description"
                                            rows={3}
                                            value={generalForm.data.description}
                                            onChange={(e) =>
                                                generalForm.setData(
                                                    'description',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="TIJUM is India's premier verified student and professional accommodation network..."
                                            required
                                        />
                                        <InputError
                                            message={
                                                generalForm.errors.description
                                            }
                                        />
                                    </div>
                                </CardContent>

                                <SectionCardFooter
                                    processing={generalForm.processing}
                                    isDirty={generalForm.isDirty}
                                    submitLabel="Save Platform Information"
                                />
                            </form>
                        </Card>
                    </TabsContent>

                    {/* 2. Brand Identity & Assets */}
                    <TabsContent value="brand">
                        <Card>
                            <form onSubmit={handleBrandSubmit}>
                                <SectionCardHeader
                                    icon={Palette}
                                    title="Brand Identity & Digital Assets"
                                    description="Manage global logo paths, mobile app icons, favicons, social open-graph banners, and theme color tokens."
                                />

                                <CardContent className="space-y-6 py-6">
                                    {/* Theme Color Tokens Inset Well */}
                                    <div className="space-y-4 rounded-2xl border border-tijum-surface/80 bg-tijum-cream/40 p-5 dark:border-border dark:bg-muted/45">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <h4 className="flex items-center gap-2 font-heading text-sm font-bold text-tijum-plum dark:text-foreground">
                                                <Sparkles
                                                    className="size-4 text-tijum-coral"
                                                    aria-hidden="true"
                                                />
                                                <span>
                                                    Platform Color Tokens
                                                </span>
                                            </h4>
                                            <div className="flex items-center gap-1.5">
                                                <span
                                                    className="size-4 rounded-full border border-tijum-surface/80 shadow-2xs dark:border-border"
                                                    style={{
                                                        backgroundColor:
                                                            brandForm.data
                                                                .color_primary,
                                                    }}
                                                    title="Primary"
                                                />
                                                <span
                                                    className="size-4 rounded-full border border-tijum-surface/80 shadow-2xs dark:border-border"
                                                    style={{
                                                        backgroundColor:
                                                            brandForm.data
                                                                .color_secondary,
                                                    }}
                                                    title="Secondary"
                                                />
                                                <span
                                                    className="size-4 rounded-full border border-tijum-surface/80 shadow-2xs dark:border-border"
                                                    style={{
                                                        backgroundColor:
                                                            brandForm.data
                                                                .color_accent,
                                                    }}
                                                    title="Accent"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                            <div className="space-y-2">
                                                <Label
                                                    htmlFor="color_primary"
                                                    className="text-xs"
                                                >
                                                    Primary Brand Color (Plum)
                                                </Label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="color"
                                                        aria-label="Primary Brand Color Picker"
                                                        value={
                                                            brandForm.data
                                                                .color_primary
                                                        }
                                                        onChange={(e) =>
                                                            brandForm.setData(
                                                                'color_primary',
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="size-10 shrink-0 cursor-pointer rounded-xl border border-tijum-surface/80 bg-white p-1 dark:border-border dark:bg-card"
                                                    />
                                                    <Input
                                                        id="color_primary"
                                                        value={
                                                            brandForm.data
                                                                .color_primary
                                                        }
                                                        onChange={(e) =>
                                                            brandForm.setData(
                                                                'color_primary',
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="h-10 font-mono text-xs uppercase tabular-nums"
                                                    />
                                                </div>
                                                <InputError
                                                    message={
                                                        brandForm.errors
                                                            .color_primary
                                                    }
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label
                                                    htmlFor="color_secondary"
                                                    className="text-xs"
                                                >
                                                    Secondary Brand Color
                                                    (Peach)
                                                </Label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="color"
                                                        aria-label="Secondary Brand Color Picker"
                                                        value={
                                                            brandForm.data
                                                                .color_secondary
                                                        }
                                                        onChange={(e) =>
                                                            brandForm.setData(
                                                                'color_secondary',
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="size-10 shrink-0 cursor-pointer rounded-xl border border-tijum-surface/80 bg-white p-1 dark:border-border dark:bg-card"
                                                    />
                                                    <Input
                                                        id="color_secondary"
                                                        value={
                                                            brandForm.data
                                                                .color_secondary
                                                        }
                                                        onChange={(e) =>
                                                            brandForm.setData(
                                                                'color_secondary',
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="h-10 font-mono text-xs uppercase tabular-nums"
                                                    />
                                                </div>
                                                <InputError
                                                    message={
                                                        brandForm.errors
                                                            .color_secondary
                                                    }
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label
                                                    htmlFor="color_accent"
                                                    className="text-xs"
                                                >
                                                    Accent Background (Cream)
                                                </Label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="color"
                                                        aria-label="Accent Background Color Picker"
                                                        value={
                                                            brandForm.data
                                                                .color_accent
                                                        }
                                                        onChange={(e) =>
                                                            brandForm.setData(
                                                                'color_accent',
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="size-10 shrink-0 cursor-pointer rounded-xl border border-tijum-surface/80 bg-white p-1 dark:border-border dark:bg-card"
                                                    />
                                                    <Input
                                                        id="color_accent"
                                                        value={
                                                            brandForm.data
                                                                .color_accent
                                                        }
                                                        onChange={(e) =>
                                                            brandForm.setData(
                                                                'color_accent',
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="h-10 font-mono text-xs uppercase tabular-nums"
                                                    />
                                                </div>
                                                <InputError
                                                    message={
                                                        brandForm.errors
                                                            .color_accent
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Brand Assets Grid */}
                                    <div className="space-y-4">
                                        <div>
                                            <h4 className="font-heading text-base font-bold text-tijum-plum dark:text-foreground">
                                                Platform Visual Assets &amp;
                                                Brand Marks
                                            </h4>
                                            <p className="mt-0.5 text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                Upload images directly from your
                                                device or specify public CDN
                                                asset URLs. Transparent logos
                                                can be previewed against light,
                                                dark Plum, or checkered
                                                transparency backdrops.
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                            {BRAND_ASSETS.map((asset) => {
                                                const currentUrl =
                                                    brandForm.data[asset.field];
                                                const currentBackdrop: AssetBackdropMode =
                                                    backdrops[asset.id] ||
                                                    asset.defaultBackdrop ||
                                                    'light';
                                                const isUploading =
                                                    uploadingAsset === asset.id;
                                                const showImage =
                                                    Boolean(currentUrl) &&
                                                    !brokenAssets[asset.id];

                                                return (
                                                    <div
                                                        key={asset.id}
                                                        className="flex flex-col justify-between rounded-2xl border border-tijum-surface/80 bg-tijum-cream/25 p-4 transition-colors hover:border-tijum-coral/40 dark:border-border dark:bg-muted/35 dark:hover:border-tijum-coral/45"
                                                    >
                                                        <div>
                                                            <div className="mb-3 flex items-start justify-between gap-2">
                                                                <div className="min-w-0">
                                                                    <h5 className="font-heading text-sm font-bold text-tijum-plum dark:text-foreground">
                                                                        {
                                                                            asset.title
                                                                        }
                                                                    </h5>
                                                                    <p className="mt-0.5 text-xs leading-relaxed text-tijum-plum-muted dark:text-muted-foreground">
                                                                        {
                                                                            asset.desc
                                                                        }
                                                                    </p>
                                                                </div>
                                                                <Badge
                                                                    variant="secondary"
                                                                    className="shrink-0 text-[10px] tabular-nums"
                                                                >
                                                                    {
                                                                        asset.ratio
                                                                    }
                                                                </Badge>
                                                            </div>

                                                            {/* Visual Preview Box */}
                                                            <div className="relative mb-3 overflow-hidden rounded-xl border border-tijum-surface/80 shadow-2xs dark:border-border">
                                                                {asset.hasBackdrop && (
                                                                    <div className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-lg bg-tijum-plum/85 p-1 backdrop-blur-xs">
                                                                        <button
                                                                            type="button"
                                                                            title="Light Preview Background"
                                                                            aria-label={`Light backdrop for ${asset.title}`}
                                                                            aria-pressed={
                                                                                currentBackdrop ===
                                                                                'light'
                                                                            }
                                                                            onClick={() =>
                                                                                setAssetBackdrop(
                                                                                    asset.id,
                                                                                    'light',
                                                                                )
                                                                            }
                                                                            className={cn(
                                                                                'flex size-6 cursor-pointer items-center justify-center rounded transition-colors',
                                                                                currentBackdrop ===
                                                                                    'light'
                                                                                    ? 'bg-white text-tijum-plum shadow-xs'
                                                                                    : 'text-white/75 hover:text-white',
                                                                            )}
                                                                        >
                                                                            <Sun className="size-3.5" />
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            title="Dark Plum Background"
                                                                            aria-label={`Dark backdrop for ${asset.title}`}
                                                                            aria-pressed={
                                                                                currentBackdrop ===
                                                                                'dark'
                                                                            }
                                                                            onClick={() =>
                                                                                setAssetBackdrop(
                                                                                    asset.id,
                                                                                    'dark',
                                                                                )
                                                                            }
                                                                            className={cn(
                                                                                'flex size-6 cursor-pointer items-center justify-center rounded transition-colors',
                                                                                currentBackdrop ===
                                                                                    'dark'
                                                                                    ? 'bg-tijum-coral text-white shadow-xs'
                                                                                    : 'text-white/75 hover:text-white',
                                                                            )}
                                                                        >
                                                                            <Moon className="size-3.5" />
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            title="Checkerboard Transparency Grid"
                                                                            aria-label={`Checkerboard backdrop for ${asset.title}`}
                                                                            aria-pressed={
                                                                                currentBackdrop ===
                                                                                'checker'
                                                                            }
                                                                            onClick={() =>
                                                                                setAssetBackdrop(
                                                                                    asset.id,
                                                                                    'checker',
                                                                                )
                                                                            }
                                                                            className={cn(
                                                                                'flex size-6 cursor-pointer items-center justify-center rounded transition-colors',
                                                                                currentBackdrop ===
                                                                                    'checker'
                                                                                    ? 'bg-white/25 text-white shadow-xs'
                                                                                    : 'text-white/75 hover:text-white',
                                                                            )}
                                                                        >
                                                                            <Grid className="size-3.5" />
                                                                        </button>
                                                                    </div>
                                                                )}

                                                                <div
                                                                    className={cn(
                                                                        'flex h-36 w-full items-center justify-center p-4 transition-colors',
                                                                        getBackdropClasses(
                                                                            currentBackdrop,
                                                                        ),
                                                                    )}
                                                                >
                                                                    {showImage ? (
                                                                        <img
                                                                            src={
                                                                                currentUrl
                                                                            }
                                                                            alt={
                                                                                asset.title
                                                                            }
                                                                            className="max-h-24 max-w-full object-contain drop-shadow-xs"
                                                                            onError={() =>
                                                                                setBrokenAssets(
                                                                                    (
                                                                                        prev,
                                                                                    ) => ({
                                                                                        ...prev,
                                                                                        [asset.id]: true,
                                                                                    }),
                                                                                )
                                                                            }
                                                                        />
                                                                    ) : (
                                                                        <div className="flex flex-col items-center justify-center text-center">
                                                                            <div className="mb-1.5 flex size-10 items-center justify-center rounded-xl border border-tijum-surface/80 bg-tijum-cream text-tijum-plum-muted dark:border-border dark:bg-card dark:text-muted-foreground">
                                                                                <ImageIcon className="size-5" />
                                                                            </div>
                                                                            <span
                                                                                className={cn(
                                                                                    'text-xs font-semibold',
                                                                                    currentBackdrop ===
                                                                                        'dark'
                                                                                        ? 'text-tijum-cream'
                                                                                        : 'text-tijum-plum',
                                                                                )}
                                                                            >
                                                                                {currentUrl
                                                                                    ? 'Asset Preview Unavailable'
                                                                                    : 'No Asset Configured'}
                                                                            </span>
                                                                            <span
                                                                                className={cn(
                                                                                    'mt-0.5 max-w-xs text-[10px]',
                                                                                    currentBackdrop ===
                                                                                        'dark'
                                                                                        ? 'text-tijum-cream/75'
                                                                                        : 'text-tijum-plum-muted',
                                                                                )}
                                                                            >
                                                                                {
                                                                                    asset.spec
                                                                                }
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <p className="mb-3 flex items-center gap-1.5 text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                                                <Info
                                                                    className="size-3.5 shrink-0 text-tijum-coral"
                                                                    aria-hidden="true"
                                                                />
                                                                <span>
                                                                    {asset.spec}
                                                                </span>
                                                            </p>
                                                        </div>

                                                        {/* Upload Button & Manual URL Input */}
                                                        <div className="space-y-3 border-t border-tijum-surface/70 pt-3 dark:border-border">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <input
                                                                    type="file"
                                                                    id={`file-input-${asset.id}`}
                                                                    accept={
                                                                        asset.accept
                                                                    }
                                                                    className="hidden"
                                                                    onChange={(
                                                                        e,
                                                                    ) => {
                                                                        const file =
                                                                            e
                                                                                .target
                                                                                .files?.[0];
                                                                        if (
                                                                            file
                                                                        ) {
                                                                            void handleUploadAsset(
                                                                                asset.id,
                                                                                file,
                                                                            );
                                                                            e.target.value =
                                                                                '';
                                                                        }
                                                                    }}
                                                                />
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    disabled={
                                                                        isUploading
                                                                    }
                                                                    onClick={() =>
                                                                        document
                                                                            .getElementById(
                                                                                `file-input-${asset.id}`,
                                                                            )
                                                                            ?.click()
                                                                    }
                                                                    className="h-9 cursor-pointer text-xs"
                                                                >
                                                                    {isUploading ? (
                                                                        <>
                                                                            <Loader2 className="size-3.5 animate-spin" />
                                                                            <span>
                                                                                Uploading...
                                                                            </span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Upload className="size-3.5" />
                                                                            <span>
                                                                                Upload
                                                                                File
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                </Button>

                                                                {currentUrl && (
                                                                    <>
                                                                        <Button
                                                                            type="button"
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() =>
                                                                                setPreviewAsset(
                                                                                    asset,
                                                                                )
                                                                            }
                                                                            className="h-9 cursor-pointer text-xs"
                                                                        >
                                                                            <Maximize2 className="size-3.5" />
                                                                            <span>
                                                                                Inspect
                                                                            </span>
                                                                        </Button>
                                                                        <Button
                                                                            asChild
                                                                            variant="outline"
                                                                            size="sm"
                                                                            className="h-9 text-xs"
                                                                        >
                                                                            <a
                                                                                href={
                                                                                    currentUrl
                                                                                }
                                                                                target="_blank"
                                                                                rel="noreferrer"
                                                                            >
                                                                                <ExternalLink className="size-3.5" />
                                                                                <span>
                                                                                    Preview
                                                                                    Full
                                                                                </span>
                                                                            </a>
                                                                        </Button>
                                                                    </>
                                                                )}
                                                            </div>

                                                            <div className="space-y-1.5">
                                                                <Label
                                                                    htmlFor={
                                                                        asset.field
                                                                    }
                                                                    className="text-[10px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground"
                                                                >
                                                                    Direct Path
                                                                    / URL
                                                                </Label>
                                                                <Input
                                                                    id={
                                                                        asset.field
                                                                    }
                                                                    value={
                                                                        brandForm
                                                                            .data[
                                                                            asset
                                                                                .field
                                                                        ]
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) => {
                                                                        brandForm.setData(
                                                                            asset.field,
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        );
                                                                        setBrokenAssets(
                                                                            (
                                                                                prev,
                                                                            ) => ({
                                                                                ...prev,
                                                                                [asset.id]: false,
                                                                            }),
                                                                        );
                                                                    }}
                                                                    placeholder={`/images/brand/${asset.id}.svg`}
                                                                    className="h-9 font-mono text-xs"
                                                                />
                                                                <InputError
                                                                    message={
                                                                        brandForm
                                                                            .errors[
                                                                            asset
                                                                                .field
                                                                        ]
                                                                    }
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </CardContent>

                                <SectionCardFooter
                                    processing={brandForm.processing}
                                    isDirty={brandForm.isDirty}
                                    submitLabel="Save Brand Assets"
                                />
                            </form>
                        </Card>
                    </TabsContent>

                    {/* 3. SEO & Search Engines */}
                    <TabsContent value="seo">
                        <Card>
                            <form onSubmit={handleSeoSubmit}>
                                <SectionCardHeader
                                    icon={Search}
                                    title="SEO & Search Engine Configuration"
                                    description="Tune search engine indexing, default meta tags, OpenGraph attributes, and verification tokens."
                                />

                                <CardContent className="space-y-6 py-6">
                                    {/* Google SERP Preview Box */}
                                    <div className="rounded-2xl border border-tijum-surface/80 bg-tijum-cream/40 p-4 dark:border-border dark:bg-muted/45">
                                        <p className="mb-2.5 text-xs font-semibold text-tijum-plum-muted dark:text-muted-foreground">
                                            Google Search Preview (Desktop
                                            Simulator)
                                        </p>
                                        <div className="rounded-xl border border-tijum-surface/80 bg-white p-4 font-sans shadow-2xs dark:border-border dark:bg-card">
                                            <p className="truncate text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                {
                                                    seoForm.data
                                                        .canonical_url_base
                                                }{' '}
                                                › stays › hostels
                                            </p>
                                            <h4 className="mt-1 cursor-pointer truncate text-base font-medium text-blue-700 hover:underline dark:text-sky-400">
                                                {
                                                    seoForm.data
                                                        .default_meta_title
                                                }
                                            </h4>
                                            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-tijum-plum-muted dark:text-muted-foreground">
                                                {
                                                    seoForm.data
                                                        .default_meta_description
                                                }
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                        <div className="space-y-2 sm:col-span-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <Label htmlFor="default_meta_title">
                                                    Default Global Title Tag
                                                </Label>
                                                <span className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                                    {
                                                        seoForm.data
                                                            .default_meta_title
                                                            .length
                                                    }{' '}
                                                    / 150 chars
                                                </span>
                                            </div>
                                            <Input
                                                id="default_meta_title"
                                                value={
                                                    seoForm.data
                                                        .default_meta_title
                                                }
                                                onChange={(e) =>
                                                    seoForm.setData(
                                                        'default_meta_title',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="TIJUM | Verified Stays, Hostels & Student Accommodations in India"
                                                required
                                            />
                                            <InputError
                                                message={
                                                    seoForm.errors
                                                        .default_meta_title
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2 sm:col-span-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <Label htmlFor="default_meta_description">
                                                    Default Global Meta
                                                    Description
                                                </Label>
                                                <span className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                                    {
                                                        seoForm.data
                                                            .default_meta_description
                                                            .length
                                                    }{' '}
                                                    / 300 chars
                                                </span>
                                            </div>
                                            <Textarea
                                                id="default_meta_description"
                                                rows={2}
                                                value={
                                                    seoForm.data
                                                        .default_meta_description
                                                }
                                                onChange={(e) =>
                                                    seoForm.setData(
                                                        'default_meta_description',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Discover verified hostels, PGs, and apartments across India with zero hidden charges..."
                                                required
                                            />
                                            <InputError
                                                message={
                                                    seoForm.errors
                                                        .default_meta_description
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="canonical_url_base">
                                                Canonical Base URL
                                            </Label>
                                            <Input
                                                id="canonical_url_base"
                                                type="url"
                                                value={
                                                    seoForm.data
                                                        .canonical_url_base
                                                }
                                                onChange={(e) =>
                                                    seoForm.setData(
                                                        'canonical_url_base',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="https://tijum.com"
                                                required
                                            />
                                            <InputError
                                                message={
                                                    seoForm.errors
                                                        .canonical_url_base
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="og_site_name">
                                                OpenGraph Site Name
                                            </Label>
                                            <Input
                                                id="og_site_name"
                                                value={
                                                    seoForm.data.og_site_name
                                                }
                                                onChange={(e) =>
                                                    seoForm.setData(
                                                        'og_site_name',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="TIJUM Accommodations"
                                                required
                                            />
                                            <InputError
                                                message={
                                                    seoForm.errors.og_site_name
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="twitter_handle">
                                                Twitter / X Handle
                                            </Label>
                                            <Input
                                                id="twitter_handle"
                                                value={
                                                    seoForm.data.twitter_handle
                                                }
                                                onChange={(e) =>
                                                    seoForm.setData(
                                                        'twitter_handle',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="@tijum_stays"
                                            />
                                            <InputError
                                                message={
                                                    seoForm.errors
                                                        .twitter_handle
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="robots_directive">
                                                Robots.txt Directive
                                            </Label>
                                            <Input
                                                id="robots_directive"
                                                value={
                                                    seoForm.data
                                                        .robots_directive
                                                }
                                                onChange={(e) =>
                                                    seoForm.setData(
                                                        'robots_directive',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="index, follow, max-image-preview:large"
                                                required
                                            />
                                            <InputError
                                                message={
                                                    seoForm.errors
                                                        .robots_directive
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="google_site_verification">
                                                Google Search Console
                                                Verification Token
                                            </Label>
                                            <Input
                                                id="google_site_verification"
                                                value={
                                                    seoForm.data
                                                        .google_site_verification
                                                }
                                                onChange={(e) =>
                                                    seoForm.setData(
                                                        'google_site_verification',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="google-site-verification=abcdef123456"
                                            />
                                            <InputError
                                                message={
                                                    seoForm.errors
                                                        .google_site_verification
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="bing_site_verification">
                                                Bing Webmaster Verification
                                                Token
                                            </Label>
                                            <Input
                                                id="bing_site_verification"
                                                value={
                                                    seoForm.data
                                                        .bing_site_verification
                                                }
                                                onChange={(e) =>
                                                    seoForm.setData(
                                                        'bing_site_verification',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="MSN verification token"
                                            />
                                            <InputError
                                                message={
                                                    seoForm.errors
                                                        .bing_site_verification
                                                }
                                            />
                                        </div>
                                    </div>

                                    <SettingSwitchRow
                                        id="sitemap_enabled"
                                        title="Dynamic XML Sitemap Generation"
                                        description="Automatically index verified properties, city hubs, and CMS guides."
                                        checked={seoForm.data.sitemap_enabled}
                                        onCheckedChange={(checked) =>
                                            seoForm.setData(
                                                'sitemap_enabled',
                                                checked,
                                            )
                                        }
                                        icon={Globe}
                                    />
                                </CardContent>

                                <SectionCardFooter
                                    processing={seoForm.processing}
                                    isDirty={seoForm.isDirty}
                                    submitLabel="Save SEO Settings"
                                />
                            </form>
                        </Card>
                    </TabsContent>

                    {/* 4. API & Third-Party Integrations */}
                    <TabsContent value="integrations">
                        <Card>
                            <form onSubmit={handleIntegrationsSubmit}>
                                <SectionCardHeader
                                    icon={Key}
                                    title="API & Third-Party Integrations"
                                    description="Configure payment gateways, Meta WhatsApp Cloud API, DLT SMS services, and mapping endpoints."
                                    action={
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                setShowSecrets(!showSecrets)
                                            }
                                            className="text-xs"
                                        >
                                            {showSecrets ? (
                                                <EyeOff className="size-3.5" />
                                            ) : (
                                                <Eye className="size-3.5" />
                                            )}
                                            <span>
                                                {showSecrets
                                                    ? 'Mask Secrets'
                                                    : 'Reveal Encrypted Status'}
                                            </span>
                                        </Button>
                                    }
                                />

                                <CardContent className="space-y-6 py-6">
                                    {/* Razorpay Integration Block */}
                                    <div className="space-y-4 rounded-2xl border border-tijum-surface/80 bg-tijum-cream/25 p-5 dark:border-border dark:bg-muted/35">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-status-info-border bg-status-info-bg text-status-info-fg">
                                                    <CreditCard
                                                        className="size-5"
                                                        aria-hidden="true"
                                                    />
                                                </span>
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h4 className="font-heading text-sm font-bold text-tijum-plum dark:text-foreground">
                                                            Razorpay Payment
                                                            Gateway
                                                        </h4>
                                                        <StatusBadge
                                                            status={
                                                                integrationsForm
                                                                    .data
                                                                    .razorpay_mode ===
                                                                'live'
                                                                    ? 'active'
                                                                    : 'pending'
                                                            }
                                                            label={
                                                                integrationsForm
                                                                    .data
                                                                    .razorpay_mode ===
                                                                'live'
                                                                    ? 'Production'
                                                                    : 'Sandbox'
                                                            }
                                                        />
                                                    </div>
                                                    <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                        Collects customer
                                                        reservation payments
                                                        &amp; disburses partner
                                                        settlements.
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                disabled={
                                                    testingIntegration ===
                                                    'razorpay'
                                                }
                                                onClick={() =>
                                                    runTestConnection(
                                                        'razorpay',
                                                    )
                                                }
                                                className="text-xs"
                                            >
                                                <Activity
                                                    className={cn(
                                                        'size-3.5',
                                                        testingIntegration ===
                                                            'razorpay' &&
                                                            'animate-spin',
                                                    )}
                                                />
                                                <span>Test Connection</span>
                                            </Button>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label htmlFor="razorpay_mode">
                                                    Environment Mode
                                                </Label>
                                                <Select
                                                    value={
                                                        integrationsForm.data
                                                            .razorpay_mode
                                                    }
                                                    onValueChange={(v) =>
                                                        integrationsForm.setData(
                                                            'razorpay_mode',
                                                            v,
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger
                                                        id="razorpay_mode"
                                                        className="w-full"
                                                    >
                                                        <SelectValue placeholder="Select mode" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="sandbox">
                                                            Sandbox / Test
                                                        </SelectItem>
                                                        <SelectItem value="live">
                                                            Production / Live
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <InputError
                                                    message={
                                                        integrationsForm.errors
                                                            .razorpay_mode
                                                    }
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="razorpay_key_id">
                                                    Razorpay Public Key ID
                                                </Label>
                                                <Input
                                                    id="razorpay_key_id"
                                                    value={
                                                        integrationsForm.data
                                                            .razorpay_key_id
                                                    }
                                                    onChange={(e) =>
                                                        integrationsForm.setData(
                                                            'razorpay_key_id',
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="rzp_test_..."
                                                    className="font-mono text-xs"
                                                    required
                                                />
                                                <InputError
                                                    message={
                                                        integrationsForm.errors
                                                            .razorpay_key_id
                                                    }
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="razorpay_key_secret">
                                                    Key Secret
                                                    {settings.integrations
                                                        .has_razorpay_secret && (
                                                        <span className="ml-2 font-mono text-[11px] font-normal text-status-success-fg tabular-nums">
                                                            (Encrypted:{' '}
                                                            {
                                                                settings
                                                                    .integrations
                                                                    .razorpay_key_secret_masked
                                                            }
                                                            )
                                                        </span>
                                                    )}
                                                </Label>
                                                <Input
                                                    id="razorpay_key_secret"
                                                    type={
                                                        showSecrets
                                                            ? 'text'
                                                            : 'password'
                                                    }
                                                    value={
                                                        integrationsForm.data
                                                            .razorpay_key_secret
                                                    }
                                                    onChange={(e) =>
                                                        integrationsForm.setData(
                                                            'razorpay_key_secret',
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder={
                                                        settings.integrations
                                                            .has_razorpay_secret
                                                            ? 'Leave blank to preserve current secret'
                                                            : 'Enter Razorpay Secret'
                                                    }
                                                />
                                                <InputError
                                                    message={
                                                        integrationsForm.errors
                                                            .razorpay_key_secret
                                                    }
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="razorpay_webhook_secret">
                                                    Webhook Signing Secret
                                                    {settings.integrations
                                                        .razorpay_webhook_secret_masked && (
                                                        <span className="ml-2 font-mono text-[11px] font-normal text-status-success-fg tabular-nums">
                                                            (Encrypted:{' '}
                                                            {
                                                                settings
                                                                    .integrations
                                                                    .razorpay_webhook_secret_masked
                                                            }
                                                            )
                                                        </span>
                                                    )}
                                                </Label>
                                                <Input
                                                    id="razorpay_webhook_secret"
                                                    type={
                                                        showSecrets
                                                            ? 'text'
                                                            : 'password'
                                                    }
                                                    value={
                                                        integrationsForm.data
                                                            .razorpay_webhook_secret
                                                    }
                                                    onChange={(e) =>
                                                        integrationsForm.setData(
                                                            'razorpay_webhook_secret',
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder={
                                                        settings.integrations
                                                            .razorpay_webhook_secret_masked
                                                            ? 'Leave blank to preserve current secret'
                                                            : 'Enter Webhook Secret'
                                                    }
                                                />
                                                <InputError
                                                    message={
                                                        integrationsForm.errors
                                                            .razorpay_webhook_secret
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Meta WhatsApp Cloud API Block */}
                                    <div className="space-y-4 rounded-2xl border border-tijum-surface/80 bg-tijum-cream/25 p-5 dark:border-border dark:bg-muted/35">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-status-success-border bg-status-success-bg text-status-success-fg">
                                                    <MessageSquare
                                                        className="size-5"
                                                        aria-hidden="true"
                                                    />
                                                </span>
                                                <div>
                                                    <h4 className="font-heading text-sm font-bold text-tijum-plum dark:text-foreground">
                                                        Meta WhatsApp Cloud API
                                                    </h4>
                                                    <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                        Delivers booking
                                                        vouchers, check-in OTPs,
                                                        and partner alert
                                                        templates.
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                disabled={
                                                    testingIntegration ===
                                                    'whatsapp'
                                                }
                                                onClick={() =>
                                                    runTestConnection(
                                                        'whatsapp',
                                                    )
                                                }
                                                className="text-xs"
                                            >
                                                <Activity
                                                    className={cn(
                                                        'size-3.5',
                                                        testingIntegration ===
                                                            'whatsapp' &&
                                                            'animate-spin',
                                                    )}
                                                />
                                                <span>Ping Meta Cloud API</span>
                                            </Button>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                            <div className="space-y-2">
                                                <Label htmlFor="whatsapp_phone_number_id">
                                                    Phone Number ID
                                                </Label>
                                                <Input
                                                    id="whatsapp_phone_number_id"
                                                    value={
                                                        integrationsForm.data
                                                            .whatsapp_phone_number_id
                                                    }
                                                    onChange={(e) =>
                                                        integrationsForm.setData(
                                                            'whatsapp_phone_number_id',
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="e.g. 104829103982"
                                                    className="font-mono text-xs tabular-nums"
                                                />
                                                <InputError
                                                    message={
                                                        integrationsForm.errors
                                                            .whatsapp_phone_number_id
                                                    }
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="whatsapp_business_account_id">
                                                    Business Account ID (WABA)
                                                </Label>
                                                <Input
                                                    id="whatsapp_business_account_id"
                                                    value={
                                                        integrationsForm.data
                                                            .whatsapp_business_account_id
                                                    }
                                                    onChange={(e) =>
                                                        integrationsForm.setData(
                                                            'whatsapp_business_account_id',
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="e.g. 982348912389"
                                                    className="font-mono text-xs tabular-nums"
                                                />
                                                <InputError
                                                    message={
                                                        integrationsForm.errors
                                                            .whatsapp_business_account_id
                                                    }
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="whatsapp_access_token">
                                                    Permanent Access Token
                                                    {settings.integrations
                                                        .has_whatsapp_token && (
                                                        <span className="ml-2 font-mono text-[11px] font-normal text-status-success-fg">
                                                            (Saved{' '}
                                                            {
                                                                settings
                                                                    .integrations
                                                                    .whatsapp_access_token_masked
                                                            }
                                                            )
                                                        </span>
                                                    )}
                                                </Label>
                                                <Input
                                                    id="whatsapp_access_token"
                                                    type={
                                                        showSecrets
                                                            ? 'text'
                                                            : 'password'
                                                    }
                                                    value={
                                                        integrationsForm.data
                                                            .whatsapp_access_token
                                                    }
                                                    onChange={(e) =>
                                                        integrationsForm.setData(
                                                            'whatsapp_access_token',
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder={
                                                        settings.integrations
                                                            .has_whatsapp_token
                                                            ? 'Leave blank to preserve token'
                                                            : 'EAAG...'
                                                    }
                                                />
                                                <InputError
                                                    message={
                                                        integrationsForm.errors
                                                            .whatsapp_access_token
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* SMS Gateway (DLT) Block */}
                                    <div className="space-y-4 rounded-2xl border border-tijum-surface/80 bg-tijum-cream/25 p-5 dark:border-border dark:bg-muted/35">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15 dark:text-tijum-coral">
                                                    <Smartphone
                                                        className="size-5"
                                                        aria-hidden="true"
                                                    />
                                                </span>
                                                <div>
                                                    <h4 className="font-heading text-sm font-bold text-tijum-plum dark:text-foreground">
                                                        DLT Approved SMS Gateway
                                                    </h4>
                                                    <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                        TRAI-compliant
                                                        transactional SMS for
                                                        booking confirmations
                                                        and logins.
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                disabled={
                                                    testingIntegration === 'sms'
                                                }
                                                onClick={() =>
                                                    runTestConnection('sms')
                                                }
                                                className="text-xs"
                                            >
                                                <Activity
                                                    className={cn(
                                                        'size-3.5',
                                                        testingIntegration ===
                                                            'sms' &&
                                                            'animate-spin',
                                                    )}
                                                />
                                                <span>Verify DLT Config</span>
                                            </Button>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                            <div className="space-y-2">
                                                <Label htmlFor="sms_provider">
                                                    SMS Provider Gateway
                                                </Label>
                                                <Input
                                                    id="sms_provider"
                                                    value={
                                                        integrationsForm.data
                                                            .sms_provider
                                                    }
                                                    onChange={(e) =>
                                                        integrationsForm.setData(
                                                            'sms_provider',
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="msg91"
                                                    required
                                                />
                                                <InputError
                                                    message={
                                                        integrationsForm.errors
                                                            .sms_provider
                                                    }
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="sms_sender_id">
                                                    DLT Sender ID (Header)
                                                </Label>
                                                <Input
                                                    id="sms_sender_id"
                                                    value={
                                                        integrationsForm.data
                                                            .sms_sender_id
                                                    }
                                                    onChange={(e) =>
                                                        integrationsForm.setData(
                                                            'sms_sender_id',
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="TIJUMS"
                                                    maxLength={6}
                                                    className="font-mono uppercase"
                                                    required
                                                />
                                                <InputError
                                                    message={
                                                        integrationsForm.errors
                                                            .sms_sender_id
                                                    }
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="sms_auth_key">
                                                    Auth Key
                                                    {settings.integrations
                                                        .has_sms_key && (
                                                        <span className="ml-2 font-mono text-[11px] font-normal text-status-success-fg">
                                                            (Saved{' '}
                                                            {
                                                                settings
                                                                    .integrations
                                                                    .sms_auth_key_masked
                                                            }
                                                            )
                                                        </span>
                                                    )}
                                                </Label>
                                                <Input
                                                    id="sms_auth_key"
                                                    type={
                                                        showSecrets
                                                            ? 'text'
                                                            : 'password'
                                                    }
                                                    value={
                                                        integrationsForm.data
                                                            .sms_auth_key
                                                    }
                                                    onChange={(e) =>
                                                        integrationsForm.setData(
                                                            'sms_auth_key',
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder={
                                                        settings.integrations
                                                            .has_sms_key
                                                            ? 'Leave blank to preserve auth key'
                                                            : 'Enter SMS Auth Key'
                                                    }
                                                />
                                                <InputError
                                                    message={
                                                        integrationsForm.errors
                                                            .sms_auth_key
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Maps & Mobile Push Infrastructure Block */}
                                    <div className="space-y-4 rounded-2xl border border-tijum-surface/80 bg-tijum-cream/25 p-5 dark:border-border dark:bg-muted/35">
                                        <div className="flex items-center gap-3">
                                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-tijum-surface/80 bg-tijum-cream text-tijum-plum dark:border-border dark:bg-card dark:text-foreground">
                                                <MapPin
                                                    className="size-5"
                                                    aria-hidden="true"
                                                />
                                            </span>
                                            <div>
                                                <h4 className="font-heading text-sm font-bold text-tijum-plum dark:text-foreground">
                                                    Maps &amp; Mobile Push
                                                    Infrastructure
                                                </h4>
                                                <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                    Encrypted API credentials
                                                    for property geolocation
                                                    autocomplete and Expo push
                                                    dispatch.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label htmlFor="google_maps_api_key">
                                                    Google Maps API Key
                                                    {settings.integrations
                                                        .google_maps_api_key_masked && (
                                                        <span className="ml-2 font-mono text-[11px] font-normal text-status-success-fg tabular-nums">
                                                            (Encrypted:{' '}
                                                            {
                                                                settings
                                                                    .integrations
                                                                    .google_maps_api_key_masked
                                                            }
                                                            )
                                                        </span>
                                                    )}
                                                </Label>
                                                <Input
                                                    id="google_maps_api_key"
                                                    type={
                                                        showSecrets
                                                            ? 'text'
                                                            : 'password'
                                                    }
                                                    value={
                                                        integrationsForm.data
                                                            .google_maps_api_key
                                                    }
                                                    onChange={(e) =>
                                                        integrationsForm.setData(
                                                            'google_maps_api_key',
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder={
                                                        settings.integrations
                                                            .google_maps_api_key_masked
                                                            ? 'Leave blank to preserve Maps API key'
                                                            : 'Enter restricted Google Maps API key'
                                                    }
                                                />
                                                <InputError
                                                    message={
                                                        integrationsForm.errors
                                                            .google_maps_api_key
                                                    }
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="expo_access_token">
                                                    Expo Push Access Token
                                                    {settings.integrations
                                                        .expo_access_token_masked && (
                                                        <span className="ml-2 font-mono text-[11px] font-normal text-status-success-fg tabular-nums">
                                                            (Encrypted:{' '}
                                                            {
                                                                settings
                                                                    .integrations
                                                                    .expo_access_token_masked
                                                            }
                                                            )
                                                        </span>
                                                    )}
                                                </Label>
                                                <Input
                                                    id="expo_access_token"
                                                    type={
                                                        showSecrets
                                                            ? 'text'
                                                            : 'password'
                                                    }
                                                    value={
                                                        integrationsForm.data
                                                            .expo_access_token
                                                    }
                                                    onChange={(e) =>
                                                        integrationsForm.setData(
                                                            'expo_access_token',
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder={
                                                        settings.integrations
                                                            .expo_access_token_masked
                                                            ? 'Leave blank to preserve Expo token'
                                                            : 'Enter Expo bearer token'
                                                    }
                                                />
                                                <InputError
                                                    message={
                                                        integrationsForm.errors
                                                            .expo_access_token
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>

                                <SectionCardFooter
                                    processing={integrationsForm.processing}
                                    isDirty={integrationsForm.isDirty}
                                    submitLabel="Save & Encrypt Credentials"
                                />
                            </form>
                        </Card>
                    </TabsContent>

                    {/* 5. Operational Timings (Preserved) */}
                    <TabsContent value="timings">
                        <Card>
                            <form onSubmit={handleTimingsSubmit}>
                                <SectionCardHeader
                                    icon={Clock}
                                    title="Operational Timings & Reservation Hold"
                                    description="Platform-wide check-in / check-out windows and reservation checkout hold timeout."
                                />

                                <CardContent className="space-y-6 py-6">
                                    <div className="rounded-2xl border border-tijum-surface/80 bg-tijum-cream/40 p-4 dark:border-border dark:bg-muted/45">
                                        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                                            <span className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                                                Active Guest Window Summary
                                            </span>
                                            <div className="flex flex-wrap items-center gap-2 font-mono tabular-nums">
                                                <Badge variant="outline">
                                                    Early:{' '}
                                                    {
                                                        timingsForm.data
                                                            .earliest_early_check_in_time
                                                    }
                                                </Badge>
                                                <Badge variant="default">
                                                    Check-In:{' '}
                                                    {
                                                        timingsForm.data
                                                            .check_in_time
                                                    }
                                                </Badge>
                                                <Badge variant="secondary">
                                                    Check-Out:{' '}
                                                    {
                                                        timingsForm.data
                                                            .check_out_time
                                                    }
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="check_in_time">
                                                Standard Check-In Time
                                            </Label>
                                            <Input
                                                id="check_in_time"
                                                value={
                                                    timingsForm.data
                                                        .check_in_time
                                                }
                                                onChange={(e) =>
                                                    timingsForm.setData(
                                                        'check_in_time',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="09:00"
                                                className="font-mono tabular-nums"
                                                required
                                            />
                                            <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                Default time guest check-in
                                                begins on arrival date (HH:MM).
                                            </p>
                                            <InputError
                                                message={
                                                    timingsForm.errors
                                                        .check_in_time
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="check_out_time">
                                                Standard Check-Out Time
                                            </Label>
                                            <Input
                                                id="check_out_time"
                                                value={
                                                    timingsForm.data
                                                        .check_out_time
                                                }
                                                onChange={(e) =>
                                                    timingsForm.setData(
                                                        'check_out_time',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="08:00"
                                                className="font-mono tabular-nums"
                                                required
                                            />
                                            <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                Default time guest must vacate
                                                room on departure date (HH:MM).
                                            </p>
                                            <InputError
                                                message={
                                                    timingsForm.errors
                                                        .check_out_time
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="earliest_early_check_in_time">
                                                Earliest Permitted Early Arrival
                                            </Label>
                                            <Input
                                                id="earliest_early_check_in_time"
                                                value={
                                                    timingsForm.data
                                                        .earliest_early_check_in_time
                                                }
                                                onChange={(e) =>
                                                    timingsForm.setData(
                                                        'earliest_early_check_in_time',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="07:00"
                                                className="font-mono tabular-nums"
                                                required
                                            />
                                            <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                Subject to room availability at
                                                zero extra charge.
                                            </p>
                                            <InputError
                                                message={
                                                    timingsForm.errors
                                                        .earliest_early_check_in_time
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="checkout_expiry_minutes">
                                                Inventory Payment Hold Window
                                                (Minutes)
                                            </Label>
                                            <Input
                                                id="checkout_expiry_minutes"
                                                type="number"
                                                min={5}
                                                max={120}
                                                value={
                                                    timingsForm.data
                                                        .checkout_expiry_minutes
                                                }
                                                onChange={(e) =>
                                                    timingsForm.setData(
                                                        'checkout_expiry_minutes',
                                                        parseInt(
                                                            e.target.value,
                                                        ) || 15,
                                                    )
                                                }
                                                className="tabular-nums"
                                                required
                                            />
                                            <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                Authoritative booking inventory
                                                hold time before lock release
                                                (Standard: 15 min).
                                            </p>
                                            <InputError
                                                message={
                                                    timingsForm.errors
                                                        .checkout_expiry_minutes
                                                }
                                            />
                                        </div>
                                    </div>
                                </CardContent>

                                <SectionCardFooter
                                    processing={timingsForm.processing}
                                    isDirty={timingsForm.isDirty}
                                    submitLabel="Save Operational Timings"
                                />
                            </form>
                        </Card>
                    </TabsContent>

                    {/* 6. Financial & Tax Parameters (Preserved) */}
                    <TabsContent value="financial">
                        <Card>
                            <form onSubmit={handleFinancialSubmit}>
                                <SectionCardHeader
                                    icon={Receipt}
                                    title="Financial & Tax Parameters"
                                    description="Platform entity details, GSTIN, SAC codes, commission rates, and partner settlement parameters."
                                />

                                <CardContent className="space-y-6 py-6">
                                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="fin_platform_legal_name">
                                                Platform Legal Entity Name
                                            </Label>
                                            <Input
                                                id="fin_platform_legal_name"
                                                value={
                                                    financialForm.data
                                                        .platform_legal_name
                                                }
                                                onChange={(e) =>
                                                    financialForm.setData(
                                                        'platform_legal_name',
                                                        e.target.value,
                                                    )
                                                }
                                                required
                                            />
                                            <InputError
                                                message={
                                                    financialForm.errors
                                                        .platform_legal_name
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="platform_gstin">
                                                Platform GSTIN
                                            </Label>
                                            <Input
                                                id="platform_gstin"
                                                value={
                                                    financialForm.data
                                                        .platform_gstin
                                                }
                                                onChange={(e) =>
                                                    financialForm.setData(
                                                        'platform_gstin',
                                                        e.target.value.toUpperCase(),
                                                    )
                                                }
                                                placeholder="36AAAAA0000A1Z5"
                                                className="font-mono uppercase tabular-nums"
                                                required
                                            />
                                            <InputError
                                                message={
                                                    financialForm.errors
                                                        .platform_gstin
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="platform_sac_code">
                                                Service Accounting Code (SAC)
                                            </Label>
                                            <Input
                                                id="platform_sac_code"
                                                value={
                                                    financialForm.data
                                                        .platform_sac_code
                                                }
                                                onChange={(e) =>
                                                    financialForm.setData(
                                                        'platform_sac_code',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="998552"
                                                className="font-mono tabular-nums"
                                                required
                                            />
                                            <InputError
                                                message={
                                                    financialForm.errors
                                                        .platform_sac_code
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="default_commission_rate_bps">
                                                Default Commission Rate (BPS)
                                            </Label>
                                            <div className="flex items-center gap-3">
                                                <Input
                                                    id="default_commission_rate_bps"
                                                    type="number"
                                                    min={0}
                                                    max={5000}
                                                    value={
                                                        financialForm.data
                                                            .default_commission_rate_bps
                                                    }
                                                    onChange={(e) =>
                                                        financialForm.setData(
                                                            'default_commission_rate_bps',
                                                            parseInt(
                                                                e.target.value,
                                                            ) || 0,
                                                        )
                                                    }
                                                    className="tabular-nums"
                                                    required
                                                />
                                                <span className="shrink-0 rounded-xl border border-tijum-surface/80 bg-tijum-cream/60 px-3 py-2 font-mono text-xs font-semibold whitespace-nowrap text-tijum-plum tabular-nums dark:border-border dark:bg-muted dark:text-foreground">
                                                    ={' '}
                                                    {(
                                                        financialForm.data
                                                            .default_commission_rate_bps /
                                                        100
                                                    ).toFixed(2)}
                                                    %
                                                </span>
                                            </div>
                                            <InputError
                                                message={
                                                    financialForm.errors
                                                        .default_commission_rate_bps
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="commission_gst_rate_bps">
                                                GST on Commission Rate (BPS)
                                            </Label>
                                            <div className="flex items-center gap-3">
                                                <Input
                                                    id="commission_gst_rate_bps"
                                                    type="number"
                                                    min={0}
                                                    max={2800}
                                                    value={
                                                        financialForm.data
                                                            .commission_gst_rate_bps
                                                    }
                                                    onChange={(e) =>
                                                        financialForm.setData(
                                                            'commission_gst_rate_bps',
                                                            parseInt(
                                                                e.target.value,
                                                            ) || 0,
                                                        )
                                                    }
                                                    className="tabular-nums"
                                                    required
                                                />
                                                <span className="shrink-0 rounded-xl border border-tijum-surface/80 bg-tijum-cream/60 px-3 py-2 font-mono text-xs font-semibold whitespace-nowrap text-tijum-plum tabular-nums dark:border-border dark:bg-muted dark:text-foreground">
                                                    ={' '}
                                                    {(
                                                        financialForm.data
                                                            .commission_gst_rate_bps /
                                                        100
                                                    ).toFixed(2)}
                                                    %
                                                </span>
                                            </div>
                                            <InputError
                                                message={
                                                    financialForm.errors
                                                        .commission_gst_rate_bps
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="default_tds_rate_bps">
                                                Section 194O TDS Rate (BPS)
                                            </Label>
                                            <div className="flex items-center gap-3">
                                                <Input
                                                    id="default_tds_rate_bps"
                                                    type="number"
                                                    min={0}
                                                    max={1000}
                                                    value={
                                                        financialForm.data
                                                            .default_tds_rate_bps
                                                    }
                                                    onChange={(e) =>
                                                        financialForm.setData(
                                                            'default_tds_rate_bps',
                                                            parseInt(
                                                                e.target.value,
                                                            ) || 0,
                                                        )
                                                    }
                                                    className="tabular-nums"
                                                    required
                                                />
                                                <span className="shrink-0 rounded-xl border border-tijum-surface/80 bg-tijum-cream/60 px-3 py-2 font-mono text-xs font-semibold whitespace-nowrap text-tijum-plum tabular-nums dark:border-border dark:bg-muted dark:text-foreground">
                                                    ={' '}
                                                    {(
                                                        financialForm.data
                                                            .default_tds_rate_bps /
                                                        100
                                                    ).toFixed(2)}
                                                    %
                                                </span>
                                            </div>
                                            <InputError
                                                message={
                                                    financialForm.errors
                                                        .default_tds_rate_bps
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2 sm:col-span-2">
                                            <Label htmlFor="hold_interval_hours">
                                                Settlement Payout Hold Window
                                                (Hours)
                                            </Label>
                                            <Input
                                                id="hold_interval_hours"
                                                type="number"
                                                min={0}
                                                max={168}
                                                value={
                                                    financialForm.data
                                                        .hold_interval_hours
                                                }
                                                onChange={(e) =>
                                                    financialForm.setData(
                                                        'hold_interval_hours',
                                                        parseInt(
                                                            e.target.value,
                                                        ) || 0,
                                                    )
                                                }
                                                className="tabular-nums"
                                                required
                                            />
                                            <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                Delay after check-in before
                                                partner funds become eligible
                                                for disbursement release.
                                            </p>
                                            <InputError
                                                message={
                                                    financialForm.errors
                                                        .hold_interval_hours
                                                }
                                            />
                                        </div>
                                    </div>
                                </CardContent>

                                <SectionCardFooter
                                    processing={financialForm.processing}
                                    isDirty={financialForm.isDirty}
                                    submitLabel="Save Financial & Tax Parameters"
                                />
                            </form>
                        </Card>
                    </TabsContent>

                    {/* 7. Grievance & SLA (Preserved) */}
                    <TabsContent value="grievance">
                        <Card>
                            <form onSubmit={handleGrievanceSubmit}>
                                <SectionCardHeader
                                    icon={Scale}
                                    title="Grievance Redressal & Consumer Protection"
                                    description="Statutory Nodal Grievance Officer details required under Indian Consumer Protection (E-Commerce) Rules."
                                />

                                <CardContent className="space-y-6 py-6">
                                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="officer_name">
                                                Grievance Officer Name
                                            </Label>
                                            <Input
                                                id="officer_name"
                                                value={
                                                    grievanceForm.data
                                                        .officer_name
                                                }
                                                onChange={(e) =>
                                                    grievanceForm.setData(
                                                        'officer_name',
                                                        e.target.value,
                                                    )
                                                }
                                                required
                                            />
                                            <InputError
                                                message={
                                                    grievanceForm.errors
                                                        .officer_name
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="officer_designation">
                                                Designation / Title
                                            </Label>
                                            <Input
                                                id="officer_designation"
                                                value={
                                                    grievanceForm.data
                                                        .officer_designation
                                                }
                                                onChange={(e) =>
                                                    grievanceForm.setData(
                                                        'officer_designation',
                                                        e.target.value,
                                                    )
                                                }
                                                required
                                            />
                                            <InputError
                                                message={
                                                    grievanceForm.errors
                                                        .officer_designation
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="officer_email">
                                                Contact Email
                                            </Label>
                                            <Input
                                                id="officer_email"
                                                type="email"
                                                value={
                                                    grievanceForm.data
                                                        .officer_email
                                                }
                                                onChange={(e) =>
                                                    grievanceForm.setData(
                                                        'officer_email',
                                                        e.target.value,
                                                    )
                                                }
                                                required
                                            />
                                            <InputError
                                                message={
                                                    grievanceForm.errors
                                                        .officer_email
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="officer_phone">
                                                Hotline Phone
                                            </Label>
                                            <Input
                                                id="officer_phone"
                                                value={
                                                    grievanceForm.data
                                                        .officer_phone
                                                }
                                                onChange={(e) =>
                                                    grievanceForm.setData(
                                                        'officer_phone',
                                                        e.target.value,
                                                    )
                                                }
                                                required
                                            />
                                            <InputError
                                                message={
                                                    grievanceForm.errors
                                                        .officer_phone
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2 sm:col-span-2">
                                            <Label htmlFor="officer_address">
                                                Official Office Address
                                            </Label>
                                            <Textarea
                                                id="officer_address"
                                                rows={2}
                                                value={
                                                    grievanceForm.data
                                                        .officer_address
                                                }
                                                onChange={(e) =>
                                                    grievanceForm.setData(
                                                        'officer_address',
                                                        e.target.value,
                                                    )
                                                }
                                                required
                                            />
                                            <InputError
                                                message={
                                                    grievanceForm.errors
                                                        .officer_address
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="sla_acknowledgement_hours">
                                                SLA Acknowledgement Window
                                                (Hours)
                                            </Label>
                                            <Input
                                                id="sla_acknowledgement_hours"
                                                type="number"
                                                min={1}
                                                max={168}
                                                value={
                                                    grievanceForm.data
                                                        .sla_acknowledgement_hours
                                                }
                                                onChange={(e) =>
                                                    grievanceForm.setData(
                                                        'sla_acknowledgement_hours',
                                                        parseInt(
                                                            e.target.value,
                                                        ) || 48,
                                                    )
                                                }
                                                className="tabular-nums"
                                                required
                                            />
                                            <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                Statutory requirement:
                                                Acknowledgement within 48 hours.
                                            </p>
                                            <InputError
                                                message={
                                                    grievanceForm.errors
                                                        .sla_acknowledgement_hours
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="sla_resolution_days">
                                                SLA Resolution Window (Days)
                                            </Label>
                                            <Input
                                                id="sla_resolution_days"
                                                type="number"
                                                min={1}
                                                max={90}
                                                value={
                                                    grievanceForm.data
                                                        .sla_resolution_days
                                                }
                                                onChange={(e) =>
                                                    grievanceForm.setData(
                                                        'sla_resolution_days',
                                                        parseInt(
                                                            e.target.value,
                                                        ) || 30,
                                                    )
                                                }
                                                className="tabular-nums"
                                                required
                                            />
                                            <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                Statutory requirement:
                                                Resolution within 30 days.
                                            </p>
                                            <InputError
                                                message={
                                                    grievanceForm.errors
                                                        .sla_resolution_days
                                                }
                                            />
                                        </div>
                                    </div>
                                </CardContent>

                                <SectionCardFooter
                                    processing={grievanceForm.processing}
                                    isDirty={grievanceForm.isDirty}
                                    submitLabel="Save Grievance Settings"
                                />
                            </form>
                        </Card>
                    </TabsContent>

                    {/* 8. Notification Channels (Preserved) */}
                    <TabsContent value="notifications">
                        <Card>
                            <form onSubmit={handleNotificationsSubmit}>
                                <SectionCardHeader
                                    icon={Bell}
                                    title="Notification Channels"
                                    description="Enable or disable real-time delivery channels across customer and partner applications."
                                />

                                <CardContent className="space-y-4 py-6">
                                    <SettingSwitchRow
                                        id="notification_in_app"
                                        title="In-App Notifications"
                                        description="Database notifications delivered inside customer, owner, and admin bells."
                                        checked={notificationsForm.data.in_app}
                                        onCheckedChange={(checked) =>
                                            notificationsForm.setData(
                                                'in_app',
                                                checked,
                                            )
                                        }
                                        icon={Bell}
                                        iconBadgeClassName="border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15 dark:text-tijum-coral"
                                    />

                                    <SettingSwitchRow
                                        id="notification_email"
                                        title="Transactional Email"
                                        description="Booking receipts, KYC status updates, and monthly partner statements."
                                        checked={notificationsForm.data.email}
                                        onCheckedChange={(checked) =>
                                            notificationsForm.setData(
                                                'email',
                                                checked,
                                            )
                                        }
                                        icon={Mail}
                                        iconBadgeClassName="border-status-info-border bg-status-info-bg text-status-info-fg"
                                    />

                                    <SettingSwitchRow
                                        id="notification_sms"
                                        title="SMS Alerts (MSG91 / DLT)"
                                        description="Transactional SMS for time-sensitive check-ins and emergency OTPs."
                                        checked={notificationsForm.data.sms}
                                        onCheckedChange={(checked) =>
                                            notificationsForm.setData(
                                                'sms',
                                                checked,
                                            )
                                        }
                                        icon={Smartphone}
                                        iconBadgeClassName="border-tijum-surface/80 bg-tijum-cream text-tijum-plum dark:border-border dark:bg-card dark:text-foreground"
                                    />

                                    <SettingSwitchRow
                                        id="notification_whatsapp"
                                        title="WhatsApp Notifications (Meta Cloud API)"
                                        description="Instant check-in passes, hostel map links, and real-time chat alerts."
                                        checked={
                                            notificationsForm.data.whatsapp
                                        }
                                        onCheckedChange={(checked) =>
                                            notificationsForm.setData(
                                                'whatsapp',
                                                checked,
                                            )
                                        }
                                        icon={MessageSquare}
                                        iconBadgeClassName="border-status-success-border bg-status-success-bg text-status-success-fg"
                                    />

                                    <SettingSwitchRow
                                        id="notification_push"
                                        title="Mobile Push Notifications (Expo)"
                                        description="Native push notifications dispatched to customer and partner mobile apps."
                                        checked={notificationsForm.data.push}
                                        onCheckedChange={(checked) =>
                                            notificationsForm.setData(
                                                'push',
                                                checked,
                                            )
                                        }
                                        icon={Radio}
                                        iconBadgeClassName="border-status-warning-border bg-status-warning-bg text-status-warning-fg"
                                    />
                                </CardContent>

                                <SectionCardFooter
                                    processing={notificationsForm.processing}
                                    isDirty={notificationsForm.isDirty}
                                    submitLabel="Save Notification Channels"
                                />
                            </form>
                        </Card>
                    </TabsContent>

                    {/* 9. Localization & Regional Settings */}
                    <TabsContent value="localization">
                        <Card>
                            <form onSubmit={handleLocalizationSubmit}>
                                <SectionCardHeader
                                    icon={Layers}
                                    title="Regional Localization & Formatting"
                                    description="Manage default operating timezone, currency codes, symbol displays, and date format standards."
                                />

                                <CardContent className="space-y-6 py-6">
                                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="timezone">
                                                Operating Timezone
                                            </Label>
                                            <Input
                                                id="timezone"
                                                value={
                                                    localizationForm.data
                                                        .timezone
                                                }
                                                onChange={(e) =>
                                                    localizationForm.setData(
                                                        'timezone',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Asia/Kolkata"
                                                required
                                            />
                                            <InputError
                                                message={
                                                    localizationForm.errors
                                                        .timezone
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="default_country">
                                                Operating Country
                                            </Label>
                                            <Input
                                                id="default_country"
                                                value={
                                                    localizationForm.data
                                                        .default_country
                                                }
                                                onChange={(e) =>
                                                    localizationForm.setData(
                                                        'default_country',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="India"
                                                required
                                            />
                                            <InputError
                                                message={
                                                    localizationForm.errors
                                                        .default_country
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="default_currency">
                                                ISO Currency Code
                                            </Label>
                                            <Input
                                                id="default_currency"
                                                value={
                                                    localizationForm.data
                                                        .default_currency
                                                }
                                                onChange={(e) =>
                                                    localizationForm.setData(
                                                        'default_currency',
                                                        e.target.value.toUpperCase(),
                                                    )
                                                }
                                                placeholder="INR"
                                                maxLength={3}
                                                className="font-mono uppercase"
                                                required
                                            />
                                            <InputError
                                                message={
                                                    localizationForm.errors
                                                        .default_currency
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="currency_symbol">
                                                Currency Display Symbol
                                            </Label>
                                            <Input
                                                id="currency_symbol"
                                                value={
                                                    localizationForm.data
                                                        .currency_symbol
                                                }
                                                onChange={(e) =>
                                                    localizationForm.setData(
                                                        'currency_symbol',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="₹"
                                                required
                                            />
                                            <InputError
                                                message={
                                                    localizationForm.errors
                                                        .currency_symbol
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="date_format">
                                                Standard Date Format
                                            </Label>
                                            <Input
                                                id="date_format"
                                                value={
                                                    localizationForm.data
                                                        .date_format
                                                }
                                                onChange={(e) =>
                                                    localizationForm.setData(
                                                        'date_format',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="DD/MM/YYYY"
                                                className="font-mono"
                                                required
                                            />
                                            <InputError
                                                message={
                                                    localizationForm.errors
                                                        .date_format
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="time_format">
                                                Standard Time Format
                                            </Label>
                                            <Select
                                                value={
                                                    localizationForm.data
                                                        .time_format
                                                }
                                                onValueChange={(v) =>
                                                    localizationForm.setData(
                                                        'time_format',
                                                        v,
                                                    )
                                                }
                                            >
                                                <SelectTrigger
                                                    id="time_format"
                                                    className="w-full"
                                                >
                                                    <SelectValue placeholder="Select format" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="12_hour">
                                                        12-Hour (09:00 AM)
                                                    </SelectItem>
                                                    <SelectItem value="24_hour">
                                                        24-Hour (09:00)
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <InputError
                                                message={
                                                    localizationForm.errors
                                                        .time_format
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="number_format">
                                                Number System
                                            </Label>
                                            <Input
                                                id="number_format"
                                                value={
                                                    localizationForm.data
                                                        .number_format
                                                }
                                                onChange={(e) =>
                                                    localizationForm.setData(
                                                        'number_format',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="indian_lakhs"
                                                required
                                            />
                                            <InputError
                                                message={
                                                    localizationForm.errors
                                                        .number_format
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="calling_code">
                                                Default Country Phone Code
                                            </Label>
                                            <Input
                                                id="calling_code"
                                                value={
                                                    localizationForm.data
                                                        .calling_code
                                                }
                                                onChange={(e) =>
                                                    localizationForm.setData(
                                                        'calling_code',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="+91"
                                                className="font-mono tabular-nums"
                                                required
                                            />
                                            <InputError
                                                message={
                                                    localizationForm.errors
                                                        .calling_code
                                                }
                                            />
                                        </div>
                                    </div>
                                </CardContent>

                                <SectionCardFooter
                                    processing={localizationForm.processing}
                                    isDirty={localizationForm.isDirty}
                                    submitLabel="Save Localization Settings"
                                />
                            </form>
                        </Card>
                    </TabsContent>

                    {/* 10. Security & Access Settings */}
                    <TabsContent value="security">
                        <Card>
                            <form onSubmit={handleSecuritySubmit}>
                                <SectionCardHeader
                                    icon={ShieldCheck}
                                    title="Security & Access Policies"
                                    description="Define session timeouts, failed login brute-force thresholds, admin 2FA enforcement, and API throttling."
                                />

                                <CardContent className="space-y-6 py-6">
                                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="session_timeout_minutes">
                                                Admin Inactivity Session Timeout
                                                (Minutes)
                                            </Label>
                                            <Input
                                                id="session_timeout_minutes"
                                                type="number"
                                                min={15}
                                                max={1440}
                                                value={
                                                    securityForm.data
                                                        .session_timeout_minutes
                                                }
                                                onChange={(e) =>
                                                    securityForm.setData(
                                                        'session_timeout_minutes',
                                                        parseInt(
                                                            e.target.value,
                                                        ) || 120,
                                                    )
                                                }
                                                className="tabular-nums"
                                                required
                                            />
                                            <InputError
                                                message={
                                                    securityForm.errors
                                                        .session_timeout_minutes
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="max_login_attempts">
                                                Max Failed Login Attempts Before
                                                Lockout
                                            </Label>
                                            <Input
                                                id="max_login_attempts"
                                                type="number"
                                                min={3}
                                                max={20}
                                                value={
                                                    securityForm.data
                                                        .max_login_attempts
                                                }
                                                onChange={(e) =>
                                                    securityForm.setData(
                                                        'max_login_attempts',
                                                        parseInt(
                                                            e.target.value,
                                                        ) || 5,
                                                    )
                                                }
                                                className="tabular-nums"
                                                required
                                            />
                                            <InputError
                                                message={
                                                    securityForm.errors
                                                        .max_login_attempts
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="lockout_duration_minutes">
                                                Account Lockout Cooldown
                                                (Minutes)
                                            </Label>
                                            <Input
                                                id="lockout_duration_minutes"
                                                type="number"
                                                min={5}
                                                max={120}
                                                value={
                                                    securityForm.data
                                                        .lockout_duration_minutes
                                                }
                                                onChange={(e) =>
                                                    securityForm.setData(
                                                        'lockout_duration_minutes',
                                                        parseInt(
                                                            e.target.value,
                                                        ) || 15,
                                                    )
                                                }
                                                className="tabular-nums"
                                                required
                                            />
                                            <InputError
                                                message={
                                                    securityForm.errors
                                                        .lockout_duration_minutes
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="api_rate_limit_per_minute">
                                                Public API Rate Limit (Requests
                                                / Min)
                                            </Label>
                                            <Input
                                                id="api_rate_limit_per_minute"
                                                type="number"
                                                min={10}
                                                max={600}
                                                value={
                                                    securityForm.data
                                                        .api_rate_limit_per_minute
                                                }
                                                onChange={(e) =>
                                                    securityForm.setData(
                                                        'api_rate_limit_per_minute',
                                                        parseInt(
                                                            e.target.value,
                                                        ) || 60,
                                                    )
                                                }
                                                className="tabular-nums"
                                                required
                                            />
                                            <InputError
                                                message={
                                                    securityForm.errors
                                                        .api_rate_limit_per_minute
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-1">
                                        <SettingSwitchRow
                                            id="enforce_admin_2fa"
                                            title="Enforce Two-Factor Authentication (2FA) for All Admins"
                                            description="Locks all administrative access until time-based OTP is verified."
                                            checked={
                                                securityForm.data
                                                    .enforce_admin_2fa
                                            }
                                            onCheckedChange={(checked) =>
                                                securityForm.setData(
                                                    'enforce_admin_2fa',
                                                    checked,
                                                )
                                            }
                                            icon={ShieldCheck}
                                        />

                                        <SettingSwitchRow
                                            id="require_customer_email_verification"
                                            title="Require Email Verification for Customer Booking"
                                            description="Guests must verify their email link before finalizing payments."
                                            checked={
                                                securityForm.data
                                                    .require_customer_email_verification
                                            }
                                            onCheckedChange={(checked) =>
                                                securityForm.setData(
                                                    'require_customer_email_verification',
                                                    checked,
                                                )
                                            }
                                            icon={Mail}
                                        />

                                        <SettingSwitchRow
                                            id="require_partner_email_verification"
                                            title="Require Email Verification for Partner Onboarding"
                                            description="Property owners must verify email to submit KYC documents."
                                            checked={
                                                securityForm.data
                                                    .require_partner_email_verification
                                            }
                                            onCheckedChange={(checked) =>
                                                securityForm.setData(
                                                    'require_partner_email_verification',
                                                    checked,
                                                )
                                            }
                                            icon={Zap}
                                        />
                                    </div>
                                </CardContent>

                                <SectionCardFooter
                                    processing={securityForm.processing}
                                    isDirty={securityForm.isDirty}
                                    submitLabel="Save Security Policies"
                                />
                            </form>
                        </Card>
                    </TabsContent>

                    {/* 11. Platform Features & System Preferences */}
                    <TabsContent value="features">
                        <Card>
                            <form onSubmit={handleFeaturesSubmit}>
                                <SectionCardHeader
                                    icon={ToggleLeft}
                                    title="Platform Feature Switches & Preferences"
                                    description="Toggle marketplace operations, customer registration, partner onboarding, and maintenance banners."
                                />

                                <CardContent className="space-y-6 py-6">
                                    {/* Maintenance Mode Box */}
                                    <div
                                        className={cn(
                                            'rounded-2xl border p-5 transition-colors',
                                            featuresForm.data.maintenance_mode
                                                ? 'border-status-warning-border bg-status-warning-bg'
                                                : 'border-tijum-surface/80 bg-tijum-cream/30 dark:border-border dark:bg-muted/40',
                                        )}
                                    >
                                        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                                            <div className="flex items-start gap-3 sm:items-center">
                                                <span
                                                    className={cn(
                                                        'flex size-10 shrink-0 items-center justify-center rounded-xl border',
                                                        featuresForm.data
                                                            .maintenance_mode
                                                            ? 'border-status-warning-border bg-white/80 text-status-warning-fg dark:bg-card'
                                                            : 'border-tijum-surface/80 bg-white text-tijum-plum-muted dark:border-border dark:bg-card dark:text-muted-foreground',
                                                    )}
                                                >
                                                    <AlertCircle
                                                        className="size-5"
                                                        aria-hidden="true"
                                                    />
                                                </span>
                                                <div>
                                                    <Label
                                                        htmlFor="maintenance_mode"
                                                        className={cn(
                                                            'cursor-pointer text-sm font-semibold',
                                                            featuresForm.data
                                                                .maintenance_mode
                                                                ? 'text-status-warning-fg'
                                                                : 'text-tijum-plum dark:text-foreground',
                                                        )}
                                                    >
                                                        Platform Scheduled
                                                        Maintenance Mode
                                                    </Label>
                                                    <p
                                                        className={cn(
                                                            'text-xs',
                                                            featuresForm.data
                                                                .maintenance_mode
                                                                ? 'text-status-warning-fg/90'
                                                                : 'text-tijum-plum-muted dark:text-muted-foreground',
                                                        )}
                                                    >
                                                        Displays maintenance
                                                        screen to public users;
                                                        keeps Admin Console
                                                        open.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-end gap-3 self-end sm:self-center">
                                                <StatusBadge
                                                    status={
                                                        featuresForm.data
                                                            .maintenance_mode
                                                            ? 'warning'
                                                            : 'active'
                                                    }
                                                    label={
                                                        featuresForm.data
                                                            .maintenance_mode
                                                            ? 'Maintenance Active'
                                                            : 'Public Live'
                                                    }
                                                />
                                                <Switch
                                                    id="maintenance_mode"
                                                    checked={
                                                        featuresForm.data
                                                            .maintenance_mode
                                                    }
                                                    onCheckedChange={(
                                                        checked,
                                                    ) =>
                                                        featuresForm.setData(
                                                            'maintenance_mode',
                                                            checked,
                                                        )
                                                    }
                                                />
                                            </div>
                                        </div>

                                        {featuresForm.data.maintenance_mode && (
                                            <div className="mt-4 space-y-2 border-t border-status-warning-border pt-4">
                                                <Label
                                                    htmlFor="maintenance_message"
                                                    className="text-xs font-semibold text-status-warning-fg"
                                                >
                                                    Maintenance Screen Notice
                                                    Message
                                                </Label>
                                                <Input
                                                    id="maintenance_message"
                                                    value={
                                                        featuresForm.data
                                                            .maintenance_message
                                                    }
                                                    onChange={(e) =>
                                                        featuresForm.setData(
                                                            'maintenance_message',
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="TIJUM is currently performing scheduled maintenance..."
                                                />
                                                <InputError
                                                    message={
                                                        featuresForm.errors
                                                            .maintenance_message
                                                    }
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        <SettingSwitchRow
                                            id="allow_customer_registration"
                                            title="Allow New Customer Registrations"
                                            description="Enables new customer accounts on Web and Mobile apps."
                                            checked={
                                                featuresForm.data
                                                    .allow_customer_registration
                                            }
                                            onCheckedChange={(checked) =>
                                                featuresForm.setData(
                                                    'allow_customer_registration',
                                                    checked,
                                                )
                                            }
                                        />

                                        <SettingSwitchRow
                                            id="allow_partner_registration"
                                            title="Allow New Partner Applications"
                                            description="Enables property owners to submit new onboarding verification requests."
                                            checked={
                                                featuresForm.data
                                                    .allow_partner_registration
                                            }
                                            onCheckedChange={(checked) =>
                                                featuresForm.setData(
                                                    'allow_partner_registration',
                                                    checked,
                                                )
                                            }
                                        />

                                        <SettingSwitchRow
                                            id="instant_booking_enabled"
                                            title="Instant Property Booking Engine"
                                            description="Allows instant booking reservation flows without mandatory host pre-approval."
                                            checked={
                                                featuresForm.data
                                                    .instant_booking_enabled
                                            }
                                            onCheckedChange={(checked) =>
                                                featuresForm.setData(
                                                    'instant_booking_enabled',
                                                    checked,
                                                )
                                            }
                                        />

                                        <SettingSwitchRow
                                            id="rewards_program_enabled"
                                            title="Loyalty & Rewards Points System"
                                            description="Enables earning and redeeming TIJUM Coins on accommodation reservations."
                                            checked={
                                                featuresForm.data
                                                    .rewards_program_enabled
                                            }
                                            onCheckedChange={(checked) =>
                                                featuresForm.setData(
                                                    'rewards_program_enabled',
                                                    checked,
                                                )
                                            }
                                        />

                                        <SettingSwitchRow
                                            id="referral_program_enabled"
                                            title="Referral Reward Program"
                                            description="Enables guest and student referral invite bonuses and coupon rewards."
                                            checked={
                                                featuresForm.data
                                                    .referral_program_enabled
                                            }
                                            onCheckedChange={(checked) =>
                                                featuresForm.setData(
                                                    'referral_program_enabled',
                                                    checked,
                                                )
                                            }
                                        />
                                    </div>
                                </CardContent>

                                <SectionCardFooter
                                    processing={featuresForm.processing}
                                    isDirty={featuresForm.isDirty}
                                    submitLabel="Save Feature Preferences"
                                />
                            </form>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Brand Asset Inspection Modal (Portal-safe Light + Dark Mode) */}
            <Dialog
                open={previewAsset !== null}
                onOpenChange={(open) => {
                    if (!open) setPreviewAsset(null);
                }}
            >
                <DialogContent className="border-tijum-surface/80 bg-white text-tijum-plum sm:max-w-2xl dark:border-border dark:bg-card dark:text-foreground">
                    <DialogHeader>
                        <DialogTitle className="font-heading text-tijum-plum dark:text-foreground">
                            {previewAsset?.title}
                        </DialogTitle>
                        <DialogDescription className="text-tijum-plum-muted dark:text-muted-foreground">
                            {previewAsset?.spec}
                        </DialogDescription>
                    </DialogHeader>

                    {previewAsset && (
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <Badge variant="secondary">
                                    {previewAsset.ratio}
                                </Badge>
                                {previewAsset.hasBackdrop && (
                                    <div className="inline-flex items-center gap-1 rounded-xl border border-tijum-surface/80 bg-tijum-cream/60 p-1 dark:border-border dark:bg-muted">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setAssetBackdrop(
                                                    previewAsset.id,
                                                    'light',
                                                )
                                            }
                                            className={cn(
                                                'inline-flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors',
                                                previewBackdrop === 'light'
                                                    ? 'bg-white text-tijum-plum shadow-2xs dark:bg-card dark:text-foreground'
                                                    : 'text-tijum-plum-muted hover:text-tijum-plum dark:text-muted-foreground dark:hover:text-foreground',
                                            )}
                                        >
                                            <Sun className="size-3.5" />
                                            <span>Light</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setAssetBackdrop(
                                                    previewAsset.id,
                                                    'dark',
                                                )
                                            }
                                            className={cn(
                                                'inline-flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors',
                                                previewBackdrop === 'dark'
                                                    ? 'bg-tijum-plum text-white shadow-2xs dark:bg-tijum-coral'
                                                    : 'text-tijum-plum-muted hover:text-tijum-plum dark:text-muted-foreground dark:hover:text-foreground',
                                            )}
                                        >
                                            <Moon className="size-3.5" />
                                            <span>Plum</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setAssetBackdrop(
                                                    previewAsset.id,
                                                    'checker',
                                                )
                                            }
                                            className={cn(
                                                'inline-flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors',
                                                previewBackdrop === 'checker'
                                                    ? 'bg-white text-tijum-plum shadow-2xs dark:bg-card dark:text-foreground'
                                                    : 'text-tijum-plum-muted hover:text-tijum-plum dark:text-muted-foreground dark:hover:text-foreground',
                                            )}
                                        >
                                            <Grid className="size-3.5" />
                                            <span>Grid</span>
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div
                                className={cn(
                                    'flex min-h-60 items-center justify-center rounded-2xl border border-tijum-surface/80 p-8 dark:border-border',
                                    getBackdropClasses(previewBackdrop),
                                )}
                            >
                                {previewUrl ? (
                                    <img
                                        src={previewUrl}
                                        alt={previewAsset.title}
                                        className="max-h-48 max-w-full object-contain drop-shadow-xs"
                                    />
                                ) : (
                                    <span className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                        No asset configured
                                    </span>
                                )}
                            </div>

                            <p className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 px-3 py-2 font-mono text-xs break-all text-tijum-plum dark:border-border dark:bg-muted/45 dark:text-foreground">
                                {previewUrl}
                            </p>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setPreviewAsset(null)}
                        >
                            Close
                        </Button>
                        {previewUrl && (
                            <Button asChild variant="plum">
                                <a
                                    href={previewUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    <ExternalLink className="size-4" />
                                    <span>Open Raw File</span>
                                </a>
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
