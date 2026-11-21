import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { OwnerApi } from '../../../../src/api/owner';
import { PropertyPricingData } from '../../../../src/api/types';
import { Badge } from '../../../../src/components/Badge';
import { Button } from '../../../../src/components/Button';
import { Input } from '../../../../src/components/Input';
import { Colors } from '../../../../src/theme/colors';
import { BorderRadius, Spacing } from '../../../../src/theme/spacing';
import { Typography } from '../../../../src/theme/typography';
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    Sparkles,
} from 'lucide-react-native';

export default function PropertyPricingScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const propertyId = Number(id);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [pricingData, setPricingData] = useState<PropertyPricingData | null>(
        null,
    );

    // Food configuration
    const [foodProvided, setFoodProvided] = useState(false);
    const [breakfastIncluded, setBreakfastIncluded] = useState(false);
    const [lunchIncluded, setLunchIncluded] = useState(false);
    const [dinnerIncluded, setDinnerIncluded] = useState(false);

    // Rates map by room_type_id: { dailyRupees: string, weeklyRupees: string, monthlyRupees: string }
    const [ratesMap, setRatesMap] = useState<
        Record<
            number,
            {
                daily: string;
                weekly: string;
                monthly: string;
            }
        >
    >({});

    useEffect(() => {
        if (propertyId) {
            void loadPricing();
        }
    }, [propertyId]);

    const loadPricing = async () => {
        try {
            setLoading(true);
            const res = await OwnerApi.getPricing(propertyId);
            if (res.data) {
                setPricingData(res.data);
                setFoodProvided(res.data.food.provided);
                setBreakfastIncluded(res.data.food.breakfast);
                setLunchIncluded(res.data.food.lunch);
                setDinnerIncluded(res.data.food.dinner);

                const map: Record<
                    number,
                    { daily: string; weekly: string; monthly: string }
                > = {};
                res.data.room_types.forEach((rt) => {
                    map[rt.id] = {
                        daily:
                            rt.daily_rate_minor !== null &&
                            rt.daily_rate_minor !== undefined
                                ? String(Math.floor(rt.daily_rate_minor / 100))
                                : '',
                        weekly:
                            rt.weekly_rate_minor !== null &&
                            rt.weekly_rate_minor !== undefined
                                ? String(Math.floor(rt.weekly_rate_minor / 100))
                                : '',
                        monthly:
                            rt.monthly_rate_minor !== null &&
                            rt.monthly_rate_minor !== undefined
                                ? String(
                                      Math.floor(rt.monthly_rate_minor / 100),
                                  )
                                : '',
                    };
                });
                setRatesMap(map);
            }
        } catch (e: any) {
            Alert.alert(
                'Failed to Load Pricing',
                e.message ||
                    'Unable to retrieve property rates and meal configuration.',
            );
        } finally {
            setLoading(false);
        }
    };

    const handleRateChange = (
        roomTypeId: number,
        period: 'daily' | 'weekly' | 'monthly',
        val: string,
    ) => {
        const clean = val.replace(/[^0-9]/g, '');
        setRatesMap((prev) => ({
            ...prev,
            [roomTypeId]: {
                ...prev[roomTypeId],
                [period]: clean,
            },
        }));
    };

    const handleSave = async () => {
        if (
            foodProvided &&
            !breakfastIncluded &&
            !lunchIncluded &&
            !dinnerIncluded
        ) {
            Alert.alert(
                'Meal Selection Required',
                'When food is provided, select at least one included meal (Breakfast, Lunch, or Dinner), or toggle food off.',
            );
            return;
        }

        setSaving(true);
        try {
            const formattedRoomTypes = (pricingData?.room_types || []).map(
                (rt) => {
                    const row = ratesMap[rt.id] || {
                        daily: '',
                        weekly: '',
                        monthly: '',
                    };
                    return {
                        id: rt.id,
                        daily_rate_minor: row.daily
                            ? Number(row.daily) * 100
                            : null,
                        weekly_rate_minor: row.weekly
                            ? Number(row.weekly) * 100
                            : null,
                        monthly_rate_minor: row.monthly
                            ? Number(row.monthly) * 100
                            : null,
                    };
                },
            );

            const payload = {
                food_provided: foodProvided,
                breakfast_included: breakfastIncluded,
                lunch_included: lunchIncluded,
                dinner_included: dinnerIncluded,
                room_types: formattedRoomTypes,
            };

            const res = await OwnerApi.updatePricing(propertyId, payload);
            if (res.data) {
                setPricingData(res.data);
                Alert.alert(
                    'Rates Saved',
                    'Your standard rates, seasonal basis, and meal inclusions have been updated successfully.',
                );
            }
        } catch (e: any) {
            Alert.alert(
                'Save Error',
                e.message || 'Failed to update rates. Please check inputs.',
            );
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.center}>
                <ActivityIndicator size="large" color={Colors.deepPlum} />
                <Text style={styles.loadingText}>
                    Loading rate plans & inventory pricing...
                </Text>
            </SafeAreaView>
        );
    }

    const evaluation = pricingData?.evaluation;

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.backBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <ArrowLeft size={22} color={Colors.deepPlum} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleBox}>
                        <Text style={styles.headerTitle}>
                            Pricing & Meal Settings
                        </Text>
                        <Text style={styles.headerSubtitle} numberOfLines={1}>
                            {pricingData?.property_name ||
                                `Property #${propertyId}`}
                        </Text>
                    </View>
                </View>

                <ScrollView
                    contentContainerStyle={styles.contentContainer}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Readiness Evaluation Card */}
                    <View style={styles.readinessCard}>
                        <View style={styles.readinessHeader}>
                            <Sparkles size={18} color={Colors.deepPlum} />
                            <Text style={styles.readinessTitle}>
                                Inventory Pricing Readiness
                            </Text>
                        </View>
                        <Text style={styles.readinessDesc}>
                            Rates are configured in Indian Rupees (₹) and stored
                            as integer paise. Rates apply per guest for shared
                            rooms, or per room for private configurations.
                        </Text>
                        <View style={styles.readinessStats}>
                            <View style={styles.statPill}>
                                <Text style={styles.statLabel}>
                                    Active Categories
                                </Text>
                                <Text style={styles.statValue}>
                                    {evaluation?.active_room_types_count ?? 0}
                                </Text>
                            </View>
                            <View style={styles.statPill}>
                                <Text style={styles.statLabel}>Configured</Text>
                                <Text style={styles.statValue}>
                                    {evaluation?.configured_room_types_count ??
                                        0}
                                </Text>
                            </View>
                            <View style={styles.statPill}>
                                <Text style={styles.statLabel}>
                                    Missing Rates
                                </Text>
                                <Text
                                    style={[
                                        styles.statValue,
                                        evaluation &&
                                        evaluation.missing_pricing_count > 0
                                            ? { color: Colors.rose }
                                            : { color: Colors.emerald },
                                    ]}
                                >
                                    {evaluation?.missing_pricing_count ?? 0}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Meal Configuration Section */}
                    <Text style={styles.sectionTitle}>
                        1. Daily Food & Meal Inclusions
                    </Text>
                    <View style={styles.switchCard}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.switchTitle}>
                                Food Provided by Stay
                            </Text>
                            <Text style={styles.switchSubtitle}>
                                Configure food availability and included meals
                            </Text>
                        </View>
                        <Switch
                            value={foodProvided}
                            onValueChange={setFoodProvided}
                            trackColor={{
                                false: Colors.gray300,
                                true: Colors.coral,
                            }}
                            thumbColor={Colors.white}
                        />
                    </View>

                    {foodProvided && (
                        <View style={styles.mealOptionsBox}>
                            <Text style={styles.mealsIncludedHeading}>
                                Select Included Meals:
                            </Text>
                            <TouchableOpacity
                                style={styles.mealCheckRow}
                                onPress={() => setBreakfastIncluded((v) => !v)}
                                activeOpacity={0.8}
                            >
                                <CheckCircle2
                                    size={20}
                                    color={
                                        breakfastIncluded
                                            ? Colors.coral
                                            : Colors.gray300
                                    }
                                />
                                <Text style={styles.mealCheckLabel}>
                                    Breakfast Included
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.mealCheckRow}
                                onPress={() => setLunchIncluded((v) => !v)}
                                activeOpacity={0.8}
                            >
                                <CheckCircle2
                                    size={20}
                                    color={
                                        lunchIncluded
                                            ? Colors.coral
                                            : Colors.gray300
                                    }
                                />
                                <Text style={styles.mealCheckLabel}>
                                    Lunch Included
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.mealCheckRow}
                                onPress={() => setDinnerIncluded((v) => !v)}
                                activeOpacity={0.8}
                            >
                                <CheckCircle2
                                    size={20}
                                    color={
                                        dinnerIncluded
                                            ? Colors.coral
                                            : Colors.gray300
                                    }
                                />
                                <Text style={styles.mealCheckLabel}>
                                    Dinner Included
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Standard Rates Section */}
                    <Text
                        style={[styles.sectionTitle, { marginTop: Spacing.xl }]}
                    >
                        2. Room Category Standard Rates
                    </Text>

                    {pricingData?.room_types &&
                    pricingData.room_types.length > 0 ? (
                        pricingData.room_types.map((rt) => {
                            const curRates = ratesMap[rt.id] || {
                                daily: '',
                                weekly: '',
                                monthly: '',
                            };
                            return (
                                <View
                                    key={rt.id}
                                    style={styles.roomTypePricingCard}
                                >
                                    <View style={styles.cardHeader}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.roomTypeName}>
                                                {rt.name}
                                            </Text>
                                            <Text style={styles.pricingBasis}>
                                                Basis:{' '}
                                                {rt.pricing_basis ===
                                                'per_guest'
                                                    ? 'Per Guest'
                                                    : 'Per Room'}{' '}
                                                •{' '}
                                                {rt.is_air_conditioned
                                                    ? 'AC'
                                                    : 'Non-AC'}
                                            </Text>
                                        </View>
                                        <Badge
                                            label={
                                                rt.accommodation_mode_label ||
                                                rt.accommodation_mode
                                            }
                                            variant="secondary"
                                        />
                                    </View>

                                    <View style={styles.rateInputsRow}>
                                        <View style={styles.rateInputCol}>
                                            <Input
                                                label="Daily (₹/day)"
                                                placeholder="e.g. 800"
                                                value={curRates.daily}
                                                onChangeText={(v) =>
                                                    handleRateChange(
                                                        rt.id,
                                                        'daily',
                                                        v,
                                                    )
                                                }
                                                keyboardType="numeric"
                                            />
                                        </View>
                                        <View style={styles.rateInputCol}>
                                            <Input
                                                label="Weekly (₹/wk)"
                                                placeholder="e.g. 5000"
                                                value={curRates.weekly}
                                                onChangeText={(v) =>
                                                    handleRateChange(
                                                        rt.id,
                                                        'weekly',
                                                        v,
                                                    )
                                                }
                                                keyboardType="numeric"
                                            />
                                        </View>
                                        <View style={styles.rateInputCol}>
                                            <Input
                                                label="Monthly (₹/mo)"
                                                placeholder="e.g. 15000"
                                                value={curRates.monthly}
                                                onChangeText={(v) =>
                                                    handleRateChange(
                                                        rt.id,
                                                        'monthly',
                                                        v,
                                                    )
                                                }
                                                keyboardType="numeric"
                                            />
                                        </View>
                                    </View>
                                </View>
                            );
                        })
                    ) : (
                        <View style={styles.emptyRoomsBox}>
                            <AlertCircle size={32} color={Colors.gray400} />
                            <Text style={styles.emptyRoomsTitle}>
                                No Room Categories Configured
                            </Text>
                            <Text style={styles.emptyRoomsDesc}>
                                Add at least one room category to configure
                                pricing and make this property bookable.
                            </Text>
                            <Button
                                title="Manage Room Types"
                                variant="outline"
                                onPress={() =>
                                    router.push(
                                        `/(partner)/properties/${propertyId}/room-types` as any,
                                    )
                                }
                                style={{ marginTop: Spacing.md }}
                            />
                        </View>
                    )}

                    {/* Save Button */}
                    <View style={styles.actionsBox}>
                        <Button
                            title="Save Pricing & Meal Plans"
                            onPress={handleSave}
                            variant="primary"
                            loading={saving}
                        />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.white,
    },
    loadingText: {
        marginTop: Spacing.md,
        fontSize: Typography.fontSize.sm,
        color: Colors.gray600,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray100,
    },
    backBtn: {
        paddingRight: Spacing.md,
    },
    headerTitleBox: {
        flex: 1,
    },
    headerTitle: {
        fontSize: Typography.fontSize.lg,
        fontWeight: '700',
        color: Colors.deepPlum,
    },
    headerSubtitle: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
        marginTop: 2,
    },
    contentContainer: {
        padding: Spacing.lg,
        paddingBottom: Spacing.xxl * 2,
    },
    readinessCard: {
        backgroundColor: Colors.cream,
        padding: Spacing.base,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.softPeach,
        marginBottom: Spacing.lg,
    },
    readinessHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    readinessTitle: {
        fontSize: Typography.fontSize.sm,
        fontWeight: '700',
        color: Colors.deepPlum,
        marginLeft: Spacing.xs,
    },
    readinessDesc: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray700,
        lineHeight: 18,
        marginBottom: Spacing.md,
    },
    readinessStats: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    statPill: {
        flex: 1,
        backgroundColor: Colors.white,
        padding: Spacing.sm,
        borderRadius: BorderRadius.sm,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: Colors.gray500,
        textTransform: 'uppercase',
    },
    statValue: {
        fontSize: Typography.fontSize.base,
        fontWeight: '700',
        color: Colors.gray900,
        marginTop: 2,
    },
    sectionTitle: {
        fontSize: Typography.fontSize.base,
        fontWeight: '700',
        color: Colors.gray900,
        marginBottom: Spacing.xs,
    },
    switchCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.gray50,
        padding: Spacing.base,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    switchTitle: {
        fontSize: Typography.fontSize.sm,
        fontWeight: '700',
        color: Colors.gray900,
    },
    switchSubtitle: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
        marginTop: 2,
    },
    mealOptionsBox: {
        marginTop: Spacing.md,
        backgroundColor: Colors.gray50,
        padding: Spacing.base,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    mealsIncludedHeading: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '700',
        color: Colors.gray700,
        marginBottom: Spacing.sm,
        textTransform: 'uppercase',
    },
    mealCheckRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.xs,
    },
    mealCheckLabel: {
        fontSize: Typography.fontSize.sm,
        fontWeight: '500',
        color: Colors.gray800,
        marginLeft: Spacing.sm,
    },
    roomTypePricingCard: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
        padding: Spacing.base,
        marginBottom: Spacing.md,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: Spacing.md,
    },
    roomTypeName: {
        fontSize: Typography.fontSize.sm,
        fontWeight: '700',
        color: Colors.gray900,
    },
    pricingBasis: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
        marginTop: 2,
    },
    rateInputsRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    rateInputCol: {
        flex: 1,
    },
    emptyRoomsBox: {
        backgroundColor: Colors.gray50,
        padding: Spacing.xl,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    emptyRoomsTitle: {
        fontSize: Typography.fontSize.base,
        fontWeight: '700',
        color: Colors.gray800,
        marginTop: Spacing.sm,
    },
    emptyRoomsDesc: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
        textAlign: 'center',
        marginTop: Spacing.xs,
        lineHeight: 18,
    },
    actionsBox: {
        marginTop: Spacing.xl,
    },
});
