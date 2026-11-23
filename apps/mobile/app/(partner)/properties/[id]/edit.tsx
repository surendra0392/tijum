import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Switch,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
    ChevronRight,
    CheckCircle2,
    Send,
    Layers,
    DoorOpen,
    IndianRupee,
    Calendar,
    Camera,
    Sparkles,
    FileText,
    Upload,
    Trash2,
    AlertCircle,
} from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../../../src/theme/tokens';
import { Button } from '../../../../src/components/Button';
import { Input } from '../../../../src/components/Input';
import { Badge } from '../../../../src/components/Badge';
import { AppHeader } from '../../../../src/components/AppHeader';
import { RequireAuth } from '../../../../src/components/RequireAuth';
import { ExceptionalState } from '../../../../src/components/ExceptionalState';
import { OwnerApi } from '../../../../src/api/owner';
import {
    OwnerPropertySummary,
    OwnerVerificationDocument,
    PropertyCategory,
    PropertyCategorySlug,
    City,
} from '../../../../src/api/types';
import {
    CANONICAL_CATEGORIES,
    normalizeCategorySlug,
} from '../../../../src/constants/categories';

const DEFAULT_REQUIRED_DOC_TYPES: { type: string; label: string }[] = [
    { type: 'ownership_proof', label: 'Ownership / Lease Proof' },
    { type: 'identity_proof', label: 'Owner Identity Proof' },
    { type: 'address_proof', label: 'Property Address Proof' },
    { type: 'business_registration', label: 'Trade License / Registration' },
];

export default function EditPropertyScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const propertyId = Number(id);

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [submittingVerification, setSubmittingVerification] = useState(false);
    const [property, setProperty] = useState<OwnerPropertySummary | null>(null);
    const [categories, setCategories] = useState<PropertyCategory[]>([]);
    const [cities, setCities] = useState<City[]>([]);

    // Verification & Document state
    const [verifStatus, setVerifStatus] = useState<string>('draft');
    const [missingRequirements, setMissingRequirements] = useState<string[]>([]);
    const [decisionReason, setDecisionReason] = useState<string | null>(null);
    const [requestedChanges, setRequestedChanges] = useState<string | null>(null);
    const [documents, setDocuments] = useState<OwnerVerificationDocument[]>([]);
    const [requiredDocTypes, setRequiredDocTypes] = useState<
        { type: string; label: string }[]
    >(DEFAULT_REQUIRED_DOC_TYPES);
    const [selectedDocType, setSelectedDocType] = useState<string>('ownership_proof');
    const [docNotes, setDocNotes] = useState<string>('');
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const [deletingDocId, setDeletingDocId] = useState<number | null>(null);

    // Core Fields
    const [name, setName] = useState('');
    const [categorySlug, setCategorySlug] = useState<PropertyCategorySlug>('hostels-pg');
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
    const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
    const [locality, setLocality] = useState('');
    const [addressLine, setAddressLine] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [shortDescription, setShortDescription] = useState('');

    // Food & Meal Flags
    const [foodAvailable, setFoodAvailable] = useState(false);
    const [breakfastIncluded, setBreakfastIncluded] = useState(false);
    const [lunchIncluded, setLunchIncluded] = useState(false);
    const [dinnerIncluded, setDinnerIncluded] = useState(false);

    const loadInitialData = useCallback(async () => {
        if (!propertyId || Number.isNaN(propertyId)) {
            setLoadError('Invalid property identifier.');
            setLoading(false);
            return;
        }
        setLoading(true);
        setLoadError(null);
        try {
            const [refRes, propRes, verifRes, docsRes] = await Promise.all([
                OwnerApi.getReferenceData().catch(() => null),
                OwnerApi.getProperty(propertyId),
                OwnerApi.getPropertyVerification(propertyId).catch(() => null),
                OwnerApi.getPropertyDocuments(propertyId).catch(() => null),
            ]);

            const loadedCats = refRes?.data?.categories || [];
            const loadedCities = refRes?.data?.cities || [];
            setCategories(loadedCats);
            setCities(loadedCities);

            const p = propRes.data;
            setProperty(p);
            setName(p.name || '');

            const rawSlug =
                typeof p.category === 'string'
                    ? p.category
                    : p.category?.slug;
            if (rawSlug) {
                setCategorySlug(normalizeCategorySlug(rawSlug) || 'hostels-pg');
            }
            const rawCatId =
                typeof p.category === 'object' ? p.category?.id : undefined;
            if (rawCatId) {
                setSelectedCategoryId(rawCatId);
            } else if (loadedCats.length > 0 && rawSlug) {
                const matched = loadedCats.find(
                    (c: PropertyCategory) =>
                        normalizeCategorySlug(c.slug) ===
                        normalizeCategorySlug(rawSlug),
                );
                if (matched) {
                    setSelectedCategoryId(matched.id);
                }
            }

            const rawCityId =
                typeof p.city === 'object' ? p.city?.id : undefined;
            if (rawCityId) {
                setSelectedCityId(rawCityId);
            } else if (loadedCities.length > 0) {
                setSelectedCityId(loadedCities[0].id);
            }

            setLocality(p.locality || (p as any).area || '');
            setAddressLine(p.address_line_1 || p.address_line || '');
            setPostalCode(p.postal_code || '');
            setShortDescription((p as any).short_description || p.description || '');

            setFoodAvailable(Boolean(p.food_provided ?? (p as any).food_available));
            setBreakfastIncluded(Boolean(p.breakfast_included));
            setLunchIncluded(Boolean(p.lunch_included));
            setDinnerIncluded(Boolean(p.dinner_included));

            // Verification state
            const vData = verifRes?.data;
            const latestApp = vData?.latest_application || vData?.application;
            const resolvedVerifStatus =
                latestApp?.status ||
                vData?.property?.verification_status ||
                (p as any).verification_status ||
                p.status ||
                'draft';
            setVerifStatus(resolvedVerifStatus);

            const missing =
                vData?.evaluation?.missing_requirements ||
                vData?.evaluation?.blocking_reasons ||
                (p as any).missing_requirements ||
                [];
            setMissingRequirements(Array.isArray(missing) ? missing : []);
            setDecisionReason(
                latestApp?.decision_reason || (p as any).decision_reason || null,
            );
            setRequestedChanges(
                latestApp?.requested_changes ||
                    (p as any).requested_changes ||
                    null,
            );

            if (docsRes?.data) {
                setDocuments(docsRes.data.documents || []);
                if (
                    Array.isArray(docsRes.data.required_types) &&
                    docsRes.data.required_types.length > 0
                ) {
                    const mappedTypes = docsRes.data.required_types.map(
                        (rt: string | { type: string; label: string }) =>
                            typeof rt === 'string'
                                ? {
                                      type: rt,
                                      label: rt
                                          .replace(/_/g, ' ')
                                          .replace(/\b\w/g, (c: string) =>
                                              c.toUpperCase(),
                                          ),
                                  }
                                : rt,
                    );
                    setRequiredDocTypes(mappedTypes);
                    setSelectedDocType(mappedTypes[0].type);
                }
            }
        } catch (err: unknown) {
            const msg =
                err instanceof Error ? err.message : 'Unable to load property details.';
            setLoadError(msg);
        } finally {
            setLoading(false);
        }
    }, [propertyId]);

    useEffect(() => {
        loadInitialData().catch(() => {});
    }, [loadInitialData]);

    const handleSelectCategory = (slug: PropertyCategorySlug) => {
        setCategorySlug(slug);
        const matched = categories.find((c) => normalizeCategorySlug(c.slug) === slug);
        if (matched) {
            setSelectedCategoryId(matched.id);
        }
    };

    const handleSave = async () => {
        if (!name.trim() || !addressLine.trim() || !locality.trim()) {
            Alert.alert('Validation Error', 'Name, locality, and street address are required.');
            return;
        }

        const matchedCategory = categories.find(
            (c) => normalizeCategorySlug(c.slug) === categorySlug,
        );
        const existingCatId =
            typeof property?.category === 'object'
                ? property.category?.id
                : undefined;
        const resolvedCategoryId =
            matchedCategory?.id || selectedCategoryId || existingCatId;
        if (!resolvedCategoryId) {
            Alert.alert('Validation Error', 'Please select a valid accommodation category.');
            return;
        }

        const existingCityId =
            typeof property?.city === 'object' ? property.city?.id : undefined;
        const resolvedCityId = selectedCityId || existingCityId;
        if (!resolvedCityId) {
            Alert.alert('Validation Error', 'Please select a city for this property.');
            return;
        }

        if (postalCode.trim() && !/^\d{6}$/.test(postalCode.trim())) {
            Alert.alert('Validation Error', 'Postal PIN code must be a valid 6-digit number.');
            return;
        }

        setSaving(true);
        try {
            const res = await OwnerApi.updateProperty(propertyId, {
                name: name.trim(),
                category_id: resolvedCategoryId,
                city_id: resolvedCityId,
                locality: locality.trim(),
                address_line_1: addressLine.trim(),
                postal_code: postalCode.trim() || undefined,
                short_description: shortDescription.trim(),
                food_provided: foodAvailable,
                breakfast_included: foodAvailable ? breakfastIncluded : false,
                lunch_included: foodAvailable ? lunchIncluded : false,
                dinner_included: foodAvailable ? dinnerIncluded : false,
            });
            setProperty(res.data);
            Alert.alert('Saved', 'Property details updated successfully.');
        } catch (err: unknown) {
            const message =
                (err as { response?: { data?: { message?: string } } })?.response?.data
                    ?.message || 'Could not update property details.';
            Alert.alert('Save Failed', message);
        } finally {
            setSaving(false);
        }
    };

    const handleSubmitForVerification = async () => {
        setSubmittingVerification(true);
        try {
            await OwnerApi.submitPropertyVerification(
                propertyId,
                'Submitted via TIJUM Partner App',
            );
            Alert.alert(
                'Verification Submitted',
                'Your property has been submitted to the TIJUM moderation team for review.',
            );
            await loadInitialData();
        } catch (err: unknown) {
            const message =
                (err as { response?: { data?: { message?: string } } })?.response?.data
                    ?.message ||
                'Ensure you have configured at least 1 Room Type, 1 Physical Room, and required photos/documents before submitting.';
            Alert.alert('Cannot Submit Yet', message);
        } finally {
            setSubmittingVerification(false);
        }
    };

    const handlePickAndUploadDocument = async () => {
        try {
            const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!perm.granted) {
                Alert.alert(
                    'Permission Required',
                    'Please allow photo library access to upload verification documents.',
                );
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                quality: 0.85,
            });

            if (result.canceled || !result.assets || result.assets.length === 0) {
                return;
            }

            const asset = result.assets[0];
            const formData = new FormData();
            formData.append('document_type', selectedDocType);
            if (docNotes.trim()) {
                formData.append('notes', docNotes.trim());
            }

            const fileName =
                asset.fileName ||
                `${selectedDocType}-${Date.now()}.${asset.mimeType?.split('/')[1] || 'jpg'}`;
            const mimeType = asset.mimeType || 'image/jpeg';

            formData.append('file', {
                uri: asset.uri,
                name: fileName,
                type: mimeType,
            } as unknown as Blob);

            setUploadingDoc(true);
            await OwnerApi.uploadPropertyDocument(propertyId, formData);
            setDocNotes('');
            const refreshedDocs = await OwnerApi.getPropertyDocuments(propertyId);
            setDocuments(refreshedDocs.data?.documents || []);
            Alert.alert('Document Uploaded', 'Verification document uploaded successfully.');
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { message?: string } } })?.response?.data
                    ?.message || 'Failed to upload verification document.';
            Alert.alert('Upload Failed', msg);
        } finally {
            setUploadingDoc(false);
        }
    };

    const handleDeleteDocument = (doc: OwnerVerificationDocument) => {
        Alert.alert(
            'Remove Document',
            `Delete "${doc.original_filename || doc.document_type_label || doc.document_type}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setDeletingDocId(doc.id);
                        try {
                            await OwnerApi.deletePropertyDocument(propertyId, doc.id);
                            setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
                        } catch (err: unknown) {
                            const msg =
                                (err as { response?: { data?: { message?: string } } })
                                    ?.response?.data?.message ||
                                'Could not delete document.';
                            Alert.alert('Delete Failed', msg);
                        } finally {
                            setDeletingDocId(null);
                        }
                    },
                },
            ],
        );
    };

    const canSubmitVerification = ![
        'submitted',
        'under_review',
        'in_review',
        'approved',
        'verified',
    ].includes(verifStatus.toLowerCase());

    return (
        <RequireAuth role="partner">
            <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
                <AppHeader
                    title="Edit Property Details"
                    subtitle={property?.name || `Property ID: ${id}`}
                    showBack
                    fallbackRoute="/(partner)/properties"
                />

                {loading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color={Colors.deepPlum} />
                        <Text style={styles.loadingText}>Loading property setup...</Text>
                    </View>
                ) : loadError && !property ? (
                    <ExceptionalState
                        type="no-internet"
                        title="Unable to Load Property"
                        description={loadError}
                        actionLabel="Retry"
                        onAction={loadInitialData}
                    />
                ) : (
                    <KeyboardAvoidingView
                        style={{ flex: 1 }}
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    >
                        <ScrollView
                            contentContainerStyle={styles.scrollContent}
                            keyboardShouldPersistTaps="handled"
                        >
                            {/* Verification & Readiness Card */}
                            <View style={styles.verificationCard}>
                                <View style={styles.verifHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.verifTitle}>
                                            Verification & Publishing
                                        </Text>
                                        <Text style={styles.verifSubtitle}>
                                            Status:{' '}
                                            {verifStatus.replace(/_/g, ' ').toUpperCase()} •
                                            Status:{' '}
                                            {(property?.status || 'draft')
                                                .replace(/_/g, ' ')
                                                .toUpperCase()}
                                        </Text>
                                    </View>
                                    <Badge
                                        label={
                                            (property as any)?.is_published ||
                                            property?.status === 'approved'
                                                ? 'LIVE'
                                                : 'UNPUBLISHED'
                                        }
                                        variant={
                                            (property as any)?.is_published ||
                                            property?.status === 'approved'
                                                ? 'success'
                                                : 'warning'
                                        }
                                    />
                                </View>

                                {decisionReason ? (
                                    <View style={styles.feedbackAlert}>
                                        <AlertCircle size={16} color={Colors.error} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.feedbackAlertTitle}>
                                                Moderation Decision Note
                                            </Text>
                                            <Text style={styles.feedbackAlertText}>
                                                {decisionReason}
                                            </Text>
                                        </View>
                                    </View>
                                ) : null}

                                {requestedChanges ? (
                                    <View style={styles.feedbackWarning}>
                                        <AlertCircle size={16} color={Colors.warning} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.feedbackWarningTitle}>
                                                Requested Changes
                                            </Text>
                                            <Text style={styles.feedbackWarningText}>
                                                {requestedChanges}
                                            </Text>
                                        </View>
                                    </View>
                                ) : null}

                                {missingRequirements.length > 0 ? (
                                    <View style={styles.missingBox}>
                                        <Text style={styles.missingTitle}>
                                            Pending Publishing Requirements:
                                        </Text>
                                        {missingRequirements.map((req, idx) => (
                                            <Text key={idx} style={styles.missingItem}>
                                                • {req.replace(/_/g, ' ')}
                                            </Text>
                                        ))}
                                    </View>
                                ) : null}

                                {canSubmitVerification && !(property as any)?.is_published ? (
                                    <TouchableOpacity
                                        style={styles.submitVerifBtn}
                                        onPress={handleSubmitForVerification}
                                        disabled={submittingVerification}
                                        accessibilityRole="button"
                                        accessibilityLabel="Submit property for verification"
                                    >
                                        {submittingVerification ? (
                                            <ActivityIndicator
                                                size="small"
                                                color={Colors.white}
                                            />
                                        ) : (
                                            <>
                                                <Send size={16} color={Colors.white} />
                                                <Text style={styles.submitVerifText}>
                                                    Submit Property for Verification
                                                </Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                ) : null}
                            </View>

                            {/* 1. Core Identity & Category */}
                            <View style={styles.sectionCard}>
                                <Text style={styles.sectionTitle}>
                                    1. Core Identity & Category
                                </Text>

                                <Input
                                    label="Property Name *"
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="Property name"
                                />

                                <Text style={styles.fieldLabel}>
                                    Accommodation Category *
                                </Text>
                                <View style={styles.categoryList}>
                                    {CANONICAL_CATEGORIES.map((cat) => {
                                        const isSelected = categorySlug === cat.slug;
                                        return (
                                            <TouchableOpacity
                                                key={cat.slug}
                                                style={[
                                                    styles.categoryOption,
                                                    isSelected && styles.categoryOptionActive,
                                                ]}
                                                onPress={() => handleSelectCategory(cat.slug)}
                                                accessibilityRole="button"
                                            >
                                                <Text
                                                    style={[
                                                        styles.categoryLabel,
                                                        isSelected &&
                                                            styles.categoryLabelActive,
                                                    ]}
                                                >
                                                    {cat.name}
                                                </Text>
                                                {isSelected && (
                                                    <CheckCircle2
                                                        size={18}
                                                        color={Colors.deepPlum}
                                                    />
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                                <Input
                                    label="Short Description"
                                    value={shortDescription}
                                    onChangeText={setShortDescription}
                                    multiline
                                    numberOfLines={3}
                                    placeholder="Briefly describe your property..."
                                />
                            </View>

                            {/* 2. City & Location Details */}
                            <View style={styles.sectionCard}>
                                <Text style={styles.sectionTitle}>
                                    2. City & Location Details
                                </Text>

                                <Text style={styles.fieldLabel}>City *</Text>
                                <View style={styles.cityChipGrid}>
                                    {cities.map((city) => {
                                        const active = selectedCityId === city.id;
                                        return (
                                            <TouchableOpacity
                                                key={city.id}
                                                style={[
                                                    styles.cityChip,
                                                    active && styles.cityChipActive,
                                                ]}
                                                onPress={() => setSelectedCityId(city.id)}
                                                accessibilityRole="button"
                                                accessibilityLabel={`Select city ${city.name}`}
                                            >
                                                <Text
                                                    style={[
                                                        styles.cityChipText,
                                                        active && styles.cityChipTextActive,
                                                    ]}
                                                >
                                                    {city.name}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                                <Input
                                    label="Locality / Area *"
                                    value={locality}
                                    onChangeText={setLocality}
                                    placeholder="Neighbourhood or area name"
                                />
                                <Input
                                    label="Street Address *"
                                    value={addressLine}
                                    onChangeText={setAddressLine}
                                    placeholder="Plot, street, and landmark"
                                />
                                <Input
                                    label="Postal PIN Code"
                                    value={postalCode}
                                    onChangeText={setPostalCode}
                                    keyboardType="number-pad"
                                    maxLength={6}
                                    placeholder="6-digit PIN code"
                                />
                            </View>

                            {/* 3. Food & Meal Flags */}
                            <View style={styles.sectionCard}>
                                <Text style={styles.sectionTitle}>3. Food & Meal Flags</Text>

                                <View style={styles.switchRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.switchLabel}>
                                            Food Facility Available
                                        </Text>
                                        <Text style={styles.switchHint}>
                                            Does this property provide an in-house dining or
                                            mess facility?
                                        </Text>
                                    </View>
                                    <Switch
                                        value={foodAvailable}
                                        onValueChange={setFoodAvailable}
                                        trackColor={{
                                            false: Colors.border,
                                            true: Colors.emerald,
                                        }}
                                    />
                                </View>

                                {foodAvailable && (
                                    <View style={styles.mealsSubBox}>
                                        <View style={styles.switchRowCompact}>
                                            <Text style={styles.mealText}>
                                                Breakfast Included
                                            </Text>
                                            <Switch
                                                value={breakfastIncluded}
                                                onValueChange={setBreakfastIncluded}
                                                trackColor={{
                                                    false: Colors.border,
                                                    true: Colors.deepPlum,
                                                }}
                                            />
                                        </View>
                                        <View style={styles.switchRowCompact}>
                                            <Text style={styles.mealText}>
                                                Lunch Included
                                            </Text>
                                            <Switch
                                                value={lunchIncluded}
                                                onValueChange={setLunchIncluded}
                                                trackColor={{
                                                    false: Colors.border,
                                                    true: Colors.deepPlum,
                                                }}
                                            />
                                        </View>
                                        <View style={styles.switchRowCompact}>
                                            <Text style={styles.mealText}>
                                                Dinner Included
                                            </Text>
                                            <Switch
                                                value={dinnerIncluded}
                                                onValueChange={setDinnerIncluded}
                                                trackColor={{
                                                    false: Colors.border,
                                                    true: Colors.deepPlum,
                                                }}
                                            />
                                        </View>
                                    </View>
                                )}
                            </View>

                            <Button
                                title="Save Property Details"
                                onPress={handleSave}
                                loading={saving}
                                style={{ marginBottom: Spacing.xl }}
                            />

                            {/* 4. Property Verification Documents */}
                            <View style={styles.sectionCard}>
                                <View style={styles.docSectionHeader}>
                                    <FileText size={18} color={Colors.deepPlum} />
                                    <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>
                                        4. Property Verification Documents
                                    </Text>
                                </View>
                                <Text style={styles.docSubtitle}>
                                    Upload clear scans or photos of property ownership, lease
                                    deed, or municipal trade registration for verification.
                                </Text>

                                <Text style={styles.fieldLabel}>Document Category</Text>
                                <View style={styles.cityChipGrid}>
                                    {requiredDocTypes.map((dt) => {
                                        const active = selectedDocType === dt.type;
                                        return (
                                            <TouchableOpacity
                                                key={dt.type}
                                                style={[
                                                    styles.cityChip,
                                                    active && styles.cityChipActive,
                                                ]}
                                                onPress={() => setSelectedDocType(dt.type)}
                                                accessibilityRole="button"
                                            >
                                                <Text
                                                    style={[
                                                        styles.cityChipText,
                                                        active && styles.cityChipTextActive,
                                                    ]}
                                                >
                                                    {dt.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                                <Input
                                    label="Document Reference / Notes (Optional)"
                                    value={docNotes}
                                    onChangeText={setDocNotes}
                                    placeholder="e.g. Electricity bill or registered lease deed"
                                />

                                <TouchableOpacity
                                    style={styles.uploadDocBtn}
                                    onPress={handlePickAndUploadDocument}
                                    disabled={uploadingDoc}
                                    accessibilityRole="button"
                                    accessibilityLabel="Select and upload verification document"
                                >
                                    {uploadingDoc ? (
                                        <ActivityIndicator
                                            size="small"
                                            color={Colors.deepPlum}
                                        />
                                    ) : (
                                        <>
                                            <Upload size={16} color={Colors.deepPlum} />
                                            <Text style={styles.uploadDocBtnText}>
                                                Select & Upload Document Photo
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>

                                {documents.length > 0 ? (
                                    <View style={styles.uploadedDocsList}>
                                        <Text style={styles.fieldLabel}>
                                            Uploaded Documents ({documents.length})
                                        </Text>
                                        {documents.map((doc) => (
                                            <View key={doc.id} style={styles.docItemRow}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.docItemTitle}>
                                                        {doc.document_type_label ||
                                                            doc.document_type.replace(
                                                                /_/g,
                                                                ' ',
                                                            )}
                                                    </Text>
                                                    <Text style={styles.docItemMeta}>
                                                        {doc.original_filename ||
                                                            'Uploaded file'}{' '}
                                                        •{' '}
                                                        {(
                                                            doc.verification_status ||
                                                            'pending'
                                                        ).toUpperCase()}
                                                    </Text>
                                                    {doc.rejection_reason ? (
                                                        <Text style={styles.docRejectionText}>
                                                            Reason: {doc.rejection_reason}
                                                        </Text>
                                                    ) : null}
                                                </View>
                                                {doc.verification_status !== 'approved' && (
                                                    <TouchableOpacity
                                                        style={styles.deleteDocBtn}
                                                        onPress={() =>
                                                            handleDeleteDocument(doc)
                                                        }
                                                        disabled={deletingDocId === doc.id}
                                                        accessibilityRole="button"
                                                        accessibilityLabel="Delete verification document"
                                                    >
                                                        {deletingDocId === doc.id ? (
                                                            <ActivityIndicator
                                                                size="small"
                                                                color={Colors.error}
                                                            />
                                                        ) : (
                                                            <Trash2
                                                                size={16}
                                                                color={Colors.error}
                                                            />
                                                        )}
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        ))}
                                    </View>
                                ) : null}
                            </View>

                            {/* 5. Property Operations & Configuration */}
                            <Text style={styles.hubHeading}>
                                5. Property Operations & Configuration
                            </Text>
                            <View style={styles.hubCard}>
                                <TouchableOpacity
                                    style={styles.hubItem}
                                    onPress={() =>
                                        router.push(
                                            `/(partner)/properties/${propertyId}/room-types` as never,
                                        )
                                    }
                                >
                                    <View style={styles.hubIcon}>
                                        <Layers size={18} color={Colors.deepPlum} />
                                    </View>
                                    <View style={styles.hubContent}>
                                        <Text style={styles.hubTitle}>
                                            Room Categories (Types)
                                        </Text>
                                        <Text style={styles.hubDesc}>
                                            Configure Private or Shared capacity categories
                                        </Text>
                                    </View>
                                    <ChevronRight size={18} color={Colors.textMuted} />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.hubItem}
                                    onPress={() =>
                                        router.push(
                                            `/(partner)/properties/${propertyId}/rooms` as never,
                                        )
                                    }
                                >
                                    <View style={styles.hubIcon}>
                                        <DoorOpen size={18} color={Colors.deepPlum} />
                                    </View>
                                    <View style={styles.hubContent}>
                                        <Text style={styles.hubTitle}>
                                            Physical Rooms Inventory
                                        </Text>
                                        <Text style={styles.hubDesc}>
                                            Manage discrete room numbers (101, 102) & status
                                        </Text>
                                    </View>
                                    <ChevronRight size={18} color={Colors.textMuted} />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.hubItem}
                                    onPress={() =>
                                        router.push(
                                            `/(partner)/properties/${propertyId}/pricing` as never,
                                        )
                                    }
                                >
                                    <View style={styles.hubIcon}>
                                        <IndianRupee size={18} color={Colors.deepPlum} />
                                    </View>
                                    <View style={styles.hubContent}>
                                        <Text style={styles.hubTitle}>
                                            Pricing & Rate Structure
                                        </Text>
                                        <Text style={styles.hubDesc}>
                                            Set daily, weekly, and monthly rates per category
                                        </Text>
                                    </View>
                                    <ChevronRight size={18} color={Colors.textMuted} />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.hubItem}
                                    onPress={() =>
                                        router.push(
                                            `/(partner)/properties/${propertyId}/availability` as never,
                                        )
                                    }
                                >
                                    <View style={styles.hubIcon}>
                                        <Calendar size={18} color={Colors.deepPlum} />
                                    </View>
                                    <View style={styles.hubContent}>
                                        <Text style={styles.hubTitle}>
                                            Availability & Blocks
                                        </Text>
                                        <Text style={styles.hubDesc}>
                                            Block dates for maintenance or offline stays
                                        </Text>
                                    </View>
                                    <ChevronRight size={18} color={Colors.textMuted} />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.hubItem}
                                    onPress={() =>
                                        router.push(
                                            `/(partner)/properties/${propertyId}/media` as never,
                                        )
                                    }
                                >
                                    <View style={styles.hubIcon}>
                                        <Camera size={18} color={Colors.deepPlum} />
                                    </View>
                                    <View style={styles.hubContent}>
                                        <Text style={styles.hubTitle}>
                                            Photos & Media Gallery
                                        </Text>
                                        <Text style={styles.hubDesc}>
                                            Upload property photos, set cover image & captions
                                        </Text>
                                    </View>
                                    <ChevronRight size={18} color={Colors.textMuted} />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.hubItem, { borderBottomWidth: 0 }]}
                                    onPress={() =>
                                        router.push(
                                            `/(partner)/properties/${propertyId}/amenities` as never,
                                        )
                                    }
                                >
                                    <View style={styles.hubIcon}>
                                        <Sparkles size={18} color={Colors.deepPlum} />
                                    </View>
                                    <View style={styles.hubContent}>
                                        <Text style={styles.hubTitle}>
                                            Property Amenities
                                        </Text>
                                        <Text style={styles.hubDesc}>
                                            Select included facilities & paid add-on services
                                        </Text>
                                    </View>
                                    <ChevronRight size={18} color={Colors.textMuted} />
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </KeyboardAvoidingView>
                )}
            </SafeAreaView>
        </RequireAuth>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.surfaceSubtle,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: Spacing.sm,
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
    },
    scrollContent: {
        padding: Spacing.base,
        paddingBottom: Spacing.xxxl,
    },
    verificationCard: {
        backgroundColor: Colors.deepPlum,
        borderRadius: BorderRadius.xl,
        padding: Spacing.base,
        marginBottom: Spacing.base,
        ...Shadows.card,
    },
    verifHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    verifTitle: {
        fontSize: Typography.fontSize.base,
        fontWeight: '700',
        color: Colors.white,
    },
    verifSubtitle: {
        fontSize: Typography.fontSize.xs,
        color: Colors.peachCream,
        marginTop: 2,
    },
    feedbackAlert: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.xs,
        backgroundColor: Colors.warningLight,
        padding: Spacing.sm,
        borderRadius: BorderRadius.md,
        marginTop: Spacing.sm,
    },
    feedbackAlertTitle: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '700',
        color: Colors.error,
    },
    feedbackAlertText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textPrimary,
        marginTop: 2,
    },
    feedbackWarning: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.xs,
        backgroundColor: Colors.warningLight,
        padding: Spacing.sm,
        borderRadius: BorderRadius.md,
        marginTop: Spacing.sm,
    },
    feedbackWarningTitle: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '700',
        color: Colors.warning,
    },
    feedbackWarningText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textPrimary,
        marginTop: 2,
    },
    missingBox: {
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: BorderRadius.md,
        padding: Spacing.sm,
        marginTop: Spacing.sm,
    },
    missingTitle: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '700',
        color: Colors.softPeach,
        marginBottom: 4,
    },
    missingItem: {
        fontSize: Typography.fontSize.xs,
        color: Colors.white,
        textTransform: 'capitalize',
        marginTop: 2,
    },
    submitVerifBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.coral,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
        marginTop: Spacing.md,
        minHeight: 44,
        gap: Spacing.xs,
    },
    submitVerifText: {
        color: Colors.white,
        fontWeight: '700',
        fontSize: Typography.fontSize.sm,
    },
    sectionCard: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        padding: Spacing.base,
        marginBottom: Spacing.base,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadows.subtle,
    },
    sectionTitle: {
        fontSize: Typography.fontSize.base,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: Spacing.md,
    },
    fieldLabel: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '600',
        color: Colors.textSecondary,
        marginBottom: Spacing.xs,
        marginTop: Spacing.xs,
    },
    categoryList: {
        gap: Spacing.xs,
        marginBottom: Spacing.md,
    },
    categoryOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        borderWidth: 1.5,
        borderColor: Colors.border,
    },
    categoryOptionActive: {
        borderColor: Colors.deepPlum,
        backgroundColor: Colors.peachCream,
    },
    categoryLabel: {
        fontSize: Typography.fontSize.sm,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    categoryLabelActive: {
        color: Colors.deepPlum,
        fontWeight: '700',
    },
    cityChipGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.xs,
        marginBottom: Spacing.md,
    },
    cityChip: {
        paddingHorizontal: Spacing.md,
        paddingVertical: 8,
        borderRadius: BorderRadius.pill,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.surfaceSubtle,
    },
    cityChipActive: {
        backgroundColor: Colors.deepPlum,
        borderColor: Colors.deepPlum,
    },
    cityChipText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    cityChipTextActive: {
        color: Colors.white,
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    switchLabel: {
        fontSize: Typography.fontSize.sm,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    switchHint: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
    },
    mealsSubBox: {
        marginTop: Spacing.md,
        paddingTop: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Colors.borderSubtle,
        gap: Spacing.xs,
    },
    switchRowCompact: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    mealText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textPrimary,
        fontWeight: '500',
    },
    docSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        marginBottom: Spacing.xs,
    },
    docSubtitle: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
        marginBottom: Spacing.md,
    },
    uploadDocBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: Colors.deepPlum,
        backgroundColor: Colors.peachCream,
        minHeight: 48,
    },
    uploadDocBtnText: {
        fontSize: Typography.fontSize.sm,
        fontWeight: '700',
        color: Colors.deepPlum,
    },
    uploadedDocsList: {
        marginTop: Spacing.md,
        paddingTop: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Colors.borderSubtle,
        gap: Spacing.xs,
    },
    docItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: Spacing.sm,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
    },
    docItemTitle: {
        fontSize: Typography.fontSize.sm,
        fontWeight: '700',
        color: Colors.textPrimary,
        textTransform: 'capitalize',
    },
    docItemMeta: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    docRejectionText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.error,
        marginTop: 2,
    },
    deleteDocBtn: {
        padding: Spacing.sm,
        minWidth: 40,
        minHeight: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    hubHeading: {
        fontSize: Typography.fontSize.sm,
        fontWeight: '700',
        color: Colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginBottom: Spacing.sm,
    },
    hubCard: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.border,
        overflow: 'hidden',
        ...Shadows.subtle,
    },
    hubItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.base,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderSubtle,
        gap: Spacing.md,
    },
    hubIcon: {
        width: 38,
        height: 38,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.peachCream,
        justifyContent: 'center',
        alignItems: 'center',
    },
    hubContent: {
        flex: 1,
    },
    hubTitle: {
        fontSize: Typography.fontSize.sm,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    hubDesc: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
        marginTop: 2,
    },
});
