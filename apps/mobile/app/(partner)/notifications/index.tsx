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
import { Bell } from 'lucide-react-native';

export default function PartnerNotificationsScreen() {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadNotifications();
    }, []);

    const loadNotifications = async () => {
        try {
            setLoading(true);
            const res = await OwnerApi.getNotifications();
            if (res.data) {
                setNotifications(res.data);
            }
        } catch (e) {
            console.error('Failed to load partner notifications', e);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadNotifications();
        setRefreshing(false);
    };

    const handleMarkRead = async (id: number) => {
        try {
            await OwnerApi.markRead(id);
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
            );
        } catch (e) {
            console.error('Mark read failed', e);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await OwnerApi.markAllRead();
            setNotifications((prev) =>
                prev.map((n) => ({ ...n, is_read: true })),
            );
        } catch (e) {
            console.error('Mark all read failed', e);
        }
    };

    const renderItem = ({ item }: { item: NotificationItem }) => (
        <TouchableOpacity
            style={[styles.itemCard, !item.is_read && styles.itemUnread]}
            onPress={() => handleMarkRead(item.id)}
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
                <Text style={styles.itemDate}>{item.created_at}</Text>
            </View>
            <Text style={styles.itemBody}>{item.message}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.topBar}>
                <Text style={styles.topTitle}>Host Operations & Alerts</Text>
                <TouchableOpacity onPress={handleMarkAllRead}>
                    <Text style={styles.markAllText}>Mark all as read</Text>
                </TouchableOpacity>
            </View>

            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.deepPlum} />
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
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray200,
    },
    topTitle: {
        ...Typography.titleSmall,
        color: Colors.deepPlum,
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
