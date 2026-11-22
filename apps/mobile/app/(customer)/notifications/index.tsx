import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    SafeAreaView,
    useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import {
    Bell,
    Percent,
    Info,
    Gift,
    CheckCheck,
    ChevronLeft,
    SlidersHorizontal,
    X,
} from 'lucide-react-native';
import { CustomerApi } from '../../../src/api/customer';
import { NotificationItem } from '../../../src/api/types';
import { PushNotificationService } from '../../../src/notifications/PushNotificationService';
import { ExceptionalState } from '../../../src/components/ExceptionalState';
import { resolveDeepLinkPath } from '../../../src/utils/deepLinkRouting';
import { useAuth } from '../../../src/auth/AuthContext';
import { Colors } from '../../../src/theme/colors';
import { BorderRadius, Shadows, Spacing } from '../../../src/theme/spacing';

const TABS = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread' },
    { id: 'offers', label: 'Offers' },
];

const EMAIL_CHANNEL_DESCRIPTION =
    'Transactional booking confirmations, invoices, and grievance updates sent to your registered email.';
const PUSH_CHANNEL_DESCRIPTION =
    'Instant push notifications for check-in reminders, status alerts, and important updates via Expo Push.';
const SMS_CHANNEL_DESCRIPTION =
    'SMS gateway is currently disabled per system configuration.';
const WHATSAPP_CHANNEL_DESCRIPTION =
    'WhatsApp channel is currently disabled per system configuration.';

interface PreferenceState {
    inApp: boolean;
    email: boolean;
    push: boolean;
    sms: boolean;
    whatsapp: boolean;
}

export default function CustomerNotificationsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const isFocused = useIsFocused();
    const { token, authState, sessionEpoch } = useAuth();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [activeTab, setActiveTab] = useState('all');
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [preferencesError, setPreferencesError] = useState<string | null>(
        null,
    );

    // Channel Preferences State
    const [prefModalVisible, setPrefModalVisible] = useState(false);
    const [inAppActive, setInAppActive] = useState(true);
    const [emailActive, setEmailActive] = useState(true);
    const [pushActive, setPushActive] = useState(true);
    const [smsActive, setSmsActive] = useState(false);
    const [whatsappActive, setWhatsappActive] = useState(false);

    const isGuest =
        !token ||
        authState === 'guest' ||
        authState === 'session_expired' ||
        authState === 'owner_authenticated';

    useEffect(() => {
        setNotifications([]);
    }, [sessionEpoch]);

    useEffect(() => {
        if (!isGuest && isFocused) {
            void loadNotifications();
            void loadPreferences();
        }
    }, [isGuest, isFocused]);

    const loadPreferences = async () => {
        try {
            setPreferencesError(null);
            const res = await CustomerApi.getNotificationPreferences();
            const d = res?.data;
            if (d) {
                setInAppActive(
                    d.in_app_operational ??
                        d.channels_available?.in_app ??
                        true,
                );
                setEmailActive(
                    d.email_operational ?? d.channels_available?.email ?? true,
                );
                setPushActive(
                    d.push_operational ?? d.channels_available?.push ?? true,
                );
                setSmsActive(
                    d.sms_operational ?? d.channels_available?.sms ?? false,
                );
                setWhatsappActive(
                    d.whatsapp_opted_in ??
                        d.channels_available?.whatsapp ??
                        false,
                );
            }
        } catch (loadPreferencesError: unknown) {
            setPreferencesError(
                loadPreferencesError instanceof Error
                    ? loadPreferencesError.message
                    : 'Unable to load notification preferences.',
            );
        }
    };

    const handleSavePreferences = async (
        updates: Partial<PreferenceState>,
    ): Promise<boolean> => {
        const previous: PreferenceState = {
            inApp: inAppActive,
            email: emailActive,
            push: pushActive,
            sms: smsActive,
            whatsapp: whatsappActive,
        };
        const next = { ...previous, ...updates };

        setInAppActive(next.inApp);
        setEmailActive(next.email);
        setPushActive(next.push);
        setSmsActive(next.sms);
        setWhatsappActive(next.whatsapp);

        try {
            await CustomerApi.updateNotificationPreferences({
                in_app_operational: next.inApp,
                email_operational: next.email,
                push_operational: next.push,
                sms_operational: next.sms,
                whatsapp_opted_in: next.whatsapp,
            });
            return true;
        } catch {
            setInAppActive(previous.inApp);
            setEmailActive(previous.email);
            setPushActive(previous.push);
            setSmsActive(previous.sms);
            setWhatsappActive(previous.whatsapp);
            Alert.alert(
                'Preferences Not Saved',
                'Please check your connection and try again.',
            );
            return false;
        }
    };

    const loadNotifications = async () => {
        try {
            setLoading(true);
            setLoadError(null);
            const res = await CustomerApi.getNotifications();
            setNotifications(res.data ?? []);
        } catch (notificationError: unknown) {
            setNotifications([]);
            setLoadError(
                notificationError instanceof Error
                    ? notificationError.message
                    : 'Unable to load notifications.',
            );
        } finally {
            setLoading(false);
        }
    };

    const handleTogglePush = async (val: boolean) => {
        if (val) {
            const granted =
                await PushNotificationService.requestInitialPermissionsOnInstall();
            if (!granted) {
                Alert.alert(
                    'Notifications Not Enabled',
                    'Allow notifications in system settings before enabling this channel.',
                );
                return;
            }
            await PushNotificationService.registerForPushNotifications(
                'customer',
            );
        }

        await handleSavePreferences({ push: val });
    };

    const handleMarkAllRead = async () => {
        try {
            await CustomerApi.markAllRead();
            setNotifications((items) =>
                items.map((item) => ({ ...item, is_read: true })),
            );
        } catch {
            Alert.alert(
                'Notifications Not Updated',
                'Please check your connection and try again.',
            );
        }
    };

    const resolveNotificationTarget = (
        notification: NotificationItem,
    ): string | null => {
        const reference = notification.related_reference;
        const code = (notification.template_code || '').toLowerCase();

        // Guard customer inbox against accidentally routing to partner-only screens
        if (code.startsWith('owner.')) {
            return null;
        }
        if (
            reference &&
            (code.includes('reservation') ||
                code.includes('payment') ||
                code.includes('refund'))
        ) {
            return `/(customer)/bookings/${reference}`;
        }
        if (reference && code.includes('ticket')) {
            return `/(customer)/support/ticket/${reference}`;
        }
        if (
            reference &&
            (code.includes('case') || code.includes('protection'))
        ) {
            return `/(customer)/support/${reference}`;
        }
        if (
            code.includes('reward') ||
            code.includes('referral') ||
            code.includes('points')
        ) {
            return '/(customer)/rewards';
        }
        if (notification.action_url) {
            const urlLower = notification.action_url.toLowerCase();
            if (reference && urlLower.includes('support-tickets')) {
                return `/(customer)/support/ticket/${reference}`;
            }
            const target = resolveDeepLinkPath(notification.action_url);
            if (
                target.startsWith('/(customer)') ||
                target.startsWith('/help') ||
                target.startsWith('/legal')
            ) {
                return target;
            }
        }

        return null;
    };

    const handleNotificationPress = async (notification: NotificationItem) => {
        if (!notification.is_read) {
            setNotifications((items) =>
                items.map((item) =>
                    item.id === notification.id
                        ? { ...item, is_read: true }
                        : item,
                ),
            );
            try {
                await CustomerApi.markRead(notification.id);
            } catch {
                setNotifications((items) =>
                    items.map((item) =>
                        item.id === notification.id
                            ? { ...item, is_read: false }
                            : item,
                    ),
                );
            }
        }

        const target = resolveNotificationTarget(notification);
        if (target) {
            router.push(target);
        }
    };

    const handleGoBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(customer)/profile');
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'marketing':
            case 'offer':
                return <Percent size={18} color={Colors.coralDark} />;
            case 'support':
                return <Info size={18} color="#0284C7" />;
            case 'system':
                return <Gift size={18} color="#7C3AED" />;
            default:
                return <Bell size={18} color={Colors.deepPlum} />;
        }
    };

    const filtered = notifications.filter((n) => {
        if (activeTab === 'unread') return !n.is_read;
        if (activeTab === 'offers') {
            return n.category === 'marketing' || n.category === 'offer';
        }
        return true;
    });

    if (
        !token ||
        authState === 'guest' ||
        authState === 'session_expired' ||
        authState === 'owner_authenticated'
    ) {
        return (
            <SafeAreaView style={styles.container} edges={['bottom']}>
                <View
                    style={[
                        styles.plumHeader,
                        { paddingTop: Math.max(insets.top, Spacing.sm) },
                    ]}
                >
                    <View style={styles.headerTopRow}>
                        <TouchableOpacity
                            style={styles.headerActionButton}
                            onPress={handleGoBack}
                            activeOpacity={0.8}
                            accessibilityRole="button"
                            accessibilityLabel="Go back"
                        >
                            <ChevronLeft size={24} color={Colors.white} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Notifications</Text>
                        <View style={{ width: 44 }} />
                    </View>
                </View>
                <ExceptionalState
                    type="auth-required"
                    title="Sign In for Alerts"
                    description="Sign in to receive real-time notifications about your bookings, payment receipts, and offers."
                    actionLabel="Sign In as Customer"
                    onAction={() => router.push('/(auth)/customer-login')}
                />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            {/* Curved Plum Header */}
            <View
                style={[
                    styles.plumHeader,
                    { paddingTop: Math.max(insets.top, Spacing.sm) },
                ]}
            >
                <View style={styles.headerTopRow}>
                    <TouchableOpacity
                        accessibilityLabel="Go back"
                        accessibilityRole="button"
                        style={styles.headerActionButton}
                        onPress={handleGoBack}
                        activeOpacity={0.8}
                    >
                        <ChevronLeft size={24} color={Colors.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Notifications</Text>
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 12,
                        }}
                    >
                        <TouchableOpacity
                            accessibilityLabel="Notification preferences"
                            accessibilityRole="button"
                            style={styles.headerActionButton}
                            onPress={() => setPrefModalVisible(true)}
                            activeOpacity={0.8}
                        >
                            <SlidersHorizontal size={20} color={Colors.white} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            accessibilityLabel="Mark all notifications as read"
                            accessibilityRole="button"
                            style={styles.headerActionButton}
                            onPress={handleMarkAllRead}
                            activeOpacity={0.8}
                        >
                            <CheckCheck size={20} color={Colors.white} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Filter Pills */}
            <View style={styles.tabsRow}>
                {TABS.map((tab) => {
                    const isSelected = activeTab === tab.id;
                    return (
                        <TouchableOpacity
                            key={tab.id}
                            style={[
                                styles.tabPill,
                                isSelected && styles.tabPillActive,
                            ]}
                            onPress={() => setActiveTab(tab.id)}
                            activeOpacity={0.8}
                        >
                            <Text
                                style={[
                                    styles.tabPillText,
                                    isSelected && styles.tabPillTextActive,
                                ]}
                            >
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Notifications List */}
            {loadError ? (
                <ExceptionalState
                    type="no-internet"
                    title="Notifications Unavailable"
                    description={loadError}
                    actionLabel="Try Again"
                    onAction={loadNotifications}
                />
            ) : loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.deepPlum} />
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(item: NotificationItem) => String(item.id)}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => {
                                setRefreshing(true);
                                void loadNotifications().then(() =>
                                    setRefreshing(false),
                                );
                            }}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Bell size={32} color={Colors.gray400} />
                            <Text style={styles.emptyStateText}>
                                No notifications in this view.
                            </Text>
                        </View>
                    }
                    renderItem={({ item }: { item: NotificationItem }) => (
                        <TouchableOpacity
                            accessibilityLabel={`Open notification: ${item.title}`}
                            accessibilityRole="button"
                            style={styles.notificationCard}
                            onPress={() => handleNotificationPress(item)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.iconCircle}>
                                {getIcon(item.category)}
                            </View>

                            <View style={styles.contentColumn}>
                                <View style={styles.titleRow}>
                                    <Text style={styles.itemTitle}>
                                        {item.title}
                                    </Text>
                                    {!item.is_read && (
                                        <View style={styles.unreadDot} />
                                    )}
                                </View>
                                <Text style={styles.itemMessage}>
                                    {item.message ?? item.body}
                                </Text>
                            </View>

                            <Text style={styles.timestampText}>
                                {new Date(item.created_at).toLocaleDateString(
                                    'en-IN',
                                    {
                                        day: 'numeric',
                                        month: 'short',
                                    },
                                )}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            )}

            {/* Bottom Push Notification Switch Bar */}
            <View
                style={[
                    styles.bottomBar,
                    { paddingBottom: Math.max(insets.bottom, 14) },
                ]}
            >
                <Text style={styles.bottomBarText}>
                    Enable Push Notifications
                </Text>
                <Switch
                    value={pushActive}
                    onValueChange={handleTogglePush}
                    trackColor={{
                        false: Colors.gray300,
                        true: Colors.deepPlum,
                    }}
                    thumbColor={Colors.white}
                />
            </View>

            {/* Notification Channel Preferences Modal */}
            <Modal
                visible={prefModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setPrefModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View
                        style={[
                            styles.modalCard,
                            {
                                paddingBottom: Math.max(
                                    insets.bottom,
                                    Spacing.lg,
                                ),
                            },
                        ]}
                    >
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                Channel Preferences
                            </Text>
                            <TouchableOpacity
                                accessibilityLabel="Close notification preferences"
                                accessibilityRole="button"
                                style={styles.modalCloseButton}
                                onPress={() => setPrefModalVisible(false)}
                            >
                                <X size={20} color={Colors.inkSecondary} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.modalSubtitle}>
                                Manage how TIJUM contacts you across delivery
                                channels.
                            </Text>
                            {preferencesError ? (
                                <Text
                                    accessibilityRole="alert"
                                    style={styles.preferencesError}
                                >
                                    {preferencesError}
                                </Text>
                            ) : null}

                            {/* In-App */}
                            <View style={styles.channelRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.channelName}>
                                        In-App Alerts
                                    </Text>
                                    <Text style={styles.channelDesc}>
                                        Activity feed and reservation
                                        notifications in the app.
                                    </Text>
                                </View>
                                <Switch
                                    value={inAppActive}
                                    onValueChange={(value: boolean) => {
                                        void handleSavePreferences({
                                            inApp: value,
                                        });
                                    }}
                                />
                            </View>

                            {/* Email */}
                            <View style={styles.channelRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.channelName}>
                                        Email Invoices & Updates
                                    </Text>
                                    <Text style={styles.channelDesc}>
                                        {EMAIL_CHANNEL_DESCRIPTION}
                                    </Text>
                                </View>
                                <Switch
                                    value={emailActive}
                                    onValueChange={(value: boolean) => {
                                        void handleSavePreferences({
                                            email: value,
                                        });
                                    }}
                                />
                            </View>

                            {/* Push */}
                            <View style={styles.channelRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.channelName}>
                                        Push Notifications
                                    </Text>
                                    <Text style={styles.channelDesc}>
                                        {PUSH_CHANNEL_DESCRIPTION}
                                    </Text>
                                </View>
                                <Switch
                                    value={pushActive}
                                    onValueChange={(value: boolean) => {
                                        void handleTogglePush(value);
                                    }}
                                />
                            </View>

                            {/* SMS */}
                            <View style={styles.channelRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.channelName}>
                                        SMS Alerts
                                    </Text>
                                    <Text style={styles.channelDesc}>
                                        {SMS_CHANNEL_DESCRIPTION}
                                    </Text>
                                </View>
                                <Switch
                                    value={smsActive}
                                    disabled={true}
                                    onValueChange={setSmsActive}
                                />
                            </View>

                            {/* WhatsApp */}
                            <View style={styles.channelRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.channelName}>
                                        WhatsApp Updates
                                    </Text>
                                    <Text style={styles.channelDesc}>
                                        {WHATSAPP_CHANNEL_DESCRIPTION}
                                    </Text>
                                </View>
                                <Switch
                                    value={whatsappActive}
                                    disabled={true}
                                    onValueChange={setWhatsappActive}
                                />
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.canvas,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: Spacing.xxl,
    },
    emptyStateText: {
        color: Colors.inkMuted,
        fontSize: 14,
        marginTop: Spacing.sm,
    },
    plumHeader: {
        backgroundColor: Colors.deepPlum,
        paddingHorizontal: Spacing.base,
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.lg,
        borderBottomLeftRadius: BorderRadius.xl,
        borderBottomRightRadius: BorderRadius.xl,
    },
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerActionButton: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.white,
    },
    tabsRow: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.base,
        marginTop: Spacing.md,
        marginBottom: Spacing.sm,
        gap: Spacing.sm,
    },
    tabPill: {
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.base,
        paddingVertical: 7,
        borderRadius: BorderRadius.pill,
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
    },
    tabPillActive: {
        backgroundColor: Colors.deepPlum,
        borderColor: Colors.deepPlum,
    },
    tabPillText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.inkSecondary,
    },
    tabPillTextActive: {
        color: Colors.white,
        fontWeight: '700',
    },
    listContainer: {
        padding: Spacing.base,
        paddingBottom: 80,
    },
    notificationCard: {
        flexDirection: 'row',
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        alignItems: 'center',
        ...Shadows.subtle,
    },
    iconCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: Colors.peachCream,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    contentColumn: {
        flex: 1,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    itemTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.inkPrimary,
    },
    unreadDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: Colors.rose,
        marginLeft: 6,
    },
    itemMessage: {
        fontSize: 12,
        color: Colors.inkSecondary,
    },
    timestampText: {
        fontSize: 11,
        color: Colors.inkMuted,
        marginLeft: 8,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.white,
        paddingHorizontal: Spacing.lg,
        paddingVertical: 14,
        borderTopWidth: 1,
        borderTopColor: Colors.borderSubtle,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        ...Shadows.card,
    },
    bottomBarText: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.inkPrimary,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalCard: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        padding: Spacing.lg,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.deepPlum,
    },
    modalSubtitle: {
        fontSize: 13,
        color: Colors.inkMuted,
        marginBottom: Spacing.md,
    },
    modalCloseButton: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    preferencesError: {
        color: Colors.dangerText,
        fontSize: 12,
        marginBottom: Spacing.md,
    },
    channelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderSubtle,
    },
    channelName: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.inkPrimary,
    },
    channelDesc: {
        fontSize: 11,
        color: Colors.inkSecondary,
        marginTop: 2,
        paddingRight: Spacing.sm,
    },
});
