import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { OwnerApi } from '../../../src/api/owner';
import { OwnerFinancialProfile } from '../../../src/api/types';
import { Badge } from '../../../src/components/Badge';
import { Button } from '../../../src/components/Button';
import { AppHeader } from '../../../src/components/AppHeader';
import { RequireAuth } from '../../../src/components/RequireAuth';
import { Colors } from '../../../src/theme/colors';
import { BorderRadius, Spacing } from '../../../src/theme/spacing';
import { Typography } from '../../../src/theme/typography';
import {
    AlertTriangle,
    Building,
    Edit3,
    FileText,
    Landmark,
    ShieldCheck,
    X,
} from 'lucide-react-native';

const CONSTITUTION_OPTIONS = [
    { value: 'individual', label: 'Individual / Sole Proprietor' },
    { value: 'partnership', label: 'Partnership Firm' },
    { value: 'llp', label: 'Limited Liability Partnership (LLP)' },
    { value: 'private_limited', label: 'Private Limited Company' },
    { value: 'trust_society', label: 'Trust / Society' },
];

export default function FinancialProfileScreen() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [profile, setProfile] = useState<OwnerFinancialProfile | null>(null);

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [legalName, setLegalName] = useState('');
    const [constitution, setConstitution] = useState('individual');
    const [pan, setPan] = useState('');
    const [gstRegistered, setGstRegistered] = useState(false);
    const [gstin, setGstin] = useState('');
    const [bankAccountNumber, setBankAccountNumber] = useState('');
    const [bankIfsc, setBankIfsc] = useState('');
    const [bankName, setBankName] = useState('');
    const [holderName, setHolderName] = useState('');
    const [saving, setSaving] = useState(false);

    const fetchProfile = async () => {
        try {
            const res = await OwnerApi.getFinancialProfile();
            if (res.data) {
                const d = res.data;
                setProfile(d);
                setLegalName(
                    d.legal_business_name || d.bank_beneficiary_name || '',
                );
                setConstitution(
                    d.supplier_legal_classification ||
                        d.business_constitution ||
                        'individual',
                );
                setPan(d.pan_number || d.pan || '');
                setGstRegistered(Boolean(d.gst_registered || d.gstin));
                setGstin(d.gstin || '');
                setBankIfsc(d.bank_ifsc || '');
                setBankName(d.bank_name || '');
                setHolderName(
                    d.bank_beneficiary_name || d.bank_account_holder_name || '',
                );
            }
        } catch (error: any) {
            Alert.alert(
                'Error',
                error.message || 'Failed to load financial profile.',
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        void fetchProfile();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        void fetchProfile();
    };

    const handleSave = async () => {
        const cleanPan = pan.trim().toUpperCase();
        const cleanIfsc = bankIfsc.trim().toUpperCase();
        const cleanGstin = gstin.trim().toUpperCase();
        const cleanBeneficiary = (holderName.trim() || legalName.trim());

        if (!cleanBeneficiary) {
            Alert.alert(
                'Validation Error',
                'Bank beneficiary / legal business name is required.',
            );
            return;
        }
        if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(cleanPan)) {
            Alert.alert(
                'Invalid PAN',
                'Please enter a valid 10-character Income Tax PAN (e.g. ABCDE1234F).',
            );
            return;
        }
        if (
            gstRegistered &&
            !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(
                cleanGstin,
            )
        ) {
            Alert.alert(
                'Invalid GSTIN',
                'Please enter a valid 15-character GSTIN or toggle GST Registration off.',
            );
            return;
        }
        if (cleanIfsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
            Alert.alert(
                'Invalid IFSC',
                'Please enter a valid 11-character bank IFSC code (e.g. HDFC0001234).',
            );
            return;
        }

        setSaving(true);
        try {
            await OwnerApi.updateFinancialProfile({
                legal_business_name: legalName.trim() || cleanBeneficiary,
                supplier_legal_classification: constitution,
                business_constitution: constitution,
                pan_number: cleanPan,
                pan: cleanPan,
                gst_registered: gstRegistered,
                gstin: gstRegistered && cleanGstin ? cleanGstin : null,
                bank_account_number: bankAccountNumber.trim()
                    ? bankAccountNumber.trim()
                    : undefined,
                bank_ifsc: cleanIfsc || undefined,
                bank_name: bankName.trim() ? bankName.trim() : undefined,
                bank_beneficiary_name: cleanBeneficiary,
                bank_account_holder_name: cleanBeneficiary,
            });

            setIsEditModalOpen(false);
            setBankAccountNumber('');
            Alert.alert(
                'Success',
                'Financial details submitted for verification.',
            );
            void fetchProfile();
        } catch (error: any) {
            Alert.alert(
                'Update Failed',
                error.message || 'Could not update financial profile.',
            );
        } finally {
            setSaving(false);
        }
    };

    const getStatusVariant = (
        status?: string,
    ): 'success' | 'warning' | 'info' | 'error' | 'neutral' => {
        switch (status?.toLowerCase()) {
            case 'verified':
            case 'approved':
                return 'success';
            case 'pending':
            case 'under_review':
                return 'info';
            case 'rejected':
                return 'error';
            default:
                return 'warning';
        }
    };

    const resolvedStatus =
        profile?.onboarding_status || profile?.verification_status || 'pending';
    const isEligible = Boolean(
        profile?.is_eligible ?? profile?.settlement_eligible,
    );
    const rejectionReasons: string[] = profile?.rejection_reason
        ? [profile.rejection_reason]
        : profile?.rejection_reasons || [];
    const resolvedConstitution =
        profile?.supplier_legal_classification ||
        profile?.business_constitution;
    const resolvedPan = profile?.pan_number || profile?.pan;
    const resolvedMaskedAccount =
        profile?.bank_account_number_masked || profile?.bank_account_masked;
    const resolvedHolderName =
        profile?.bank_beneficiary_name ||
        profile?.bank_account_holder_name ||
        profile?.legal_business_name;

    return (
        <RequireAuth role="partner">
            <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
                <AppHeader
                    title="Financial Profile"
                    subtitle="Banking, Tax & Settlement KYC"
                    showBack
                    fallbackRoute="/(partner)/account"
                    rightElement={
                        <TouchableOpacity
                            style={styles.editButton}
                            onPress={() => setIsEditModalOpen(true)}
                            accessibilityRole="button"
                            accessibilityLabel="Edit Financial Profile"
                        >
                            <Edit3 size={18} color={Colors.primary} />
                        </TouchableOpacity>
                    }
                />

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.loadingText}>
                        Loading financial profile...
                    </Text>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                        />
                    }
                >
                    {/* Status & Eligibility Banner */}
                    <View style={styles.statusBanner}>
                        <View style={styles.bannerHeader}>
                            <View style={styles.bannerTitleRow}>
                                <ShieldCheck
                                    size={20}
                                    color={
                                        isEligible
                                            ? Colors.success
                                            : Colors.warning
                                    }
                                />
                                <Text style={styles.bannerTitle}>
                                    Payout Eligibility
                                </Text>
                            </View>
                            <Badge
                                variant={getStatusVariant(resolvedStatus)}
                                size="sm"
                            >
                                {resolvedStatus.toUpperCase()}
                            </Badge>
                        </View>
                        <Text style={styles.bannerDesc}>
                            {isEligible
                                ? 'Your banking and tax profile is verified. Automatic settlement transfers are active.'
                                : 'Financial KYC verification is pending. Please verify your legal and bank details to receive payouts.'}
                        </Text>
                    </View>

                    {/* Rejection Reasons if applicable */}
                    {rejectionReasons.length > 0 && (
                        <View style={styles.rejectionCard}>
                            <View style={styles.rejectionHeader}>
                                <AlertTriangle
                                    size={18}
                                    color={Colors.error}
                                />
                                <Text style={styles.rejectionTitle}>
                                    Action Required
                                </Text>
                            </View>
                            {rejectionReasons.map((reason, idx) => (
                                <Text
                                    key={idx}
                                    style={styles.rejectionItem}
                                >
                                    • {reason}
                                </Text>
                            ))}
                        </View>
                    )}

                    {/* Legal & Business Entity Card */}
                    <View style={styles.sectionCard}>
                        <View style={styles.sectionHeader}>
                            <Building size={18} color={Colors.primary} />
                            <Text style={styles.sectionTitle}>
                                Business & Tax Entity
                            </Text>
                        </View>

                        <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>
                                Legal Entity Name
                            </Text>
                            <Text style={styles.fieldValue}>
                                {profile?.legal_business_name ||
                                    resolvedHolderName ||
                                    'Not provided'}
                            </Text>
                        </View>

                        <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Constitution</Text>
                            <Text style={styles.fieldValue}>
                                {CONSTITUTION_OPTIONS.find(
                                    (c) => c.value === resolvedConstitution,
                                )?.label ||
                                    resolvedConstitution ||
                                    'Individual'}
                            </Text>
                        </View>

                        <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>
                                Income Tax PAN
                            </Text>
                            <Text style={styles.fieldValueBold}>
                                {resolvedPan || 'Not provided'}
                            </Text>
                        </View>

                        <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>GSTIN</Text>
                            <Text style={styles.fieldValue}>
                                {profile?.gstin || 'Not registered / exempt'}
                            </Text>
                        </View>
                    </View>

                    {/* Bank Account Card */}
                    <View style={styles.sectionCard}>
                        <View style={styles.sectionHeader}>
                            <Landmark size={18} color={Colors.primary} />
                            <Text style={styles.sectionTitle}>
                                Settlement Bank Account
                            </Text>
                        </View>

                        <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Bank Name</Text>
                            <Text style={styles.fieldValue}>
                                {profile?.bank_name || 'Not specified'}
                            </Text>
                        </View>

                        <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>
                                Account Holder Name
                            </Text>
                            <Text style={styles.fieldValue}>
                                {resolvedHolderName || 'Not specified'}
                            </Text>
                        </View>

                        <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>
                                Account Number
                            </Text>
                            <Text style={styles.fieldValueBold}>
                                {resolvedMaskedAccount || '•••• •••• ••••'}
                            </Text>
                        </View>

                        <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>
                                NEFT / RTGS IFSC
                            </Text>
                            <Text style={styles.fieldValueBold}>
                                {profile?.bank_ifsc || 'Not specified'}
                            </Text>
                        </View>
                    </View>

                    {/* Commission Agreement Link Card */}
                    <TouchableOpacity
                        style={styles.agreementCard}
                        onPress={() =>
                            router.push(
                                '/(partner)/financial-profile/agreements',
                            )
                        }
                        accessibilityLabel="View Commission Agreements"
                    >
                        <View style={styles.agreementLeft}>
                            <FileText size={20} color={Colors.primary} />
                            <View style={{ marginLeft: Spacing.sm }}>
                                <Text style={styles.agreementTitle}>
                                    Commission Agreements
                                </Text>
                                <Text style={styles.agreementSubtitle}>
                                    View contractual commission tiers and terms
                                </Text>
                            </View>
                        </View>
                        <Text style={styles.agreementAction}>View →</Text>
                    </TouchableOpacity>
                </ScrollView>
            )}

            {/* Edit / Update Modal */}
            <Modal
                visible={isEditModalOpen}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsEditModalOpen(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                Edit Financial KYC
                            </Text>
                            <TouchableOpacity
                                onPress={() => setIsEditModalOpen(false)}
                            >
                                <X size={22} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalForm}>
                            <Text style={styles.formSectionTitle}>
                                Legal Business Identity
                            </Text>

                            <Text style={styles.inputLabel}>
                                Legal Entity / Trade Name *
                            </Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter legal business name"
                                placeholderTextColor={Colors.textTertiary}
                                value={legalName}
                                onChangeText={setLegalName}
                            />

                            <Text style={styles.inputLabel}>
                                Business Constitution *
                            </Text>
                            <View style={styles.constitutionGrid}>
                                {CONSTITUTION_OPTIONS.map((c) => (
                                    <TouchableOpacity
                                        key={c.value}
                                        style={[
                                            styles.constitutionChip,
                                            constitution === c.value &&
                                                styles.constitutionChipActive,
                                        ]}
                                        onPress={() => setConstitution(c.value)}
                                    >
                                        <Text
                                            style={[
                                                styles.constitutionChipText,
                                                constitution === c.value &&
                                                    styles.constitutionChipTextActive,
                                            ]}
                                        >
                                            {c.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.inputLabel}>PAN Number *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. ABCDE1234F"
                                placeholderTextColor={Colors.textTertiary}
                                value={pan}
                                onChangeText={(t) => setPan(t.toUpperCase())}
                                autoCapitalize="characters"
                                maxLength={10}
                            />

                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginTop: Spacing.md,
                                }}
                            >
                                <Text style={[styles.inputLabel, { marginTop: 0 }]}>
                                    GST Registered Entity
                                </Text>
                                <Switch
                                    value={gstRegistered}
                                    onValueChange={setGstRegistered}
                                    trackColor={{
                                        false: Colors.border,
                                        true: Colors.primary,
                                    }}
                                />
                            </View>

                            {gstRegistered && (
                                <>
                                    <Text style={styles.inputLabel}>
                                        GSTIN (15 characters) *
                                    </Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g. 29ABCDE1234F1Z5"
                                        placeholderTextColor={Colors.textTertiary}
                                        value={gstin}
                                        onChangeText={(t) =>
                                            setGstin(t.toUpperCase())
                                        }
                                        autoCapitalize="characters"
                                        maxLength={15}
                                    />
                                </>
                            )}

                            <Text
                                style={[
                                    styles.formSectionTitle,
                                    { marginTop: Spacing.md },
                                ]}
                            >
                                Settlement Bank Account
                            </Text>

                            <Text style={styles.inputLabel}>
                                Account Number
                            </Text>
                            <TextInput
                                style={styles.input}
                                placeholder={
                                    profile?.bank_account_masked ||
                                    'Enter bank account number'
                                }
                                placeholderTextColor={Colors.textTertiary}
                                value={bankAccountNumber}
                                onChangeText={setBankAccountNumber}
                                keyboardType="number-pad"
                            />

                            <Text style={styles.inputLabel}>IFSC Code</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. HDFC0001234"
                                placeholderTextColor={Colors.textTertiary}
                                value={bankIfsc}
                                onChangeText={(t) =>
                                    setBankIfsc(t.toUpperCase())
                                }
                                autoCapitalize="characters"
                                maxLength={11}
                            />

                            <Text style={styles.inputLabel}>Bank Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. HDFC Bank Ltd"
                                placeholderTextColor={Colors.textTertiary}
                                value={bankName}
                                onChangeText={setBankName}
                            />

                            <Text style={styles.inputLabel}>
                                Account Holder Name
                            </Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Name as per bank records"
                                placeholderTextColor={Colors.textTertiary}
                                value={holderName}
                                onChangeText={setHolderName}
                            />
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <Button
                                title="Cancel"
                                variant="outline"
                                onPress={() => setIsEditModalOpen(false)}
                                style={{ flex: 1, marginRight: Spacing.sm }}
                            />
                            <Button
                                title={
                                    saving ? 'Submitting...' : 'Save & Submit'
                                }
                                onPress={handleSave}
                                disabled={saving}
                                style={{ flex: 1 }}
                            />
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
        </RequireAuth>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        backgroundColor: Colors.surface,
    },
    backButton: {
        padding: Spacing.xs,
        marginRight: Spacing.xs,
    },
    headerTitleContainer: {
        flex: 1,
    },
    headerTitle: {
        fontSize: Typography.fontSize.lg,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    headerSubtitle: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
    },
    editButton: {
        padding: Spacing.xs + 2,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.primary + '15',
    },
    scrollContent: {
        padding: Spacing.md,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: Spacing.sm,
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
    },
    statusBanner: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    bannerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    bannerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    bannerTitle: {
        fontSize: Typography.fontSize.md,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    bannerDesc: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
        lineHeight: 18,
    },
    rejectionCard: {
        backgroundColor: Colors.error + '10',
        borderWidth: 1,
        borderColor: Colors.error + '40',
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    rejectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        marginBottom: Spacing.xs,
    },
    rejectionTitle: {
        fontSize: Typography.fontSize.sm,
        fontWeight: '700',
        color: Colors.error,
    },
    rejectionItem: {
        fontSize: Typography.fontSize.xs,
        color: Colors.error,
        lineHeight: 18,
    },
    sectionCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        paddingBottom: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border + '60',
        marginBottom: Spacing.sm,
    },
    sectionTitle: {
        fontSize: Typography.fontSize.md,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    fieldRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
    },
    fieldLabel: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
    },
    fieldValue: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textPrimary,
        fontWeight: '500',
    },
    fieldValueBold: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textPrimary,
        fontWeight: '700',
    },
    agreementCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.primary + '40',
        padding: Spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    agreementLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    agreementTitle: {
        fontSize: Typography.fontSize.sm,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    agreementSubtitle: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    agreementAction: {
        fontSize: Typography.fontSize.sm,
        fontWeight: '700',
        color: Colors.primary,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        maxHeight: '90%',
        padding: Spacing.md,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    modalTitle: {
        fontSize: Typography.fontSize.lg,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    modalForm: {
        maxHeight: 460,
    },
    formSectionTitle: {
        fontSize: Typography.fontSize.sm,
        fontWeight: '700',
        color: Colors.primary,
        marginBottom: Spacing.xs,
    },
    inputLabel: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '600',
        color: Colors.textSecondary,
        marginTop: Spacing.xs,
        marginBottom: 4,
    },
    input: {
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs + 2,
        fontSize: Typography.fontSize.sm,
        color: Colors.textPrimary,
    },
    constitutionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: Spacing.xs,
    },
    constitutionChip: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    constitutionChipActive: {
        backgroundColor: Colors.primary + '15',
        borderColor: Colors.primary,
    },
    constitutionChipText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
    },
    constitutionChipTextActive: {
        color: Colors.primary,
        fontWeight: '700',
    },
    modalFooter: {
        flexDirection: 'row',
        marginTop: Spacing.md,
        paddingTop: Spacing.xs,
    },
});
