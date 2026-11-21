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
} from 'react-native';
import { OwnerApi } from '../../../src/api/owner';
import { NotificationItem } from '../../../src/api/types';
import { Colors } from '../../../src/theme/colors';
import { Spacing } from '../../../src/theme/spacing';
import { Typography } from '../../../src/theme/typography';
import { AppHeader } from '../../../src/components/AppHeader';
import { ExceptionalState } from '../../../src/components/ExceptionalState';
import { useAuth } from '../../../src/auth/AuthContext';
import { useRouter } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { resolveDeepLinkPath } from '../../../src/utils/deepLinkRouting';

export default function PartnerNotificationsScreen() {
    const router = useRouter();
    const { token, authState, isLoading: authLoading } = useAuth();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isUnauthenticated, setIsUnauthenticated] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        if (authLoading) return;
        if (
            !token ||
            authState === 'guest' ||
            authState === 'session_expired' ||
            authState === 'customer_authenticated'
        ) {
            setIsUnauthenticated(true);
            setLoading(false);
            return;
        }
        setIsUnauthenticated(false);
        void loadNotifications();
    }, [token, authState, authLoading]);

    const loadNotifications = async () => {
        if (
            !token ||
            authState === 'guest' ||
            authState === 'session_expired' ||
            authState === 'customer_authenticated'
        ) {
            setIsUnauthenticated(true);
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setIsUnauthenticated(false);
            setErrorMessage(null);
            const res = await OwnerApi.getNotifications();
            if (res.data) {
                setNotifications(res.data);
            }
        } catch (loadError: unknown) {
            const error = loadError as { status?: number; message?: string };
            if (
                error.status === 401 ||
                error.message?.includes('Unauthenticated')
            ) {
                setIsUnauthenticated(true);
            } else {
                setErrorMessage(
                    error.message ?? 'Unable to load partner notifications.',
                );
            }
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        if (
            !token ||
            authState === 'guest' ||
            authState === 'session_expired' ||
            authState === 'customer_authenticated'
        ) {
            setIsUnauthenticated(true);
            return;
        }
        setRefreshing(true);
        try {
            await loadNotifications();
        } finally {
            setRefreshing(false);
        }
    };

    const handleMarkRead = async (id: number) => {
        try {
            await OwnerApi.markRead(id);
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
            );
        } catch {}
    };

    const handleMarkAllRead = async () => {
        try {
            await OwnerApi.markAllRead();
            setNotifications((prev) =>
                prev.map((n) => ({ ...n, is_read: true })),
            );
        } catch {
            setErrorMessage('Unable to mark notifications as read.');
        }
    };

    const resolveNotificationTarget = (
        item: NotificationItem,
    ): string | null => {
        const reference = item.related_reference;
        if (reference && item.template_code.includes('reservation')) {
            return `/(partner)/reservations/${reference}`;
        }
        if (reference && item.template_code.includes('settlement')) {
            return `/(partner)/settlements/${reference}`;
        }
        if (reference && item.template_code.includes('case')) {
            return `/(partner)/cases/${reference}`;
        }
        if (item.action_url) {
            const target = resolveDeepLinkPath(item.action_url);
            return target === '/' ? null : target;
        }

        return null;
    };

    const handleNotificationPress = async (item: NotificationItem) => {
        if (!item.is_read) {
            await handleMarkRead(item.id);
        }

        const target = resolveNotificationTarget(item);
        if (target) {
            router.push(target as never);
        }
    };

    const renderItem = ({ item }: { item: NotificationItem }) => (
        <TouchableOpacity
            accessibilityLabel={`Open notification: ${item.title}`}
            accessibilityRole="button"
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
                    >
                        {item.title}
                    </Text>
                </View>
                <Text style={styles.itemDate}>
                    {new Date(item.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                    })}
                </Text>
            </View>
            <Text style={styles.itemBody}>{item.message ?? item.body}</Text>
        </TouchableOpacity>
    );

    if (
        !authLoading &&
        (isUnauthenticated || !token || authState !== 'owner_authenticated')
    ) {
        return (
            <SafeAreaView style={styles.container}>
                <AppHeader
                    title="Partner Alerts"
                    subtitle="Operations, arrivals & settlement updates"
                    variant="plum"
                />
                <ExceptionalState
                    type="auth-required"
                    title="Sign In as Partner"
                    description="Please sign in to your verified TIJUM partner account to access and review your notifications and alerts."
                    primaryActionLabel="Sign In as Partner"
                    onPrimaryAction={() => router.push('/(auth)/owner-login')}
                    secondaryActionLabel="Explore Stays"
                    onSecondaryAction={() => router.push('/(customer)/explore')}
                />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <AppHeader
                title="Partner Alerts"
                subtitle="Operations, arrivals & settlement updates"
                variant="plum"
                rightAction={
                    <TouchableOpacity
                        accessibilityLabel="Mark all notifications as read"
                        accessibilityRole="button"
                        onPress={handleMarkAllRead}
                        style={styles.headerMarkReadBtn}
                    >
                        <Text style={styles.headerMarkReadText}>Mark Read</Text>
                    </TouchableOpacity>
                }
            />

            {errorMessage && notifications.length === 0 ? (
                <ExceptionalState
                    type="no-internet"
                    title="Partner Alerts Unavailable"
                    description={errorMessage}
                    actionLabel="Try Again"
                    onAction={loadNotifications}
                />
            ) : loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.deepPlum} />
                    <Text style={styles.loadingText}>
                        Loading notifications...
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={(item: NotificationItem) =>
                        item.id.toString()
                    }
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[Colors.deepPlum]}
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
                                You're all caught up! Booking requests, guest
                                updates, and payout alerts will appear here.
                            </Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.warmOffWhite,
    },
    headerMarkReadBtn: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 20,
    },
    headerMarkReadText: {
        fontSize: 11,
        color: Colors.coral,
        fontWeight: '700',
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
        backgroundColor: '#FAF5FF',
        borderColor: '#E9D5FF',
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
        backgroundColor: Colors.deepPlum,
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
    emptyEmoji: {
        fontSize: 48,
        marginBottom: Spacing.md,
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
});
