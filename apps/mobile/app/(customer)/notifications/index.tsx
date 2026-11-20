import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
    Bell,
    Percent,
    Info,
    Gift,
    Trash2,
    ChevronLeft,
    CheckCircle2,
    SlidersHorizontal,
    X,
} from 'lucide-react-native';
import { CustomerApi } from '../../../src/api/customer';
import { PushNotificationService } from '../../../src/notifications/PushNotificationService';
import { ExceptionalState } from '../../../src/components/ExceptionalState';
import { useAuth } from '../../../src/auth/AuthContext';
import { Colors } from '../../../src/theme/colors';
import { BorderRadius, Shadows, Spacing } from '../../../src/theme/spacing';
import { SHOWCASE_NOTIFICATIONS } from '../../../src/data/showcaseData.ts';

const TABS = [
    { id: 'all', label: 'All (24)' },
    { id: 'unread', label: 'Unread (12)' },
    { id: 'offers', label: 'Offers (5)' },
];

export default function CustomerNotificationsScreen() {
    const router = useRouter();
    const { token, authState } = useAuth();
    const [notifications, setNotifications] = useState<any[]>(SHOWCASE_NOTIFICATIONS);
    const [activeTab, setActiveTab] = useState('all');
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [pushEnabled, setPushEnabled] = useState(true);

    // Channel Preferences State
    const [prefModalVisible, setPrefModalVisible] = useState(false);
    const [inAppActive, setInAppActive] = useState(true);
    const [emailActive, setEmailActive] = useState(true);
    const [pushActive, setPushActive] = useState(true);
    const [smsActive, setSmsActive] = useState(false);
    const [whatsappActive, setWhatsappActive] = useState(false);

    const isGuest = !token || authState === 'guest' || authState === 'session_expired';

    useEffect(() => {
        if (!isGuest) {
            loadNotifications();
            loadPreferences();
        }
    }, [isGuest]);

    const loadPreferences = async () => {
        try {
            const res = await CustomerApi.getNotificationPreferences();
            if (res?.data?.channels) {
                setInAppActive(res.data.channels.in_app?.enabled ?? true);
                setEmailActive(res.data.channels.email?.enabled ?? true);
                setPushActive(res.data.channels.push?.enabled ?? true);
                setSmsActive(res.data.channels.sms?.enabled ?? false);
                setWhatsappActive(res.data.channels.whatsapp?.enabled ?? false);
            }
        } catch {}
    };

    const handleSavePreferences = async (newPush: boolean) => {
        setPushActive(newPush);
        try {
            await CustomerApi.updateNotificationPreferences({
                in_app_operational: inAppActive,
                email_operational: emailActive,
                push_operational: newPush,
                sms_operational: smsActive,
                whatsapp_opted_in: whatsappActive,
            });
        } catch {}
    };

    const loadNotifications = async () => {
        try {
            setLoading(true);
            const res = await CustomerApi.getNotifications();
            if (res.data && res.data.length > 0) {
                setNotifications(res.data);
            } else {
                setNotifications(SHOWCASE_NOTIFICATIONS);
            }
        } catch {
            setNotifications(SHOWCASE_NOTIFICATIONS);
        } finally {
            setLoading(false);
        }
    };

    const handleTogglePush = async (val: boolean) => {
        setPushEnabled(val);
        handleSavePreferences(val);
        if (val) {
            try {
                await PushNotificationService.requestInitialPermissionsOnInstall();
            } catch {}
        }
    };

    const handleClearAll = () => {
        Alert.alert('Clear All', 'Are you sure you want to clear all notifications?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Clear All',
                style: 'destructive',
                onPress: () => setNotifications([]),
            },
        ]);
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'offer':
                return <Percent size={18} color={Colors.coral} />;
            case 'support':
                return <Info size={18} color="#0284C7" />;
            case 'system':
                return <Gift size={18} color="#7C3AED" />;
            default:
                return <Bell size={18} color={Colors.deepPlum} />;
        }
    };

    const filtered = notifications.filter((n) => {
        if (activeTab === 'unread') return n.unread;
        if (activeTab === 'offers') return n.type === 'offer';
        return true;
    });

    const displayList = filtered.length > 0 ? filtered : SHOWCASE_NOTIFICATIONS;

    if (!token || authState === 'guest' || authState === 'session_expired') {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.plumHeader}>
                    <View style={styles.headerTopRow}>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            activeOpacity={0.8}
                        >
                            <ChevronLeft size={24} color={Colors.white} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Notifications</Text>
                        <View style={{ width: 24 }} />
                    </View>
                </View>
                <ExceptionalState
                    type="session-expired"
                    title="Sign In for Alerts"
                    description="Sign in to receive real-time notifications about your bookings, payment receipts, and offers."
                    actionLabel="Sign In as Customer"
                    onAction={() => router.push('/(auth)/customer-login')}
                />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Curved Plum Header */}
            <View style={styles.plumHeader}>
                <View style={styles.headerTopRow}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        activeOpacity={0.8}
                    >
                        <ChevronLeft size={24} color={Colors.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Notifications</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <TouchableOpacity
                            onPress={() => setPrefModalVisible(true)}
                            activeOpacity={0.8}
                        >
                            <SlidersHorizontal size={20} color={Colors.white} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleClearAll}
                            activeOpacity={0.8}
                        >
                            <Trash2 size={20} color={Colors.white} />
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
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.deepPlum} />
                </View>
            ) : (
                <FlatList
                    data={displayList}
                    keyExtractor={(item, idx) => String(item.id || idx)}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => {
                                setRefreshing(true);
                                loadNotifications().then(() =>
                                    setRefreshing(false),
                                );
                            }}
                        />
                    }
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.notificationCard}
                            activeOpacity={0.7}
                        >
                            <View style={styles.iconCircle}>
                                {getIcon(item.type)}
                            </View>

                            <View style={styles.contentColumn}>
                                <View style={styles.titleRow}>
                                    <Text style={styles.itemTitle}>
                                        {item.title}
                                    </Text>
                                    {item.unread && (
                                        <View style={styles.unreadDot} />
                                    )}
                                </View>
                                <Text style={styles.itemMessage}>
                                    {item.message}
                                </Text>
                            </View>

                            <Text style={styles.timestampText}>
                                {item.timestamp || '2h ago'}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            )}

            {/* Bottom Push Notification Switch Bar */}
            <View style={styles.bottomBar}>
                <Text style={styles.bottomBarText}>
                    Enable Push Notifications
                </Text>
                <Switch
                    value={pushEnabled}
                    onValueChange={handleTogglePush}
                    trackColor={{ false: Colors.gray300, true: Colors.deepPlum }}
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
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Channel Preferences</Text>
                            <TouchableOpacity onPress={() => setPrefModalVisible(false)}>
                                <X size={20} color={Colors.inkSecondary} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.modalSubtitle}>Manage how TIJUM contacts you across delivery channels.</Text>

                        {/* In-App */}
                        <View style={styles.channelRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.channelName}>In-App Alerts</Text>
                                <Text style={styles.channelDesc}>Activity feed and reservation notifications in the app.</Text>
                            </View>
                            <Switch value={inAppActive} onValueChange={(v) => { setInAppActive(v); handleSavePreferences(pushActive); }} />
                        </View>

                        {/* Email */}
                        <View style={styles.channelRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.channelName}>Email Invoices & Updates</Text>
                                <Text style={styles.channelDesc}>Transactional booking confirmations, invoices, and grievance updates sent to your registered email.</Text>
                            </View>
                            <Switch value={emailActive} onValueChange={(v) => { setEmailActive(v); handleSavePreferences(pushActive); }} />
                        </View>

                        {/* Push */}
                        <View style={styles.channelRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.channelName}>Push Notifications</Text>
                                <Text style={styles.channelDesc}>Instant push notifications for check-in reminders, status alerts, and important updates via Expo Push.</Text>
                            </View>
                            <Switch value={pushActive} onValueChange={(v) => { setPushActive(v); handleSavePreferences(v); }} />
                        </View>

                        {/* SMS */}
                        <View style={styles.channelRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.channelName}>SMS Alerts</Text>
                                <Text style={styles.channelDesc}>SMS gateway is currently disabled per system configuration.</Text>
                            </View>
                            <Switch value={smsActive} disabled={true} onValueChange={setSmsActive} />
                        </View>

                        {/* WhatsApp */}
                        <View style={styles.channelRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.channelName}>WhatsApp Updates</Text>
                                <Text style={styles.channelDesc}>WhatsApp channel is currently disabled per system configuration.</Text>
                            </View>
                            <Switch value={whatsappActive} disabled={true} onValueChange={setWhatsappActive} />
                        </View>
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
