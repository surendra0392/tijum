import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    AlertCircle,
    Calendar,
    CheckCircle2,
    Clock,
    CornerDownRight,
    MessageSquare,
    MessageSquarePlus,
    Star,
    X,
} from 'lucide-react-native';
import { OwnerApi } from '../../../src/api/owner';
import { OwnerReview } from '../../../src/api/types';
import { Button } from '../../../src/components/Button';
import { Colors } from '../../../src/theme/colors';
import { BorderRadius, Spacing } from '../../../src/theme/spacing';
import { Typography } from '../../../src/theme/typography';

const MAX_RESPONSE_LENGTH = 2500;

export default function PartnerReviewsScreen() {
    const [reviews, setReviews] = useState<OwnerReview[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Reply Modal State
    const [selectedReview, setSelectedReview] = useState<OwnerReview | null>(
        null,
    );
    const [responseText, setResponseText] = useState('');
    const [replying, setReplying] = useState(false);
    const [replyError, setReplyError] = useState('');

    const loadReviews = async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const res = await OwnerApi.getReviews();
            if (res.data) {
                setReviews(res.data);
            }
        } catch (e: any) {
            console.error('Failed to load partner reviews', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadReviews();
    }, []);

    const handleOpenReplyModal = (review: OwnerReview) => {
        setSelectedReview(review);
        setResponseText(review.response?.response_text || '');
        setReplyError('');
    };

    const handleCloseReplyModal = () => {
        setSelectedReview(null);
        setResponseText('');
        setReplyError('');
    };

    const handleSubmitReply = async () => {
        if (!selectedReview) return;
        const trimmed = responseText.trim();
        if (!trimmed) {
            setReplyError('Please write a response before submitting.');
            return;
        }
        if (trimmed.length > MAX_RESPONSE_LENGTH) {
            setReplyError(
                `Response exceeds maximum limit of ${MAX_RESPONSE_LENGTH} characters.`,
            );
            return;
        }

        try {
            setReplying(true);
            setReplyError('');
            await OwnerApi.replyToReview(selectedReview.id, trimmed);

            // Update in-place
            setReviews((prev) =>
                prev.map((r) =>
                    r.id === selectedReview.id
                        ? {
                              ...r,
                              response: {
                                  response_text: trimmed,
                                  status: 'pending_moderation',
                                  submitted_at: 'Just now',
                              },
                          }
                        : r,
                ),
            );

            handleCloseReplyModal();
            Alert.alert(
                'Response Submitted',
                'Your partner response has been submitted for moderation and will appear on your listing once approved.',
            );
        } catch (e: any) {
            setReplyError(
                e.message ||
                    'Failed to submit response. Please verify and try again.',
            );
        } finally {
            setReplying(false);
        }
    };

    const renderStars = (rating: number, size = 14) => {
        return (
            <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        size={size}
                        color={star <= rating ? '#F59E0B' : Colors.gray300}
                        fill={star <= rating ? '#F59E0B' : 'transparent'}
                    />
                ))}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.deepPlum} />
                    <Text style={styles.loadingText}>
                        Loading property reviews...
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={reviews}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => loadReviews(true)}
                            colors={[Colors.deepPlum]}
                        />
                    }
                    ListHeaderComponent={
                        <View style={styles.header}>
                            <Text style={styles.title}>Guest Reviews</Text>
                            <Text style={styles.subtitle}>
                                Monitor guest feedback, ratings across
                                subcategories, and publish official responses.
                            </Text>
                        </View>
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconCircle}>
                                <MessageSquare
                                    size={36}
                                    color={Colors.gray400}
                                />
                            </View>
                            <Text style={styles.emptyTitle}>
                                No guest reviews yet
                            </Text>
                            <Text style={styles.emptySubtitle}>
                                When customers complete their stays at your
                                properties, their ratings and feedback on
                                cleanliness, food, and communication will appear
                                here.
                            </Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <View style={styles.reviewCard}>
                            {/* Card Top: Property & Rating */}
                            <View style={styles.cardHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.propertyName}>
                                        {item.property_name}
                                    </Text>
                                    <View style={styles.guestInfoRow}>
                                        <Text style={styles.guestName}>
                                            {item.guest_name ||
                                                item.customer_display_name ||
                                                'Verified Guest'}
                                        </Text>
                                        {item.verified_booking !== false ? (
                                            <View style={styles.verifiedTag}>
                                                <CheckCircle2
                                                    size={11}
                                                    color="#059669"
                                                    style={{ marginRight: 3 }}
                                                />
                                                <Text
                                                    style={
                                                        styles.verifiedTagText
                                                    }
                                                >
                                                    Verified Stay
                                                </Text>
                                            </View>
                                        ) : null}
                                    </View>
                                </View>
                                <View style={styles.ratingBadge}>
                                    <Star
                                        size={13}
                                        color="#D97706"
                                        fill="#D97706"
                                        style={{ marginRight: 3 }}
                                    />
                                    <Text style={styles.ratingBadgeText}>
                                        {item.overall_rating.toFixed(1)}
                                    </Text>
                                </View>
                            </View>

                            {/* Stay Dates */}
                            {item.stay_dates ? (
                                <View style={styles.stayDatesRow}>
                                    <Calendar
                                        size={12}
                                        color={Colors.gray500}
                                        style={{ marginRight: 4 }}
                                    />
                                    <Text style={styles.stayDatesText}>
                                        Stay Dates:{' '}
                                        {item.stay_dates.check_in_date} to{' '}
                                        {item.stay_dates.checkout_date}
                                    </Text>
                                </View>
                            ) : null}

                            {/* Subcategory Ratings Breakdown */}
                            <View style={styles.subRatingsGrid}>
                                <View style={styles.subRatingItem}>
                                    <Text style={styles.subRatingLabel}>
                                        Cleanliness
                                    </Text>
                                    {renderStars(
                                        item.cleanliness_rating ||
                                            item.overall_rating,
                                        11,
                                    )}
                                </View>
                                <View style={styles.subRatingItem}>
                                    <Text style={styles.subRatingLabel}>
                                        Food & Dining
                                    </Text>
                                    {renderStars(
                                        item.food_quality_rating ||
                                            item.overall_rating,
                                        11,
                                    )}
                                </View>
                                <View style={styles.subRatingItem}>
                                    <Text style={styles.subRatingLabel}>
                                        Communication
                                    </Text>
                                    {renderStars(
                                        item.communication_rating ||
                                            item.overall_rating,
                                        11,
                                    )}
                                </View>
                                <View style={styles.subRatingItem}>
                                    <Text style={styles.subRatingLabel}>
                                        Value for Money
                                    </Text>
                                    {renderStars(
                                        item.value_rating ||
                                            item.overall_rating,
                                        11,
                                    )}
                                </View>
                            </View>

                            {/* Title & Review Content */}
                            {item.title ? (
                                <Text style={styles.reviewTitle}>
                                    {item.title}
                                </Text>
                            ) : null}
                            {item.content ? (
                                <Text style={styles.reviewContent}>
                                    "{item.content}"
                                </Text>
                            ) : null}

                            {/* Existing Partner Response */}
                            {item.response ? (
                                <View style={styles.responseContainer}>
                                    <View style={styles.responseHeader}>
                                        <CornerDownRight
                                            size={14}
                                            color={Colors.deepPlum}
                                            style={{ marginRight: 5 }}
                                        />
                                        <Text style={styles.responseAuthor}>
                                            Your Official Response
                                        </Text>
                                        <View
                                            style={[
                                                styles.statusBadge,
                                                item.response.status ===
                                                'published'
                                                    ? styles.statusPublished
                                                    : styles.statusPending,
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.statusBadgeText,
                                                    item.response.status ===
                                                    'published'
                                                        ? styles.statusPublishedText
                                                        : styles.statusPendingText,
                                                ]}
                                            >
                                                {item.response.status ===
                                                'published'
                                                    ? 'Published'
                                                    : 'Pending Review'}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={styles.responseText}>
                                        {item.response.response_text}
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.editResponseLink}
                                        onPress={() =>
                                            handleOpenReplyModal(item)
                                        }
                                    >
                                        <Text style={styles.editResponseText}>
                                            Update Response
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={styles.replyButton}
                                    onPress={() => handleOpenReplyModal(item)}
                                    activeOpacity={0.7}
                                >
                                    <MessageSquarePlus
                                        size={15}
                                        color={Colors.deepPlum}
                                        style={{ marginRight: 6 }}
                                    />
                                    <Text style={styles.replyButtonText}>
                                        Respond to Guest
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                />
            )}

            {/* Response Modal */}
            <Modal
                visible={Boolean(selectedReview)}
                transparent
                animationType="slide"
                onRequestClose={handleCloseReplyModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalTitle}>
                                    Respond to Review
                                </Text>
                                <Text
                                    style={styles.modalSubtitle}
                                    numberOfLines={1}
                                >
                                    {selectedReview?.property_name} •{' '}
                                    {selectedReview?.guest_name || 'Guest'}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={handleCloseReplyModal}
                                hitSlop={{
                                    top: 10,
                                    bottom: 10,
                                    left: 10,
                                    right: 10,
                                }}
                            >
                                <X size={20} color={Colors.gray600} />
                            </TouchableOpacity>
                        </View>

                        {replyError ? (
                            <View style={styles.modalErrorBox}>
                                <AlertCircle
                                    size={15}
                                    color={Colors.rose}
                                    style={{ marginRight: 6 }}
                                />
                                <Text style={styles.modalErrorText}>
                                    {replyError}
                                </Text>
                            </View>
                        ) : null}

                        {/* Guest Review Preview */}
                        <View style={styles.quoteBox}>
                            <Text style={styles.quoteRating}>
                                ★ {selectedReview?.overall_rating.toFixed(1)} /
                                5.0
                            </Text>
                            <Text style={styles.quoteText} numberOfLines={2}>
                                "
                                {selectedReview?.content ||
                                    selectedReview?.title ||
                                    'Rating left by verified guest'}
                                "
                            </Text>
                        </View>

                        <Text style={styles.inputLabel}>
                            Your Public Response
                        </Text>
                        <TextInput
                            style={styles.responseInput}
                            multiline
                            numberOfLines={5}
                            placeholder="Thank the guest for their stay, address specific feedback, or highlight upcoming improvements..."
                            placeholderTextColor={Colors.gray400}
                            value={responseText}
                            onChangeText={setResponseText}
                            maxLength={MAX_RESPONSE_LENGTH}
                            textAlignVertical="top"
                        />

                        {/* Real-time Character Counter */}
                        <View style={styles.counterRow}>
                            <Text
                                style={[
                                    styles.counterText,
                                    responseText.length >=
                                        MAX_RESPONSE_LENGTH && {
                                        color: Colors.rose,
                                    },
                                ]}
                            >
                                {responseText.length.toLocaleString('en-IN')} /{' '}
                                {MAX_RESPONSE_LENGTH.toLocaleString('en-IN')}{' '}
                                characters
                            </Text>
                        </View>

                        <Button
                            title="Submit Official Response"
                            variant="primary"
                            size="md"
                            loading={replying}
                            disabled={!responseText.trim()}
                            onPress={handleSubmitReply}
                            style={{ marginTop: Spacing.sm }}
                        />
                    </View>
                </View>
            </Modal>
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
        justifyContent: 'center',
        paddingVertical: Spacing.xxl * 1.5,
        paddingHorizontal: Spacing.xl,
    },
    emptyIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.warmOffWhite,
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
    reviewCard: {
        backgroundColor: Colors.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.gray200,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    propertyName: {
        fontSize: Typography.fontSize.base,
        fontWeight: '800',
        color: Colors.deepPlum,
    },
    guestInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    guestName: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray600,
        fontWeight: '600',
        marginRight: 6,
    },
    verifiedTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 4,
    },
    verifiedTagText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#059669',
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
        borderRadius: 6,
    },
    ratingBadgeText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#D97706',
    },
    stayDatesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
    stayDatesText: {
        fontSize: 11,
        color: Colors.gray500,
    },
    subRatingsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: Colors.warmOffWhite,
        borderRadius: 8,
        padding: Spacing.sm,
        marginTop: Spacing.sm,
    },
    subRatingItem: {
        alignItems: 'center',
    },
    subRatingLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: Colors.gray600,
        marginBottom: 2,
    },
    starRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    reviewTitle: {
        ...Typography.labelMedium,
        color: Colors.deepPlum,
        fontWeight: '700',
        marginTop: Spacing.sm,
    },
    reviewContent: {
        ...Typography.bodySmall,
        color: Colors.gray700,
        fontStyle: 'italic',
        marginTop: 4,
        lineHeight: 18,
    },
    responseContainer: {
        backgroundColor: '#FAF5FF',
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: Colors.deepPlum,
        padding: Spacing.sm,
        marginTop: Spacing.sm,
    },
    responseHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    responseAuthor: {
        fontSize: 11,
        fontWeight: '800',
        color: Colors.deepPlum,
        flex: 1,
    },
    statusBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    statusPublished: {
        backgroundColor: '#ECFDF5',
    },
    statusPending: {
        backgroundColor: '#FEF3C7',
    },
    statusBadgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    statusPublishedText: {
        color: '#059669',
    },
    statusPendingText: {
        color: '#D97706',
    },
    responseText: {
        fontSize: 12,
        color: Colors.gray800,
        lineHeight: 18,
    },
    editResponseLink: {
        alignSelf: 'flex-end',
        marginTop: 4,
    },
    editResponseText: {
        fontSize: 11,
        fontWeight: '700',
        color: Colors.deepPlum,
        textDecorationLine: 'underline',
    },
    replyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        marginTop: Spacing.sm,
        paddingVertical: 4,
        paddingHorizontal: Spacing.xs,
    },
    replyButtonText: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.deepPlum,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        padding: Spacing.lg,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: Spacing.sm,
        paddingBottom: Spacing.xs,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray100,
    },
    modalTitle: {
        ...Typography.titleMedium,
        color: Colors.deepPlum,
        fontWeight: '800',
    },
    modalSubtitle: {
        ...Typography.bodySmall,
        color: Colors.gray500,
        marginTop: 2,
    },
    modalErrorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF1F2',
        padding: Spacing.sm,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FFE4E6',
        marginBottom: Spacing.sm,
    },
    modalErrorText: {
        fontSize: 12,
        color: '#E11D48',
        fontWeight: '600',
        flex: 1,
    },
    quoteBox: {
        backgroundColor: Colors.warmOffWhite,
        borderRadius: 8,
        padding: Spacing.sm,
        marginBottom: Spacing.sm,
        borderLeftWidth: 3,
        borderLeftColor: Colors.coral,
    },
    quoteRating: {
        fontSize: 11,
        fontWeight: '800',
        color: '#D97706',
        marginBottom: 2,
    },
    quoteText: {
        fontSize: 12,
        color: Colors.gray600,
        fontStyle: 'italic',
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.gray700,
        marginBottom: 6,
    },
    responseInput: {
        backgroundColor: Colors.white,
        borderWidth: 1.5,
        borderColor: Colors.gray200,
        borderRadius: BorderRadius.base,
        padding: Spacing.md,
        fontSize: Typography.fontSize.sm,
        color: Colors.gray900,
        minHeight: 110,
    },
    counterRow: {
        alignItems: 'flex-end',
        marginTop: 4,
        marginBottom: Spacing.xs,
    },
    counterText: {
        fontSize: 11,
        color: Colors.gray500,
        fontWeight: '600',
    },
});
