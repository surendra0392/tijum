import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { OwnerApi } from '../../../../src/api/owner';
import {
    OwnerReferenceData,
    PropertyDetail,
    PropertyVerificationEvaluation,
} from '../../../../src/api/types';
import { Badge } from '../../../../src/components/Badge';
import { Button } from '../../../../src/components/Button';
import { Input } from '../../../../src/components/Input';
import {
    CANONICAL_CATEGORIES,
    CanonicalCategorySlug,
} from '../../../../src/constants/categories';
import { Colors } from '../../../../src/theme/colors';
import { BorderRadius, Spacing } from '../../../../src/theme/spacing';
import { Typography } from '../../../../src/theme/typography';
import { ArrowLeft, Building2, FileCheck } from 'lucide-react-native';

export default function EditPropertyScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const propertyId = Number(id);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [submittingVerification, setSubmittingVerification] = useState(false);
    const [property, setProperty] = useState<PropertyDetail | null>(null);
    const [refData, setRefData] = useState<OwnerReferenceData | null>(null);
    const [evalStatus, setEvalStatus] =
        useState<PropertyVerificationEvaluation | null>(null);

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

    useEffect(() => {
        if (propertyId) {
            void loadInitialData();
        }
    }, [propertyId]);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            const [propRes, refRes, evalRes] = await Promise.all([
                OwnerApi.getProperty(propertyId),
                OwnerApi.getReferenceData(),
                OwnerApi.getVerificationStatus(propertyId),
            ]);

            if (propRes.data) {
                const p = propRes.data;
                setProperty(p);
                setName(p.name);
                setDescription(p.description || '');
                setContactName((p as any).contact_person_name || '');
                setContactPhone((p as any).contact_phone || '');
                setContactEmail((p as any).contact_email || '');
                setLocality(p.locality || '');
                setAddressLine1(
                    p.address_line || (p as any).address_line_1 || '',
                );
                setAddressLine2((p as any).address_line_2 || '');
                setLandmark(p.landmark || '');
                setPostalCode(p.pincode || (p as any).postal_code || '');

                if (p.city?.id) {
                    setSelectedCityId(p.city.id);
                }
                const catSlug =
                    (p.category?.slug as CanonicalCategorySlug) || 'hostels-pg';
                if (CANONICAL_CATEGORIES.some((c) => c.slug === catSlug)) {
                    setSelectedCategorySlug(catSlug);
                }
            }
            if (refRes.data) {
                setRefData(refRes.data);
            }
            if (evalRes.data) {
                setEvalStatus(evalRes.data);
            }
        } catch (e: any) {
            Alert.alert(
                'Load Failed',
                e.message || 'Unable to load property details.',
            );
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Validation Error', 'Property name is required.');
            return;
        }
        if (!/^[6-9]\d{9}$/.test(contactPhone.trim())) {
            Alert.alert(
                'Validation Error',
                'Enter a valid 10-digit Indian phone number.',
            );
            return;
        }

        const matchedCategory = refData?.categories.find(
            (c) => c.slug === selectedCategorySlug,
        );
        const categoryId = matchedCategory?.id || property?.category?.id || 1;

        setSaving(true);
        try {
            const payload = {
                name: name.trim(),
                category_id: categoryId,
                city_id: selectedCityId || property?.city?.id || 1,
                description: description.trim(),
                contact_person_name: contactName.trim() || name.trim(),
                contact_phone: contactPhone.trim(),
                contact_email: contactEmail.trim() || undefined,
                address_line_1: addressLine1.trim(),
                address_line_2: addressLine2.trim() || undefined,
                locality: locality.trim(),
                landmark: landmark.trim() || undefined,
                postal_code: postalCode.trim() || '500081',
            };

            await OwnerApi.updateProperty(propertyId, payload);
            Alert.alert('Updated', 'Property details updated successfully.');
            await loadInitialData();
        } catch (e: any) {
            Alert.alert(
                'Update Error',
                e.message || 'Failed to update property.',
            );
        } finally {
            setSaving(false);
        }
    };

    const handleSubmitForVerification = () => {
        Alert.alert(
            'Submit for Admin Review',
            'Are you sure you want to submit this accommodation for verification? Our operations team will review your photos, room types, and rates.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm & Submit',
                    onPress: async () => {
                        setSubmittingVerification(true);
                        try {
                            await OwnerApi.submitVerification(propertyId, true);
                            Alert.alert(
                                'Submitted for Verification',
                                'Your property application has been submitted to TIJUM administrators. You will be notified once reviewed.',
                            );
                            await loadInitialData();
                        } catch (e: any) {
                            Alert.alert('Submission Error', e.message);
                        } finally {
                            setSubmittingVerification(false);
                        }
                    },
                },
            ],
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.center}>
                <ActivityIndicator size="large" color={Colors.deepPlum} />
                <Text style={styles.loadingText}>
                    Loading property details...
                </Text>
            </SafeAreaView>
        );
    }

    const isVerified = property?.is_verified;
    const application = evalStatus?.application;

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
                            Edit Property Details
                        </Text>
                        <Text style={styles.headerSubtitle} numberOfLines={1}>
                            {(property as any)?.property_reference ||
                                `ID #${propertyId}`}{' '}
                            • {property?.name}
                        </Text>
                    </View>
                </View>

                <ScrollView
                    contentContainerStyle={styles.contentContainer}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Verification Status Card */}
                    <View style={styles.statusCard}>
                        <View style={styles.statusHeader}>
                            <FileCheck size={18} color={Colors.deepPlum} />
                            <Text style={styles.statusTitle}>
                                Verification Status
                            </Text>
                            <Badge
                                label={
                                    application?.status_label ||
                                    (isVerified ? 'Verified' : 'Draft')
                                }
                                variant={isVerified ? 'accent' : 'secondary'}
                            />
                        </View>
                        <Text style={styles.statusDesc}>
                            {isVerified
                                ? 'This property is verified and live on the customer marketplace.'
                                : application?.status === 'submitted'
                                  ? 'Your submission is under administrative review.'
                                  : 'Draft accommodation. Complete details, room categories, and rates before submitting.'}
                        </Text>

                        {!isVerified && application?.status !== 'submitted' && (
                            <Button
                                title="Submit Property for Verification"
                                variant="secondary"
                                onPress={handleSubmitForVerification}
                                loading={submittingVerification}
                                style={{ marginTop: Spacing.sm }}
                            />
                        )}
                    </View>

                    {/* Accommodation Category */}
                    <Text style={styles.sectionTitle}>
                        1. Accommodation Category
                    </Text>
                    <View style={styles.categoryPills}>
                        {CANONICAL_CATEGORIES.map((cat) => {
                            const isSelected =
                                selectedCategorySlug === cat.slug;
                            return (
                                <TouchableOpacity
                                    key={cat.slug}
                                    style={[
                                        styles.categoryPill,
                                        isSelected && styles.categoryPillActive,
                                    ]}
                                    onPress={() =>
                                        setSelectedCategorySlug(cat.slug)
                                    }
                                >
                                    <Building2
                                        size={14}
                                        color={
                                            isSelected
                                                ? Colors.white
                                                : Colors.gray700
                                        }
                                        style={{ marginRight: 4 }}
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

                    {/* Basic Info */}
                    <Text
                        style={[styles.sectionTitle, { marginTop: Spacing.lg }]}
                    >
                        2. General Information
                    </Text>
                    <Input
                        label="Property Name *"
                        value={name}
                        onChangeText={setName}
                    />
                    <Input
                        label="Description *"
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={4}
                        style={{ minHeight: 90 }}
                    />
                    <Input
                        label="Contact Person Name *"
                        value={contactName}
                        onChangeText={setContactName}
                    />
                    <Input
                        label="Contact Mobile (10 digits) *"
                        value={contactPhone}
                        onChangeText={setContactPhone}
                        keyboardType="phone-pad"
                        maxLength={10}
                    />
                    <Input
                        label="Contact Email"
                        value={contactEmail}
                        onChangeText={setContactEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />

                    {/* Address & Location */}
                    <Text
                        style={[styles.sectionTitle, { marginTop: Spacing.lg }]}
                    >
                        3. Location & Address
                    </Text>
                    <Input
                        label="Locality / Area *"
                        value={locality}
                        onChangeText={setLocality}
                    />
                    <Input
                        label="Address Line 1 *"
                        value={addressLine1}
                        onChangeText={setAddressLine1}
                    />
                    <Input
                        label="Address Line 2"
                        value={addressLine2}
                        onChangeText={setAddressLine2}
                    />
                    <Input
                        label="Landmark"
                        value={landmark}
                        onChangeText={setLandmark}
                    />
                    <Input
                        label="PIN Code *"
                        value={postalCode}
                        onChangeText={setPostalCode}
                        keyboardType="number-pad"
                        maxLength={6}
                    />

                    {/* Save Button */}
                    <View style={styles.actionsBox}>
                        <Button
                            title="Save Changes"
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
    statusCard: {
        backgroundColor: Colors.cream,
        padding: Spacing.base,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.softPeach,
        marginBottom: Spacing.lg,
    },
    statusHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    statusTitle: {
        fontSize: Typography.fontSize.sm,
        fontWeight: '700',
        color: Colors.deepPlum,
        flex: 1,
        marginLeft: Spacing.xs,
    },
    statusDesc: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray700,
        lineHeight: 18,
    },
    sectionTitle: {
        fontSize: Typography.fontSize.base,
        fontWeight: '700',
        color: Colors.gray900,
        marginBottom: Spacing.sm,
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
    actionsBox: {
        marginTop: Spacing.xl,
    },
});
