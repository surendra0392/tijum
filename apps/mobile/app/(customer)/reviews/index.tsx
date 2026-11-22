import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Star } from 'lucide-react-native';
import { CustomerApi } from '../../../src/api/customer';
import { AppHeader } from '../../../src/components/AppHeader';
import { ExceptionalState } from '../../../src/components/ExceptionalState';
import { RequireAuth } from '../../../src/components/RequireAuth';
import { Colors } from '../../../src/theme/colors';
import { BorderRadius, Shadows, Spacing } from '../../../src/theme/spacing';

interface ReviewRecord {
    id: number;
    overall_rating?: number;
    rating?: number;
    title?: string | null;
    content?: string | null;
    status?: string;
    status_label?: string;
    submitted_at?: string;
    created_at?: string;
    property?: { name?: string; slug?: string } | null;
}

interface EligibleReview {
    booking_reference: string;
    property_name?: string;
    check_in_date?: string;
    check_out_date?: string;
    days_remaining?: number;
}

export default function MyReviewsScreen() {
    const router = useRouter();
    const isFocused = useIsFocused();
    const [reviews, setReviews] = useState<ReviewRecord[]>([]);
    const [eligible, setEligible] = useState<EligibleReview[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    const load = useCallback(async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }
        setError('');

        try {
            const [reviewsRes, eligibleRes] = await Promise.all([
                CustomerApi.getReviews(),
                CustomerApi.getEligibleReviews().catch(() => null),
            ]);
            setReviews(Array.isArray(reviewsRes.data) ? reviewsRes.data : []);
            setEligible(
                Array.isArray(eligibleRes?.data) ? eligibleRes.data : [],
            );
        } catch (err: any) {
            setError(err?.message || 'Could not load your reviews.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        if (isFocused) {
            void load();
        }
    }, [isFocused, load]);

    const renderReview = ({ item }: { item: ReviewRecord }) => {
        const rating = item.overall_rating ?? item.rating ?? 0;
        const date = item.submitted_at || item.created_at;

        return (
            <View style={styles.reviewCard}>
                <View style={styles.reviewTopRow}>
                    <Text style={styles.propertyName} numberOfLines={1}>
                        {item.property?.name || 'TIJUM Stay'}
                    </Text>
                    <View style={styles.ratingPill}>
                        <Star
                            size={12}
                            color={Colors.white}
                            fill={Colors.white}
                        />
                        <Text style={styles.ratingText}>
                            {rating.toFixed(1)}
                        </Text>
                    </View>
                </View>

                {item.title ? (
                    <Text style={styles.reviewTitle}>{item.title}</Text>
                ) : null}
                {item.content ? (
                    <Text style={styles.reviewBody}>{item.content}</Text>
                ) : null}

                <View style={styles.reviewFooter}>
                    <Text style={styles.reviewDate}>
                        {date ? new Date(date).toLocaleDateString() : ''}
                    </Text>
                    <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>
                            {item.status_label ||
                                (item.status
                                    ? item.status.replace(/_/g, ' ')
                                    : 'Submitted')}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <RequireAuth role="customer">
            <SafeAreaView style={styles.container} edges={['bottom']}>
                <AppHeader
                    title="My Reviews"
                    showBack
                    fallbackRoute="/(customer)/profile"
                />
                {loading && !refreshing ? (
                    <View style={styles.center}>
                        <ActivityIndicator
                            size="large"
                            color={Colors.deepPlum}
                        />
                    </View>
                ) : error && reviews.length === 0 ? (
                    <ExceptionalState
                        type="no-internet"
                        title="Reviews Unavailable"
                        description={error}
                        actionLabel="Try Again"
                        onAction={() => void load()}
                    />
                ) : (
                    <FlatList
                        data={reviews}
                        keyExtractor={(item: any) => String(item.id)}
                        renderItem={renderReview}
                        contentContainerStyle={styles.listContent}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={() => load(true)}
                                colors={[Colors.deepPlum]}
                                tintColor={Colors.deepPlum}
                            />
                        }
                        ListHeaderComponent={
                            <>
                                {eligible.length > 0 ? (
                                    <View style={styles.eligibleCard}>
                                        <Text style={styles.eligibleTitle}>
                                            Reviews waiting for you
                                        </Text>
                                        {eligible.map((item: any) => (
                                            <TouchableOpacity
                                                key={item.booking_reference}
                                                style={styles.eligibleRow}
                                                onPress={() =>
                                                    router.push({
                                                        pathname:
                                                            '/(customer)/bookings/[reference]',
                                                        params: {
                                                            reference:
                                                                item.booking_reference,
                                                        },
                                                    })
                                                }
                                                accessibilityRole="button"
                                            >
                                                <View style={{ flex: 1 }}>
                                                    <Text
                                                        style={
                                                            styles.eligibleName
                                                        }
                                                    >
                                                        {item.property_name ||
                                                            item.booking_reference}
                                                    </Text>
                                                    <Text
                                                        style={
                                                            styles.eligibleMeta
                                                        }
                                                    >
                                                        Share your experience
                                                        {item.days_remaining !==
                                                        undefined
                                                            ? ` · ${item.days_remaining} days left`
                                                            : ''}
                                                    </Text>
                                                </View>
                                                <Text
                                                    style={styles.eligibleAction}
                                                >
                                                    Review
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                ) : null}

                                <Text style={styles.sectionTitle}>
                                    Your Reviews
                                </Text>
                            </>
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Star size={36} color={Colors.gray300} />
                                <Text style={styles.emptyTitle}>
                                    No reviews yet
                                </Text>
                                <Text style={styles.emptyBody}>
                                    After your stay, you can rate the property
                                    and help other guests choose with
                                    confidence.
                                </Text>
                            </View>
                        }
                    />
                )}
            </SafeAreaView>
        </RequireAuth>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.canvas,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listContent: {
        padding: Spacing.base,
        paddingBottom: Spacing.xxl,
    },
    eligibleCard: {
        backgroundColor: Colors.peachCream,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.peachSoft,
        padding: Spacing.base,
        marginBottom: Spacing.lg,
    },
    eligibleTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: Colors.deepPlum,
        marginBottom: Spacing.sm,
    },
    eligibleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 48,
        paddingVertical: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Colors.peachSoft,
    },
    eligibleName: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.inkPrimary,
    },
    eligibleMeta: {
        fontSize: 12,
        color: Colors.inkSecondary,
        marginTop: 2,
    },
    eligibleAction: {
        fontSize: 13,
        fontWeight: '800',
        color: Colors.coralDark,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: Colors.deepPlum,
        marginBottom: Spacing.sm,
    },
    reviewCard: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        padding: Spacing.base,
        marginBottom: Spacing.md,
        ...Shadows.subtle,
    },
    reviewTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
    },
    propertyName: {
        flex: 1,
        fontSize: 14,
        fontWeight: '800',
        color: Colors.inkPrimary,
    },
    ratingPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: Colors.deepPlum,
        borderRadius: BorderRadius.full,
        paddingHorizontal: 9,
        paddingVertical: 3,
    },
    ratingText: {
        fontSize: 12,
        fontWeight: '800',
        color: Colors.white,
    },
    reviewTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.inkPrimary,
        marginTop: Spacing.sm,
    },
    reviewBody: {
        fontSize: 13,
        lineHeight: 19,
        color: Colors.inkSecondary,
        marginTop: 4,
    },
    reviewFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: Spacing.sm,
    },
    reviewDate: {
        fontSize: 11,
        color: Colors.inkMuted,
    },
    statusBadge: {
        backgroundColor: Colors.surfaceSubtle,
        borderRadius: BorderRadius.full,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
        color: Colors.inkSecondary,
        textTransform: 'capitalize',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: Spacing.xxxl,
        paddingHorizontal: Spacing.lg,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: Colors.inkPrimary,
        marginTop: Spacing.sm,
    },
    emptyBody: {
        fontSize: 13,
        lineHeight: 19,
        color: Colors.inkSecondary,
        textAlign: 'center',
        marginTop: Spacing.xs,
    },
});
