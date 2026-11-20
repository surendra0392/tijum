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
import { useRouter } from 'expo-router';
import { OwnerApi } from '../../../src/api/owner';
import { City, OwnerReferenceData } from '../../../src/api/types';
import { Button } from '../../../src/components/Button';
import { Input } from '../../../src/components/Input';
import {
    CANONICAL_CATEGORIES,
    CanonicalCategorySlug,
    getCategoryDisplayName,
} from '../../../src/constants/categories';
import { Colors } from '../../../src/theme/colors';
import { BorderRadius, Spacing } from '../../../src/theme/spacing';
import { Typography } from '../../../src/theme/typography';
import {
    ArrowLeft,
    Building2,
    CheckCircle2,
    MapPin,
    Utensils,
} from 'lucide-react-native';

const FALLBACK_REF_DATA: OwnerReferenceData = {
    categories: [
        { id: 4, name: 'Hostels/PG', slug: 'hostels-pg', code: 'hostel_pg' } as any,
        { id: 5, name: 'Homestays', slug: 'homestays', code: 'homestay' } as any,
        { id: 6, name: 'Co-Living', slug: 'co-living', code: 'coliving' } as any,
    ],
    cities: [
        { id: 1, name: 'Hyderabad', slug: 'hyderabad' } as any,
        { id: 2, name: 'Guntur', slug: 'guntur' } as any,
        { id: 3, name: 'Vijayawada', slug: 'vijayawada' } as any,
        { id: 4, name: 'Visakhapatnam', slug: 'visakhapatnam' } as any,
    ],
    amenities: [
        { id: 1, name: 'High-speed Wi-Fi', slug: 'wifi' } as any,
        { id: 2, name: 'Air Conditioning', slug: 'ac' } as any,
        { id: 3, name: 'Power Backup', slug: 'power-backup' } as any,
        { id: 4, name: 'CCTV Security', slug: 'cctv' } as any,
    ],
} as unknown as OwnerReferenceData;

export default function CreatePropertyScreen() {
    const router = useRouter();
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [loadingRefData, setLoadingRefData] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [refData, setRefData] = useState<OwnerReferenceData | null>(null);

    // Form fields
    const [name, setName] = useState('');
    const [selectedCategorySlug, setSelectedCategorySlug] =
        useState<CanonicalCategorySlug>('hostels-pg');
    const [description, setDescription] = useState('');
    const [contactName, setContactName] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [contactEmail, setContactEmail] = useState('');

    const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
    const [locality, setLocality] = useState('');
    const [addressLine1, setAddressLine1] = useState('');
    const [addressLine2, setAddressLine2] = useState('');
    const [landmark, setLandmark] = useState('');
    const [postalCode, setPostalCode] = useState('');

    const [foodProvided, setFoodProvided] = useState(false);
    const [breakfastIncluded, setBreakfastIncluded] = useState(false);
    const [lunchIncluded, setLunchIncluded] = useState(false);
    const [dinnerIncluded, setDinnerIncluded] = useState(false);
    const [declarationAccepted, setDeclarationAccepted] = useState(false);

    // Errors
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        loadReferenceData();
    }, []);

    const loadReferenceData = async () => {
        try {
            setLoadingRefData(true);
            const res = await OwnerApi.getReferenceData();
            if (res.data) {
                setRefData(res.data);
                if (res.data.cities.length > 0) {
                    setSelectedCityId(res.data.cities[0].id);
                }
            }
        } catch {
            setRefData(FALLBACK_REF_DATA);
            setSelectedCityId(FALLBACK_REF_DATA.cities[0].id);
        } finally {
            setLoadingRefData(false);
        }
    };

    const validateStep1 = () => {
        const errs: Record<string, string> = {};
        if (!name.trim()) errs.name = 'Property name is required.';
        if (!description.trim()) errs.description = 'Description is required.';
        if (!contactName.trim())
            errs.contactName = 'Contact person name is required.';
        if (!/^[6-9]\d{9}$/.test(contactPhone.trim())) {
            errs.contactPhone = 'Enter a valid 10-digit Indian mobile number.';
        }
        if (
            contactEmail.trim() &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())
        ) {
            errs.contactEmail = 'Enter a valid email address.';
        }
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const validateStep2 = () => {
        const errs: Record<string, string> = {};
        if (!selectedCityId) errs.city = 'Please select a city.';
        if (!locality.trim()) errs.locality = 'Locality / Area is required.';
        if (!addressLine1.trim())
            errs.addressLine1 = 'Street address is required.';
        if (!/^[1-9][0-9]{5}$/.test(postalCode.trim())) {
            errs.postalCode = 'Enter a valid 6-digit postal code.';
        }
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleNext = () => {
        if (step === 1) {
            if (validateStep1()) setStep(2);
        } else if (step === 2) {
            if (validateStep2()) setStep(3);
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep((s) => (s - 1) as 1 | 2);
        } else {
            router.back();
        }
    };

    const handleSubmit = async () => {
        if (!declarationAccepted) {
            Alert.alert(
                'Declaration Required',
                'Please confirm the declaration confirming the accuracy of your property details.',
            );
            return;
        }

        // Find backend category id
        const matchedCategory = refData?.categories.find(
            (c) => c.slug === selectedCategorySlug,
        );
        const categoryId = matchedCategory?.id || 1;

        setSubmitting(true);
        try {
            const payload = {
                name: name.trim(),
                category_id: categoryId,
                city_id: selectedCityId!,
                description: description.trim(),
                contact_person_name: contactName.trim(),
                contact_phone: contactPhone.trim(),
                contact_email: contactEmail.trim() || undefined,
                address_line_1: addressLine1.trim(),
                address_line_2: addressLine2.trim() || undefined,
                locality: locality.trim(),
                landmark: landmark.trim() || undefined,
                postal_code: postalCode.trim(),
            };

            const res = await OwnerApi.createProperty(payload);
            if (res.data) {
                // If meals provided, save initial pricing/food config
                if (foodProvided) {
                    try {
                        await OwnerApi.updatePricing(res.data.id, {
                            food_provided: true,
                            breakfast_included: breakfastIncluded,
                            lunch_included: lunchIncluded,
                            dinner_included: dinnerIncluded,
                            room_types: [],
                        });
                    } catch (ignore) {
                        // Food config can also be edited later in Pricing tab
                    }
                }

                Alert.alert(
                    'Draft Created',
                    `Your property "${res.data.name}" has been registered as a draft. You can now add room types and pricing.`,
                    [
                        {
                            text: 'OK',
                            onPress: () => router.replace('/(partner)/properties'),
                        },
                    ],
                );
            }
        } catch (e: any) {
            Alert.alert(
                'Submission Error',
                e.message || 'Failed to create property draft. Please check inputs.',
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingRefData) {
        return (
            <SafeAreaView style={styles.center}>
                <ActivityIndicator size="large" color={Colors.deepPlum} />
                <Text style={styles.loadingText}>Loading setup catalog...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                {/* Header with Steps */}
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={handleBack}
                        style={styles.backBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <ArrowLeft size={22} color={Colors.deepPlum} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleBox}>
                        <Text style={styles.headerTitle}>Add New Stay</Text>
                        <Text style={styles.headerSubtitle}>
                            Step {step} of 3: {step === 1 ? 'Basic Information' : step === 2 ? 'Location & Address' : 'Meals & Finalize'}
                        </Text>
                    </View>
                </View>

                {/* Step Progress Bar */}
                <View style={styles.progressBar}>
                    <View
                        style={[
                            styles.progressFill,
                            { width: step === 1 ? '33%' : step === 2 ? '66%' : '100%' },
                        ]}
                    />
                </View>

                <ScrollView
                    contentContainerStyle={styles.contentContainer}
                    showsVerticalScrollIndicator={false}
                >
                    {/* STEP 1: Basic Information */}
                    {step === 1 && (
                        <View>
                            <Text style={styles.sectionTitle}>
                                1. Canonical Category
                            </Text>
                            <Text style={styles.helperText}>
                                Select one of TIJUM's three verified accommodation formats:
                            </Text>
                            <View style={styles.categoryPills}>
                                {CANONICAL_CATEGORIES.map((cat) => {
                                    const isSelected =
                                        selectedCategorySlug === cat.slug;
                                    return (
                                        <TouchableOpacity
                                            key={cat.slug}
                                            activeOpacity={0.8}
                                            onPress={() =>
                                                setSelectedCategorySlug(cat.slug)
                                            }
                                            style={[
                                                styles.categoryPill,
                                                isSelected &&
                                                    styles.categoryPillActive,
                                            ]}
                                        >
                                            <Building2
                                                size={16}
                                                color={
                                                    isSelected
                                                        ? Colors.white
                                                        : Colors.gray700
                                                }
                                                style={{ marginRight: 6 }}
                                            />
                                            <Text
                                                style={[
                                                    styles.categoryPillText,
                                                    isSelected &&
                                                        styles.categoryPillTextActive,
                                                ]}
                                            >
                                                {cat.name}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>
                                2. Property Overview
                            </Text>
                            <Input
                                label="Property Name *"
                                placeholder="e.g. Royal Heritage Stay"
                                value={name}
                                onChangeText={setName}
                                error={errors.name}
                            />
                            <Input
                                label="Detailed Description *"
                                placeholder="Highlight your property atmosphere, student/professional amenities, and location advantages..."
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                numberOfLines={4}
                                style={{ minHeight: 90 }}
                                error={errors.description}
                            />

                            <Text style={[styles.sectionTitle, { marginTop: Spacing.md }]}>
                                3. Primary Contact
                            </Text>
                            <Input
                                label="Host / Contact Person Name *"
                                placeholder="e.g. Rajesh Sharma"
                                value={contactName}
                                onChangeText={setContactName}
                                error={errors.contactName}
                            />
                            <Input
                                label="Contact Mobile Number (10 digits) *"
                                placeholder="9876543210"
                                value={contactPhone}
                                onChangeText={setContactPhone}
                                keyboardType="phone-pad"
                                maxLength={10}
                                error={errors.contactPhone}
                            />
                            <Input
                                label="Contact Email (Optional)"
                                placeholder="host@example.com"
                                value={contactEmail}
                                onChangeText={setContactEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                error={errors.contactEmail}
                            />
                        </View>
                    )}

                    {/* STEP 2: Location */}
                    {step === 2 && (
                        <View>
                            <Text style={styles.sectionTitle}>
                                Operating City & Address
                            </Text>
                            <Text style={styles.helperText}>
                                Select the active TIJUM launch city:
                            </Text>
                            <View style={styles.cityPills}>
                                {refData?.cities.map((city: City) => {
                                    const isSelected = selectedCityId === city.id;
                                    return (
                                        <TouchableOpacity
                                            key={city.id}
                                            activeOpacity={0.8}
                                            onPress={() => setSelectedCityId(city.id)}
                                            style={[
                                                styles.cityPill,
                                                isSelected && styles.cityPillActive,
                                            ]}
                                        >
                                            <MapPin
                                                size={14}
                                                color={isSelected ? Colors.white : Colors.gray700}
                                                style={{ marginRight: 4 }}
                                            />
                                            <Text
                                                style={[
                                                    styles.cityPillText,
                                                    isSelected && styles.cityPillTextActive,
                                                ]}
                                            >
                                                {city.name}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                            {errors.city ? (
                                <Text style={styles.errorInline}>{errors.city}</Text>
                            ) : null}

                            <Input
                                label="Locality / Area *"
                                placeholder="e.g. Madhapur, Koramangala"
                                value={locality}
                                onChangeText={setLocality}
                                error={errors.locality}
                            />
                            <Input
                                label="Street Address Line 1 *"
                                placeholder="e.g. Plot 42, 3rd Cross, Silicon Valley"
                                value={addressLine1}
                                onChangeText={setAddressLine1}
                                error={errors.addressLine1}
                            />
                            <Input
                                label="Street Address Line 2 (Optional)"
                                placeholder="e.g. Opp. Mindspace IT Park"
                                value={addressLine2}
                                onChangeText={setAddressLine2}
                            />
                            <Input
                                label="Landmark (Optional)"
                                placeholder="e.g. Near Metro Pillar 14"
                                value={landmark}
                                onChangeText={setLandmark}
                            />
                            <Input
                                label="Postal PIN Code (6 digits) *"
                                placeholder="500081"
                                value={postalCode}
                                onChangeText={setPostalCode}
                                keyboardType="number-pad"
                                maxLength={6}
                                error={errors.postalCode}
                            />
                        </View>
                    )}

                    {/* STEP 3: Food & Submit */}
                    {step === 3 && (
                        <View>
                            <Text style={styles.sectionTitle}>
                                Meal & Food Inclusions
                            </Text>
                            <Text style={styles.helperText}>
                                Customers see verified meal badges on listing cards. Configure your daily offerings:
                            </Text>

                            <View style={styles.switchCard}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.switchTitle}>
                                        Provide Food / Meals
                                    </Text>
                                    <Text style={styles.switchSubtitle}>
                                        Are prepared meals included with stays?
                                    </Text>
                                </View>
                                <Switch
                                    value={foodProvided}
                                    onValueChange={setFoodProvided}
                                    trackColor={{ false: Colors.gray300, true: Colors.coral }}
                                    thumbColor={Colors.white}
                                />
                            </View>

                            {foodProvided && (
                                <View style={styles.mealOptionsBox}>
                                    <Text style={styles.mealsIncludedHeading}>
                                        Included Daily Meals:
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.mealCheckRow}
                                        onPress={() => setBreakfastIncluded((v) => !v)}
                                        activeOpacity={0.8}
                                    >
                                        <CheckCircle2
                                            size={20}
                                            color={breakfastIncluded ? Colors.coral : Colors.gray300}
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
                                            color={lunchIncluded ? Colors.coral : Colors.gray300}
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
                                            color={dinnerIncluded ? Colors.coral : Colors.gray300}
                                        />
                                        <Text style={styles.mealCheckLabel}>
                                            Dinner Included
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            <View style={[styles.declarationBox, { marginTop: Spacing.xl }]}>
                                <TouchableOpacity
                                    style={styles.declarationRow}
                                    onPress={() => setDeclarationAccepted((v) => !v)}
                                    activeOpacity={0.8}
                                >
                                    <CheckCircle2
                                        size={22}
                                        color={declarationAccepted ? Colors.deepPlum : Colors.gray300}
                                    />
                                    <Text style={styles.declarationText}>
                                        I hereby declare that the property details, location, and operational terms provided are truthful and adhere to TIJUM partner guidelines.
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Step Actions */}
                    <View style={styles.actionsBox}>
                        {step < 3 ? (
                            <Button
                                title="Next Step →"
                                onPress={handleNext}
                                variant="primary"
                            />
                        ) : (
                            <Button
                                title="Create Property Draft"
                                onPress={handleSubmit}
                                variant="primary"
                                loading={submitting}
                            />
                        )}
                        {step > 1 && (
                            <Button
                                title="← Back"
                                onPress={handleBack}
                                variant="outline"
                                style={{ marginTop: Spacing.sm }}
                            />
                        )}
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
    progressBar: {
        height: 4,
        backgroundColor: Colors.gray200,
        width: '100%',
    },
    progressFill: {
        height: '100%',
        backgroundColor: Colors.coral,
    },
    contentContainer: {
        padding: Spacing.lg,
        paddingBottom: Spacing.xxl * 2,
    },
    sectionTitle: {
        fontSize: Typography.fontSize.base,
        fontWeight: '700',
        color: Colors.gray900,
        marginBottom: Spacing.xs,
    },
    helperText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray600,
        marginBottom: Spacing.md,
    },
    categoryPills: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    categoryPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.gray100,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    categoryPillActive: {
        backgroundColor: Colors.deepPlum,
        borderColor: Colors.deepPlum,
    },
    categoryPillText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '600',
        color: Colors.gray700,
    },
    categoryPillTextActive: {
        color: Colors.white,
    },
    cityPills: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    cityPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.gray100,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    cityPillActive: {
        backgroundColor: Colors.coral,
        borderColor: Colors.coral,
    },
    cityPillText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '600',
        color: Colors.gray700,
    },
    cityPillTextActive: {
        color: Colors.white,
    },
    errorInline: {
        color: Colors.rose,
        fontSize: Typography.fontSize.xs,
        marginBottom: Spacing.sm,
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
    declarationBox: {
        backgroundColor: Colors.cream,
        padding: Spacing.base,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.softPeach,
    },
    declarationRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    declarationText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.deepPlum,
        marginLeft: Spacing.sm,
        flex: 1,
        lineHeight: 18,
    },
    actionsBox: {
        marginTop: Spacing.xl,
    },
});
