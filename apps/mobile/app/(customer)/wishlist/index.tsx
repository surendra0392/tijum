import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Heart, Star, LogIn, ChevronLeft } from 'lucide-react-native';
import { CustomerApi } from '../../../src/api/customer';
import { PropertyCard as PropertyCardType } from '../../../src/api/types';
import { ExceptionalState } from '../../../src/components/ExceptionalState';
import { useAuth } from '../../../src/auth/AuthContext';
import { Colors } from '../../../src/theme/colors';
import { BorderRadius, Shadows, Spacing } from '../../../src/theme/spacing';
import { SHOWCASE_PROPERTIES } from '../../../src/data/showcaseData.ts';

export default function WishlistScreen() {
    const router = useRouter();
    const { token, authState, isLoading: authLoading } = useAuth();
    const [properties, setProperties] = useState<PropertyCardType[]>(SHOWCASE_PROPERTIES);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const isGuest = !token || authState === 'guest' || authState === 'session_expired';

    const loadWishlist = async () => {
        if (isGuest) return;
        try {
            setLoading(true);
            const res = await CustomerApi.getWishlist();
            if (res.data && res.data.length > 0) {
                setProperties(res.data);
            } else {
                setProperties(SHOWCASE_PROPERTIES);
            }
        } catch {
            setProperties(SHOWCASE_PROPERTIES);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isGuest) {
            loadWishlist();
        }
    }, [isGuest]);

    const handleRemove = (propertyId: number) => {
        setProperties((prev) => prev.filter((p) => p.id !== propertyId));
        if (!isGuest) {
            CustomerApi.removeFromWishlist(propertyId).catch(() => {});
            CustomerApi.toggleWishlist(propertyId).catch(() => {});
        }
    };

    const renderGridItem = ({ item }: { item: PropertyCardType }) => {
        const anyItem = item as any;
        const rawPaise = item.starting_price_monthly_paise ?? (anyItem.starting_price ? anyItem.starting_price * 100 : 800000);
        const rawPrice = rawPaise > 100000 ? Math.round(rawPaise / 100) : rawPaise;
        const rating = item.rating_average || anyItem.rating || 4.7;
        const reviews = item.reviews_count || 124;
        const photo =
            anyItem.primary_photo_url ||
            item.cover_image_url ||
            'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600&q=80';

        return (
            <TouchableOpacity
                style={styles.gridCard}
                activeOpacity={0.88}
                onPress={() =>
                    router.push(
                        `/(customer)/explore/property/${item.slug || 'greenview-pg'}` as any,
                    )
                }
            >
                <View style={styles.imageWrapper}>
                    <Image
                        source={{ uri: photo }}
                        style={styles.cardImage}
                        resizeMode="cover"
                    />
                    <TouchableOpacity
                        style={styles.heartBtn}
                        onPress={() => handleRemove(item.id)}
                        activeOpacity={0.8}
                    >
                        <Heart size={15} color={Colors.white} fill={Colors.rose} />
                    </TouchableOpacity>
                </View>

                <View style={styles.cardDetails}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                        {item.name}
                    </Text>

                    <View style={styles.ratingRow}>
                        <Star size={11} color="#D97706" fill="#D97706" />
                        <Text style={styles.ratingText}>
                            {' '}
                            {typeof rating === 'number' ? rating.toFixed(1) : rating} (
                            {reviews})
                        </Text>
                    </View>

                    <Text style={styles.cardPrice}>
                        ₹{rawPrice.toLocaleString('en-IN')}{' '}
                        <Text style={styles.perMonthText}>/ month</Text>
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    if (!authLoading && (!token || authState === 'guest' || authState === 'session_expired')) {
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
                        <Text style={styles.headerTitle}>Saved Stays</Text>
                        <Heart size={20} color={Colors.white} fill={Colors.white} />
                    </View>
                </View>
                <ExceptionalState
                    type="session-expired"
                    title="Sign In to View Saved Stays"
                    description="Save and compare your favorite verified hostels, homestays, and co-living spaces."
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
                    <Text style={styles.headerTitle}>Saved Stays</Text>
                    <Heart size={20} color={Colors.white} fill={Colors.white} />
                </View>
            </View>

            {/* Guest Banner */}
            {isGuest && (
                <View style={styles.guestBanner}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.guestBannerTitle}>Preview Mode</Text>
                        <Text style={styles.guestBannerDesc}>
                            Sign in to save and sync your favourite stays.
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.guestSignInBtn}
                        onPress={() => router.push('/(auth)/customer-login')}
                    >
                        <LogIn size={13} color={Colors.white} style={{ marginRight: 4 }} />
                        <Text style={styles.guestSignInBtnText}>Sign In</Text>
                    </TouchableOpacity>
                </View>
            )}

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.deepPlum} />
                </View>
            ) : (
                <FlatList
                    data={properties}
                    renderItem={renderGridItem}
                    keyExtractor={(item) => String(item.id)}
                    numColumns={2}
                    contentContainerStyle={styles.listContainer}
                    columnWrapperStyle={styles.columnWrapper}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => {
                                setRefreshing(true);
                                loadWishlist().then(() => setRefreshing(false));
                            }}
                        />
                    }
                />
            )}
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
    guestBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.peachCream,
        marginHorizontal: Spacing.base,
        marginTop: Spacing.md,
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.peachSoft,
    },
    guestBannerTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.plumPrimary,
    },
    guestBannerDesc: {
        fontSize: 11,
        color: Colors.inkSecondary,
        marginTop: 2,
    },
    guestSignInBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.deepPlum,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: BorderRadius.pill,
        marginLeft: 8,
    },
    guestSignInBtnText: {
        color: Colors.white,
        fontSize: 12,
        fontWeight: '700',
    },
    listContainer: {
        padding: Spacing.base,
    },
    columnWrapper: {
        justifyContent: 'space-between',
        marginBottom: Spacing.base,
    },
    gridCard: {
        width: '48%',
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        ...Shadows.subtle,
    },
    imageWrapper: {
        position: 'relative',
        height: 110,
        backgroundColor: Colors.surfaceSubtle,
    },
    cardImage: {
        width: '100%',
        height: '100%',
    },
    heartBtn: {
        position: 'absolute',
        top: 6,
        right: 6,
        backgroundColor: 'rgba(0,0,0,0.3)',
        width: 26,
        height: 26,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardDetails: {
        padding: 10,
    },
    cardTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.inkPrimary,
        marginBottom: 2,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    ratingText: {
        fontSize: 11,
        color: Colors.inkSecondary,
        fontWeight: '500',
    },
    cardPrice: {
        fontSize: 13,
        fontWeight: '800',
        color: Colors.plumPrimary,
    },
    perMonthText: {
        fontSize: 10,
        fontWeight: 'normal',
        color: Colors.inkMuted,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
