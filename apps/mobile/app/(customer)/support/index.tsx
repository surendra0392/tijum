import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    Alert,
    TouchableOpacity,
    SafeAreaView,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { CustomerApi } from '../../../src/api/customer';
import { Colors } from '../../../src/theme/colors';
import { Spacing } from '../../../src/theme/spacing';
import { Typography } from '../../../src/theme/typography';
import { Input } from '../../../src/components/Input';
import { Button } from '../../../src/components/Button';
import { Badge } from '../../../src/components/Badge';
import {
    ShieldCheck,
    UtensilsCrossed,
    BedDouble,
    RefreshCw,
    AlertTriangle,
    MessageSquare,
} from 'lucide-react-native';

const CATEGORIES = [
    {
        label: 'Food Not Provided / Quality',
        value: 'food_inclusions',
        Icon: UtensilsCrossed,
    },
    {
        label: 'Room / Amenity Discrepancy',
        value: 'room_condition',
        Icon: BedDouble,
    },
    {
        label: 'Request Emergency Relocation',
        value: 'relocation',
        Icon: RefreshCw,
    },
    { label: 'Safety / Host Dispute', value: 'safety', Icon: AlertTriangle },
    { label: 'General Grievance', value: 'other', Icon: MessageSquare },
];

export default function CustomerSupportScreen() {
    const { booking_reference } = useLocalSearchParams<{
        booking_reference?: string;
    }>();

    const [cases, setCases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [bookingRef, setBookingRef] = useState(booking_reference || '');
    const [selectedCategory, setSelectedCategory] = useState('food_inclusions');
    const [description, setDescription] = useState('');

    useEffect(() => {
        loadCases();
    }, []);

    const loadCases = async () => {
        try {
            setLoading(true);
            const res = await CustomerApi.getCases();
            if (res.data) {
                setCases(res.data);
            }
        } catch (e) {
            console.error('Failed to load support cases', e);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!bookingRef.trim()) {
            Alert.alert('Required', 'Please enter your booking reference.');
            return;
        }
        if (!description.trim()) {
            Alert.alert(
                'Required',
                'Please describe the problem you encountered.',
            );
            return;
        }

        try {
            setSubmitting(true);
            const res = await CustomerApi.createCase({
                booking_reference: bookingRef.trim(),
                category: selectedCategory,
                description: description.trim(),
            });

            if (res.data) {
                Alert.alert(
                    'Grievance Lodged',
                    'Our Customer Protection team has received your ticket. We will review your booking and resolve within 2 hours.',
                );
                setDescription('');
                loadCases();
            }
        } catch (e: any) {
            Alert.alert(
                'Submission Error',
                e.message || 'Failed to submit grievance.',
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Protection Banner */}
                <View style={styles.banner}>
                    <ShieldCheck
                        size={26}
                        color="#166534"
                        style={{ marginRight: Spacing.sm }}
                    />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.bannerTitle}>
                            TIJUM Customer Protection
                        </Text>
                        <Text style={styles.bannerText}>
                            Every booking is covered by our Verified Food &
                            Accommodation Guarantee. If meals are skipped or
                            rooms differ materially, we provide relocation or
                            refunds.
                        </Text>
                    </View>
                </View>

                <View style={styles.contentPadding}>
                    {/* New Grievance Form */}
                    <Text style={styles.sectionTitle}>Lodge a Grievance</Text>
                    <Input
                        label="Booking Reference"
                        value={bookingRef}
                        onChangeText={setBookingRef}
                        placeholder="e.g. TIJ-202611-ABCD"
                    />

                    <Text style={styles.fieldLabel}>Issue Category</Text>
                    <View style={styles.categoryWrap}>
                        {CATEGORIES.map((cat) => {
                            const isSelected = selectedCategory === cat.value;
                            const CategoryIcon = cat.Icon;
                            return (
                                <TouchableOpacity
                                    key={cat.value}
                                    style={[
                                        styles.categoryChip,
                                        isSelected && styles.categoryChipActive,
                                    ]}
                                    onPress={() =>
                                        setSelectedCategory(cat.value)
                                    }
                                >
                                    <CategoryIcon
                                        size={14}
                                        color={
                                            isSelected
                                                ? Colors.coral
                                                : Colors.gray600
                                        }
                                        style={{ marginRight: 6 }}
                                    />
                                    <Text
                                        style={[
                                            styles.categoryText,
                                            isSelected &&
                                                styles.categoryTextActive,
                                        ]}
                                    >
                                        {cat.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <Input
                        label="Detailed Description"
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Please explain what happened, including dates and meal times if applicable..."
                        multiline
                        numberOfLines={4}
                    />

                    <Button
                        title="Submit Protection Ticket"
                        loading={submitting}
                        onPress={handleSubmit}
                        style={{ marginTop: Spacing.sm }}
                    />

                    {/* Past Support Cases */}
                    <View style={styles.divider} />
                    <Text style={styles.sectionTitle}>
                        Your Grievance History
                    </Text>

                    {loading ? (
                        <ActivityIndicator size="small" color={Colors.coral} />
                    ) : cases.length > 0 ? (
                        cases.map((c) => (
                            <View
                                key={c.id || c.reference}
                                style={styles.caseCard}
                            >
                                <View style={styles.rowBetween}>
                                    <Text style={styles.caseRef}>
                                        {c.reference}
                                    </Text>
                                    <Badge
                                        label={c.status}
                                        variant={
                                            c.status === 'resolved'
                                                ? 'accent'
                                                : 'secondary'
                                        }
                                    />
                                </View>
                                <Text style={styles.caseCategory}>
                                    Category: {c.category}
                                </Text>
                                <Text style={styles.caseDesc}>
                                    {c.description}
                                </Text>
                                {c.resolution_notes ? (
                                    <View style={styles.resolutionBox}>
                                        <Text style={styles.resolutionTitle}>
                                            Support Team Update:
                                        </Text>
                                        <Text style={styles.resolutionText}>
                                            {c.resolution_notes}
                                        </Text>
                                    </View>
                                ) : null}
                            </View>
                        ))
                    ) : (
                        <Text style={styles.emptyText}>
                            No previous grievances filed.
                        </Text>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white,
    },
    scrollContent: {
        paddingBottom: Spacing.xxl,
    },
    banner: {
        backgroundColor: '#F0FDF4',
        padding: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#DCFCE7',
    },
    bannerIcon: {
        fontSize: 28,
        marginRight: Spacing.sm,
    },
    bannerTitle: {
        ...Typography.labelMedium,
        color: '#166534',
        fontWeight: '700',
    },
    bannerText: {
        ...Typography.bodySmall,
        color: '#15803D',
        marginTop: 2,
        lineHeight: 18,
    },
    contentPadding: {
        padding: Spacing.lg,
    },
    sectionTitle: {
        ...Typography.titleSmall,
        color: Colors.deepPlum,
        marginBottom: Spacing.md,
    },
    fieldLabel: {
        ...Typography.labelSmall,
        color: Colors.deepPlum,
        marginBottom: Spacing.xs,
    },
    categoryWrap: {
        gap: Spacing.xs,
        marginBottom: Spacing.md,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderRadius: 8,
        backgroundColor: Colors.warmOffWhite,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    categoryChipActive: {
        backgroundColor: '#FEF2F2',
        borderColor: Colors.coral,
    },
    categoryText: {
        ...Typography.bodySmall,
        color: Colors.gray700,
    },
    categoryTextActive: {
        color: Colors.coral,
        fontWeight: '700',
    },
    divider: {
        height: 1,
        backgroundColor: Colors.gray200,
        marginVertical: Spacing.xl,
    },
    caseCard: {
        backgroundColor: Colors.warmOffWhite,
        borderRadius: 8,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    caseRef: {
        ...Typography.labelSmall,
        color: Colors.deepPlum,
    },
    caseCategory: {
        ...Typography.bodySmall,
        color: Colors.gray600,
        fontWeight: '600',
    },
    caseDesc: {
        ...Typography.bodySmall,
        color: Colors.gray700,
        marginTop: 4,
    },
    resolutionBox: {
        marginTop: Spacing.sm,
        padding: Spacing.sm,
        backgroundColor: Colors.white,
        borderRadius: 6,
        borderLeftWidth: 3,
        borderLeftColor: '#166534',
    },
    resolutionTitle: {
        ...Typography.labelSmall,
        color: '#166534',
    },
    resolutionText: {
        ...Typography.bodySmall,
        color: Colors.gray600,
        marginTop: 2,
    },
    emptyText: {
        ...Typography.bodyMedium,
        color: Colors.gray500,
        fontStyle: 'italic',
    },
});
