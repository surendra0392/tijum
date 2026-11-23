import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
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
import { Building2, Heart, Star, ChevronLeft } from 'lucide-react-native';
import { CustomerApi } from '../../../src/api/customer';
import { PropertyCard as PropertyCardType } from '../../../src/api/types';
import { ExceptionalState } from '../../../src/components/ExceptionalState';
import { SkeletonCard } from '../../../src/components/Skeleton';
import { useAuth } from '../../../src/auth/AuthContext';
import { Colors } from '../../../src/theme/colors';
import { BorderRadius, Shadows, Spacing } from '../../../src/theme/spacing';

export default function WishlistScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const isFocused = useIsFocused();
    const { token, authState, isLoading: authLoading, sessionEpoch } = useAuth();
    const [properties, setProperties] = useState<PropertyCardType[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const isGuest =
        !token ||
        authState === 'guest' ||
        authState === 'session_expired' ||
        authState === 'owner_authenticated';

    const hasLoadedRef = useRef(false);
    const loadSeqRef = useRef(0);

    useEffect(() => {
        setProperties([]);
        hasLoadedRef.current = false;
    }, [sessionEpoch]);

    const loadWishlist = useCallback(
        async (options?: { silent?: boolean }) => {
            if (isGuest) return;
            const reqId = ++loadSeqRef.current;
            try {
                if (!options?.silent) {
                    setLoading(true);
                }
                setErrorMessage(null);
                const res = await CustomerApi.getWishlist();
                if (reqId !== loadSeqRef.current) {
                    return;
                }
                const list = res.data ?? [];
                setProperties(list);
                hasLoadedRef.current = list.length > 0;
            } catch (loadError: unknown) {
                if (reqId !== loadSeqRef.current) {
                    return;
                }
                setErrorMessage(
                    loadError instanceof Error
                        ? loadError.message
                        : 'Unable to load your wishlist. Please try again.',
                );
            } finally {
                if (reqId === loadSeqRef.current) {
                    setLoading(false);
                }
            }
        },
        [isGuest],
    );

    useEffect(() => {
        if (!isGuest && isFocused) {
            void loadWishlist({ silent: hasLoadedRef.current });
        }
    }, [isGuest, isFocused, loadWishlist, sessionEpoch]);

    const handleRemove = (propertyId: number) => {
        const previous = properties;
        setProperties((prev) => prev.filter((p) => p.id !== propertyId));
        if (!isGuest) {
            CustomerApi.toggleWishlist(propertyId).catch((err: any) => {
                setProperties(previous);
                Alert.alert(
                    'Wishlist Update Failed',
                    err?.message ||
                        'Could not update your saved stays. Please try again.',
                );
            });
        }
    };

    const handleGoBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(customer)/profile');
        }
    };

    const renderGridItem = ({ item }: { item: PropertyCardType }) => {
        const rawPrice =
            item.starting_price_monthly_paise !== null
                ? item.starting_price_monthly_paise / 100
                : null;
        const hasReviews = item.rating_average > 0 && item.reviews_count > 0;
        const photo = item.cover_image_url;

        return (
            <View style={styles.gridCard}>
                <TouchableOpacity
                    accessibilityLabel={`Open ${item.name}`}
                    accessibilityRole="button"
                    activeOpacity={0.88}
                    onPress={() =>
                        router.push(
                            `/(customer)/explore/property/${item.slug}` as any,
                        )
                    }
                >
                    <View style={styles.imageWrapper}>
                        {photo ? (
                            <Image
                                source={{ uri: photo }}
                                style={styles.cardImage}
                                resizeMode="cover"
                            />
                        ) : (
                            <View style={styles.cardImagePlaceholder}>
                                <Building2 size={36} color={Colors.gray400} />
                            </View>
                        )}
                    </View>

                    <View style={styles.cardDetails}>
                        <Text style={styles.cardTitle} numberOfLines={1}>
                            {item.name}
                        </Text>

                        {hasReviews ? (
                            <View style={styles.ratingRow}>
                                <Star size={11} color="#D97706" fill="#D97706" />
                                <Text style={styles.ratingText}>
                                    {' '}
                                    {item.rating_average.toFixed(1)} (
                                    {item.reviews_count})
                                </Text>
                            </View>
                        ) : null}

                        {rawPrice !== null ? (
                            <Text style={styles.cardPrice}>
                                ₹{rawPrice.toLocaleString('en-IN')}{' '}
                                <Text style={styles.perMonthText}>/ month</Text>
                            </Text>
                        ) : (
                            <Text style={styles.priceUnavailable}>
                                Price unavailable
                            </Text>
                        )}
                    </View>
                </TouchableOpacity>
                <TouchableOpacity
                    accessibilityLabel={`Remove ${item.name} from wishlist`}
                    accessibilityRole="button"
                    style={styles.heartBtn}
                    onPress={() => handleRemove(item.id)}
                    activeOpacity={0.8}
                >
                    <Heart size={15} color={Colors.white} fill={Colors.rose} />
                </TouchableOpacity>
            </View>
        );
    };

    if (
        !authLoading &&
        (!token ||
            authState === 'guest' ||
            authState === 'session_expired' ||
            authState === 'owner_authenticated')
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
                            style={styles.headerActionBtn}
                            onPress={handleGoBack}
                            activeOpacity={0.8}
                            accessibilityRole="button"
                            accessibilityLabel="Go back"
                        >
                            <ChevronLeft size={24} color={Colors.white} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Saved Stays</Text>
                        <View style={styles.headerActionBtn}>
                            <Heart
                                size={20}
                                color={Colors.white}
                                fill={Colors.white}
                            />
                        </View>
                    </View>
                </View>
                <ExceptionalState
                    type="auth-required"
                    title="Sign In to View Saved Stays"
                    description="Save and compare your favorite verified hostels, homestays, and co-living spaces."
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
                        style={styles.headerActionBtn}
                        onPress={handleGoBack}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel="Go back"
                    >
                        <ChevronLeft size={24} color={Colors.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Saved Stays</Text>
                    <View style={styles.headerActionBtn}>
                        <Heart
                            size={20}
                            color={Colors.white}
                            fill={Colors.white}
                        />
                    </View>
                </View>
            </View>

            {errorMessage && properties.length === 0 ? (
                <ExceptionalState
                    type="no-internet"
                    title="Wishlist Unavailable"
                    description={errorMessage}
                    actionLabel="Try Again"
                    onAction={() => void loadWishlist()}
                />
            ) : loading && !refreshing && properties.length === 0 ? (
                <View style={styles.listContainer}>
                    <SkeletonCard />
                    <SkeletonCard />
                </View>
            ) : (
                <FlatList
                    data={properties}
                    renderItem={renderGridItem}
                    keyExtractor={(item: PropertyCardType) => String(item.id)}
                    numColumns={2}
                    contentContainerStyle={[
                        styles.listContainer,
                        properties.length === 0 && { flexGrow: 1 },
                    ]}
                    columnWrapperStyle={
                        properties.length > 0 ? styles.columnWrapper : undefined
                    }
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => {
                                setRefreshing(true);
                                void loadWishlist({ silent: true }).then(() =>
                                    setRefreshing(false),
                                );
                            }}
                            colors={[Colors.deepPlum]}
                            tintColor={Colors.deepPlum}
                        />
                    }
                    ListEmptyComponent={
                        <ExceptionalState
                            type="no-results"
                            title="No Saved Stays Yet"
                            description="Tap the heart icon on any verified hostel, PG, or co-living property to compare options later."
                            actionLabel="Explore Verified Stays"
                            onAction={() => router.push('/(customer)/explore')}
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
    headerActionBtn: {
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
    cardImagePlaceholder: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    heartBtn: {
        position: 'absolute',
        top: 6,
        right: 6,
        backgroundColor: 'rgba(0,0,0,0.3)',
        width: 44,
        height: 44,
        borderRadius: 22,
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
    priceUnavailable: {
        color: Colors.inkMuted,
        fontSize: 12,
        fontWeight: '600',
        marginTop: 8,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
