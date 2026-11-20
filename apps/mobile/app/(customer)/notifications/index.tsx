import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
    SafeAreaView,
    Modal,
    Switch,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CustomerApi } from '../../../src/api/customer';
import { PushNotificationService } from '../../../src/notifications/PushNotificationService';
import { NotificationItem } from '../../../src/api/types';
import { Colors } from '../../../src/theme/colors';
import { BorderRadius, Spacing } from '../../../src/theme/spacing';
import { Typography } from '../../../src/theme/typography';
import { Button } from '../../../src/components/Button';
import { Badge } from '../../../src/components/Badge';
import { AppHeader } from '../../../src/components/AppHeader';
import { ExceptionalState } from '../../../src/components/ExceptionalState';
import { useAuth } from '../../../src/auth/AuthContext';
import { Bell, SlidersHorizontal, X, Check, Info } from 'lucide-react-native';

export default function CustomerNotificationsScreen() {
    const router = useRouter();
    const { token, authState, isLoading: authLoading } = useAuth();

    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isUnauthenticated, setIsUnauthenticated] = useState(false);

    // Preferences modal state
    const [prefModalVisible, setPrefModalVisible] = useState(false);
    const [prefLoading, setPrefLoading] = useState(false);
    const [prefSaving, setPrefSaving] = useState(false);
    const [inAppActive, setInAppActive] = useState(true);
    const [emailActive, setEmailActive] = useState(true);
    const [pushActive, setPushActive] = useState(true);
    const [smsActive, setSmsActive] = useState(false);
    const [whatsappActive, setWhatsappActive] = useState(false);
    const [channelsAvailable, setChannelsAvailable] = useState<{
        in_app: boolean;
        email: boolean;
        push: boolean;
        sms: boolean;
        whatsapp: boolean;
    }>({
        in_app: true,
        email: true,
        push: true,
        sms: false,
        whatsapp: false,
    });

    useEffect(() => {
        if (authLoading) return;
        if (!token || authState === 'guest' || authState === 'session_expired') {
            setIsUnauthenticated(true);
            setLoading(false);
            return;
        }
        setIsUnauthenticated(false);
        loadNotifications();
    }, [token, authState, authLoading]);

    const loadNotifications = async () => {
        if (!token || authState === 'guest' || authState === 'session_expired') {
            setIsUnauthenticated(true);
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setIsUnauthenticated(false);
            const res = await CustomerApi.getNotifications();
            if (res.data) {
                setNotifications(res.data);
            }
        } catch (e: any) {
            if (e?.status === 401 || e?.message?.includes('Unauthenticated')) {
                setIsUnauthenticated(true);
            } else {
                console.error('Failed to load notifications', e);
            }
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        if (!token || authState === 'guest' || authState === 'session_expired') {
            setIsUnauthenticated(true);
            return;
        }
        setRefreshing(true);
        await loadNotifications();
        setRefreshing(false);
    };

    const handleMarkRead = async (id: number) => {
        try {
            await CustomerApi.markRead(id);
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
            );
        } catch (e) {
            console.error('Mark read failed', e);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await CustomerApi.markAllRead();
            setNotifications((prev) =>
                prev.map((n) => ({ ...n, is_read: true })),
            );
        } catch (e) {
            console.error('Mark all read failed', e);
        }
    };

    const handleNotificationPress = async (item: NotificationItem) => {
        if (!item.is_read) {
            handleMarkRead(item.id);
        }

        const actionUrl = item.action_url || '';
        const combinedText = `${item.title} ${item.message || ''} ${item.body || ''}`;

        // Check for Support Case match
        const caseRefMatch =
            actionUrl.match(/(?:my-support|support|cases)\/([A-Za-z0-9_-]+)/i) ||
            combinedText.match(/\b(CAS-[A-Z0-9-]+)\b/i);

        if (caseRefMatch) {
            router.push({
                pathname: '/(customer)/support/[reference]',
                params: { reference: caseRefMatch[1] },
            });
            return;
        }

        // Check for Booking match
        const bookingMatch =
            actionUrl.match(/reservations\/([A-Za-z0-9_-]+)/i) ||
            combinedText.match(/\b(TIJ-[A-Z0-9-]+)\b/i);

        if (bookingMatch) {
            router.push({
                pathname: '/(customer)/bookings/[reference]',
                params: { reference: bookingMatch[1] },
            });
            return;
        }

        // Check for Rewards match
        if (actionUrl.includes('rewards') || combinedText.toLowerCase().includes('points credited') || combinedText.toLowerCase().includes('referral')) {
            router.push('/(customer)/rewards');
            return;
        }
    };

    const openPreferences = async () => {
        setPrefModalVisible(true);
        setPrefLoading(true);
        try {
            const res = await CustomerApi.getNotificationPreferences();
            const prefs = res.data?.preferences || res.data;
            if (prefs) {
                setInAppActive(Boolean(prefs.in_app_operational ?? true));
                setEmailActive(Boolean(prefs.email_operational ?? true));
                setPushActive(Boolean(prefs.push_operational ?? true));
                setSmsActive(Boolean(prefs.sms_operational ?? false));
                setWhatsappActive(Boolean(prefs.whatsapp_opted_in ?? false));
                if (prefs.channels_available) {
                    setChannelsAvailable(prefs.channels_available);
                }
            }
        } catch (e: any) {
            Alert.alert('Notice', 'Using local channel settings.');
        } finally {
            setPrefLoading(false);
        }
    };

    const handleTogglePush = async (val: boolean) => {
        if (val) {
            const result = await PushNotificationService.requestPushPermissionsContextually(
                'settings_toggle',
                'customer',
                true,
            );
            if (result.granted) {
                setPushActive(true);
            } else {
                setPushActive(false);
                Alert.alert(
                    'Push Permission Needed',
                    'To receive instant push notifications for reservation updates, please enable notifications for TIJUM in your device settings.',
                );
            }
        } else {
            setPushActive(false);
            await PushNotificationService.unregisterDevice('customer');
        }
    };

    const handleSavePreferences = async () => {
        setPrefSaving(true);
        try {
            await CustomerApi.updateNotificationPreferences({
                in_app_operational: inAppActive,
                email_operational: emailActive,
                push_operational: pushActive,
                sms_operational: smsActive,
                whatsapp_opted_in: whatsappActive,
            });
            Alert.alert('Saved', 'Notification channel preferences updated successfully.');
            setPrefModalVisible(false);
        } catch (e: any) {
            Alert.alert('Update Failed', e.message || 'Could not update preferences.');
        } finally {
            setPrefSaving(false);
        }
    };

    const renderItem = ({ item }: { item: NotificationItem }) => (
        <TouchableOpacity
            style={[styles.itemCard, !item.is_read && styles.itemUnread]}
            onPress={() => handleNotificationPress(item)}
            activeOpacity={0.7}
        >
            <View style={styles.itemHeader}>
                <View style={styles.titleRow}>
                    {!item.is_read ? <View style={styles.unreadDot} /> : null}
                    <Text
                        style={[
                            styles.itemTitle,
                            !item.is_read && styles.itemTitleBold,
                        ]}
                        numberOfLines={1}
                    >
                        {item.title}
                    </Text>
                </View>
                <Text style={styles.itemDate}>
                    {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                </Text>
            </View>
            <Text style={styles.itemBody} numberOfLines={3}>
                {item.body || item.message}
            </Text>
        </TouchableOpacity>
    );

    if (!authLoading && (isUnauthenticated || !token || authState === 'guest' || authState === 'session_expired')) {
        return (
            <SafeAreaView style={styles.container}>
                <AppHeader
                    title="Activity & Alerts"
                    subtitle="Stay updates & system notifications"
                    variant="plum"
                />
                <ExceptionalState
                    type="session-expired"
                    title="Sign In for Alerts"
                    description="Please sign in to your customer account to view your booking updates, check-in details, and support messages."
                    primaryActionLabel="Sign In as Customer"
                    onPrimaryAction={() => router.push('/(auth)/customer-login')}
                    secondaryActionLabel="Explore Stays"
                    onSecondaryAction={() => router.push('/(customer)/explore/index')}
                />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <AppHeader
                title="Activity & Alerts"
                subtitle="Stay updates & system notifications"
                variant="plum"
                rightAction={
                    <View style={styles.headerActionsRow}>
                        <TouchableOpacity
                            style={styles.headerPrefBtn}
                            onPress={openPreferences}
                            accessibilityLabel="Notification Preferences"
                        >
                            <SlidersHorizontal size={13} color={Colors.white} />
                            <Text style={styles.headerPrefText}>Channels</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleMarkAllRead} style={styles.headerMarkReadBtn}>
                            <Text style={styles.headerMarkReadText}>Mark Read</Text>
                        </TouchableOpacity>
                    </View>
                }
            />

            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.coral} />
                    <Text style={styles.loadingText}>
                        Loading notifications...
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[Colors.coral]}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Bell
                                size={48}
                                color={Colors.gray300}
                                style={{ marginBottom: Spacing.md }}
                            />
                            <Text style={styles.emptyTitle}>
                                No notifications
                            </Text>
                            <Text style={styles.emptySubtitle}>
                                You're all caught up! Updates about your
                                reservations and account will appear here.
                            </Text>
                        </View>
                    }
                />
            )}

            {/* Notification Preferences Modal */}
            <Modal
                visible={prefModalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setPrefModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Alert Channels</Text>
                            <TouchableOpacity
                                onPress={() => setPrefModalVisible(false)}
                                style={styles.modalCloseBtn}
                            >
                                <X size={20} color={Colors.deepPlum} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalSubtitle}>
                            Configure your notification preferences. Operational updates regarding reservations and security are sent via active channels.
                        </Text>

                        {prefLoading ? (
                            <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
                                <ActivityIndicator size="small" color={Colors.coral} />
                            </View>
                        ) : (
                            <View style={styles.channelsList}>
                                {/* In-App Channel */}
                                <View style={styles.channelRow}>
                                    <View style={{ flex: 1 }}>
                                        <View style={styles.channelTitleRow}>
                                            <Text style={styles.channelName}>In-App Notifications</Text>
                                            <Badge label="ACTIVE" variant="accent" />
                                        </View>
                                        <Text style={styles.channelDesc}>
                                            Activity feed, booking confirmations and support updates within the app.
                                        </Text>
                                    </View>
                                    <Switch
                                        value={inAppActive}
                                        onValueChange={setInAppActive}
                                        trackColor={{ false: Colors.gray300, true: Colors.coral }}
                                        thumbColor={Colors.white}
                                    />
                                </View>

                                {/* Email Channel */}
                                <View style={styles.channelRow}>
                                    <View style={{ flex: 1 }}>
                                        <View style={styles.channelTitleRow}>
                                            <Text style={styles.channelName}>Email Delivery</Text>
                                            <Badge
                                                label={channelsAvailable.email ? 'ACTIVE' : 'INACTIVE'}
                                                variant={channelsAvailable.email ? 'accent' : 'neutral'}
                                            />
                                        </View>
                                        <Text style={styles.channelDesc}>
                                            Transactional booking confirmations, invoices, and grievance updates sent to your registered email.
                                        </Text>
                                    </View>
                                    <Switch
                                        value={emailActive}
                                        onValueChange={setEmailActive}
                                        disabled={!channelsAvailable.email}
                                        trackColor={{ false: Colors.gray200, true: Colors.coral }}
                                        thumbColor={Colors.white}
                                    />
                                </View>

                                {/* Mobile Push Channel */}
                                <View style={styles.channelRow}>
                                    <View style={{ flex: 1 }}>
                                        <View style={styles.channelTitleRow}>
                                            <Text style={styles.channelName}>Mobile Push</Text>
                                            <Badge
                                                label={channelsAvailable.push ? 'ACTIVE' : 'INACTIVE'}
                                                variant={channelsAvailable.push ? 'accent' : 'neutral'}
                                            />
                                        </View>
                                        <Text style={styles.channelDesc}>
                                            Instant push notifications for check-in reminders, status alerts, and important updates via Expo Push.
                                        </Text>
                                    </View>
                                    <Switch
                                        value={pushActive}
                                        onValueChange={handleTogglePush}
                                        disabled={!channelsAvailable.push}
                                        trackColor={{ false: Colors.gray200, true: Colors.coral }}
                                        thumbColor={Colors.white}
                                    />
                                </View>

                                {/* SMS Channel */}
                                <View style={styles.channelRow}>
                                    <View style={{ flex: 1 }}>
                                        <View style={styles.channelTitleRow}>
                                            <Text style={styles.channelName}>SMS Alerts</Text>
                                            <Badge label="INACTIVE" variant="neutral" />
                                        </View>
                                        <Text style={styles.channelDesc}>
                                            SMS gateway is currently disabled per system configuration.
                                        </Text>
                                    </View>
                                    <Switch
                                        value={smsActive}
                                        onValueChange={setSmsActive}
                                        disabled={true}
                                        trackColor={{ false: Colors.gray200, true: Colors.coral }}
                                        thumbColor={Colors.gray400}
                                    />
                                </View>

                                {/* WhatsApp Channel */}
                                <View style={styles.channelRow}>
                                    <View style={{ flex: 1 }}>
                                        <View style={styles.channelTitleRow}>
                                            <Text style={styles.channelName}>WhatsApp Updates</Text>
                                            <Badge label="INACTIVE" variant="neutral" />
                                        </View>
                                        <Text style={styles.channelDesc}>
                                            WhatsApp channel is currently disabled per system configuration.
                                        </Text>
                                    </View>
                                    <Switch
                                        value={whatsappActive}
                                        onValueChange={setWhatsappActive}
                                        disabled={true}
                                        trackColor={{ false: Colors.gray200, true: Colors.coral }}
                                        thumbColor={Colors.gray400}
                                    />
                                </View>

                                <Button
                                    title="Save Channel Preferences"
                                    onPress={handleSavePreferences}
                                    loading={prefSaving}
                                    style={{ marginTop: Spacing.md }}
                                />
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.warmOffWhite,
    },
    headerActionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    headerPrefBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 5,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: BorderRadius.pill,
    },
    headerPrefText: {
        fontSize: 11,
        color: Colors.white,
        fontWeight: '600',
    },
    headerMarkReadBtn: {
        paddingHorizontal: 8,
        paddingVertical: 5,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: BorderRadius.pill,
    },
    headerMarkReadText: {
        fontSize: 11,
        color: Colors.coral,
        fontWeight: '700',
    },
    prefButtonText: {
        ...Typography.labelSmall,
        color: Colors.deepPlum,
        fontWeight: '600',
    },
    markAllText: {
        ...Typography.bodySmall,
        color: Colors.coral,
        fontWeight: '600',
    },
    listContent: {
        padding: Spacing.md,
    },
    itemCard: {
        backgroundColor: Colors.white,
        borderRadius: 10,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    itemUnread: {
        backgroundColor: '#FFF9F5',
        borderColor: '#FED7AA',
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.coral,
        marginRight: 6,
    },
    itemTitle: {
        ...Typography.labelMedium,
        color: Colors.deepPlum,
    },
    itemTitleBold: {
        fontWeight: '700',
    },
    itemDate: {
        ...Typography.bodySmall,
        color: Colors.gray400,
        fontSize: 11,
    },
    itemBody: {
        ...Typography.bodySmall,
        color: Colors.gray600,
        lineHeight: 18,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    loadingText: {
        ...Typography.bodyMedium,
        color: Colors.gray600,
        marginTop: Spacing.md,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: Spacing.xxl,
        paddingHorizontal: Spacing.xl,
    },
    emptyTitle: {
        ...Typography.titleMedium,
        color: Colors.deepPlum,
    },
    emptySubtitle: {
        ...Typography.bodyMedium,
        color: Colors.gray500,
        textAlign: 'center',
        marginTop: Spacing.xs,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    modalCard: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: BorderRadius.lg,
        borderTopRightRadius: BorderRadius.lg,
        padding: Spacing.lg,
        maxHeight: '85%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    modalTitle: {
        ...Typography.titleMedium,
        color: Colors.deepPlum,
        fontWeight: '700',
    },
    modalCloseBtn: {
        padding: 4,
    },
    modalSubtitle: {
        ...Typography.bodySmall,
        color: Colors.gray600,
        marginBottom: Spacing.md,
        lineHeight: 18,
    },
    channelsList: {
        gap: Spacing.md,
    },
    channelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray100,
    },
    channelTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 2,
    },
    channelName: {
        ...Typography.labelMedium,
        color: Colors.deepPlum,
        fontWeight: '700',
    },
    channelDesc: {
        ...Typography.bodySmall,
        fontSize: 11,
        color: Colors.gray500,
        lineHeight: 16,
        paddingRight: Spacing.sm,
    },
});
