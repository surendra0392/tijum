import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Heart, Sparkles, MapPin } from 'lucide-react-native';
import { CustomerApi } from '../../../src/api/customer';
import { PropertyCard as PropertyCardType } from '../../../src/api/types';
import { PropertyCard } from '../../../src/components/PropertyCard';
import { Button } from '../../../src/components/Button';
import { AppHeader } from '../../../src/components/AppHeader';
import { ExceptionalState } from '../../../src/components/ExceptionalState';
import { useAuth } from '../../../src/auth/AuthContext';
import { Colors } from '../../../src/theme/colors';
import { BorderRadius, Spacing } from '../../../src/theme/spacing';
import { Typography } from '../../../src/theme/typography';

export default function WishlistScreen() {
    const router = useRouter();
    const { token, authState, isLoading: authLoading } = useAuth();
    const [properties, setProperties] = useState<PropertyCardType[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isUnauthenticated, setIsUnauthenticated] = useState(false);

    const loadWishlist = async (isRefresh = false) => {
        if (!token || authState === 'guest' || authState === 'session_expired') {
            setIsUnauthenticated(true);
            setLoading(false);
            setRefreshing(false);
            return;
        }

        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            setIsUnauthenticated(false);
            const res = await CustomerApi.getWishlist();
            if (res.data) {
                setProperties(res.data);
            }
        } catch (e: any) {
            if (e?.status === 401 || e?.message?.includes('Unauthenticated')) {
                setIsUnauthenticated(true);
            } else {
                console.error('Failed to load wishlist', e);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (authLoading) return;
        if (!token || authState === 'guest' || authState === 'session_expired') {
            setIsUnauthenticated(true);
            setLoading(false);
            return;
        }
        setIsUnauthenticated(false);
        loadWishlist();
    }, [token, authState, authLoading]);

    const handleToggleWishlist = async (propertyId: number) => {
        if (!token || authState === 'guest' || authState === 'session_expired') {
            setIsUnauthenticated(true);
            return;
        }
        // Optimistic removal from wishlist view
        setProperties((prev) => prev.filter((p) => p.id !== propertyId));
        try {
            await CustomerApi.toggleWishlist(propertyId, true);
        } catch (e: any) {
            if (e?.status === 401 || e?.message?.includes('Unauthenticated')) {
                setIsUnauthenticated(true);
            } else {
                console.error('Failed to update wishlist', e);
            }
            // Re-fetch on failure to restore state
            loadWishlist();
        }
    };

    if (!authLoading && (isUnauthenticated || !token || authState === 'guest' || authState === 'session_expired')) {
        return (
            <SafeAreaView style={styles.container}>
                <AppHeader
                    title="Saved Stays"
                    subtitle="Your favorited verified accommodations"
                    variant="plum"
                    showBack={true}
                />
                <ExceptionalState
                    type="session-expired"
                    title="Sign In to View Saved Stays"
                    description="Please sign in to your customer account to save and view your favorite verified accommodations."
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
                title="Saved Stays"
                subtitle="Your favorited verified accommodations"
                showBack={true}
                variant="plum"
            />
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.coral} />
                    <Text style={styles.loadingText}>
                        Loading your saved stays...
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={properties}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => loadWishlist(true)}
                            colors={[Colors.coral]}
                        />
                    }
                    ListHeaderComponent={
                        properties.length > 0 ? (
                            <View style={styles.header}>
                                <Text style={styles.title}>Saved Stays</Text>
                                <Text style={styles.subtitle}>
                                    {properties.length}{' '}
                                    {properties.length === 1
                                        ? 'stay saved'
                                        : 'stays saved'}{' '}
                                    with transparent meal inclusions
                                </Text>
                            </View>
                        ) : null
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconCircle}>
                                <Heart
                                    size={36}
                                    color={Colors.coral}
                                    fill={Colors.coral}
                                />
                            </View>
                            <Text style={styles.emptyTitle}>
                                No saved stays yet
                            </Text>
                            <Text style={styles.emptySubtitle}>
                                Tap the heart icon on any accommodation card in
                                Explore to keep your favorite verified hostels,
                                homestays, and co-living spaces handy here.
                            </Text>
                            <Button
                                title="Explore Verified Stays"
                                variant="primary"
                                size="md"
                                onPress={() =>
                                    router.push('/(customer)/explore/index')
                                }
                                style={{ marginTop: Spacing.lg }}
                            />
                        </View>
                    }
                    renderItem={({ item }) => (
                        <View style={styles.cardWrapper}>
                            <PropertyCard
                                property={item}
                                isWishlisted={true}
                                onToggleWishlist={handleToggleWishlist}
                                onPress={() =>
                                    router.push(
                                        `/(customer)/explore/property/${item.slug}` as any,
                                    )
                                }
                            />
                        </View>
                    )}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white,
    },
    listContent: {
        padding: Spacing.lg,
        paddingBottom: Spacing.xxl,
    },
    header: {
        marginBottom: Spacing.md,
    },
    title: {
        fontSize: Typography.fontSize.xl,
        fontWeight: '800',
        color: Colors.deepPlum,
    },
    subtitle: {
        fontSize: Typography.fontSize.sm,
        color: Colors.gray600,
        marginTop: 2,
    },
    cardWrapper: {
        marginBottom: Spacing.md,
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
        justifyContent: 'center',
        paddingVertical: Spacing.xxl * 1.5,
        paddingHorizontal: Spacing.xl,
    },
    emptyIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FFF1F2',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    emptyTitle: {
        fontSize: Typography.fontSize.lg,
        fontWeight: '800',
        color: Colors.deepPlum,
        marginBottom: Spacing.xs,
        textAlign: 'center',
    },
    emptySubtitle: {
        ...Typography.bodySmall,
        color: Colors.gray600,
        textAlign: 'center',
        lineHeight: 20,
        maxWidth: 320,
    },
});
