import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    ShieldCheck,
    Phone,
    Mail,
    Clock,
    ChevronRight,
    HelpCircle,
    X,
    AlertCircle,
    Ticket,
} from 'lucide-react-native';
import { CustomerApi } from '../../../src/api/customer';
import { useAuth } from '../../../src/auth/AuthContext';
import { Colors } from '../../../src/theme/colors';
import { BorderRadius, Shadows, Spacing } from '../../../src/theme/spacing';
import { CustomerCaseSummary } from '../../../src/api/types';

const STATUTORY_SLA_COPY =
    'We acknowledge your grievance within 48 hours and resolve it within 30 days in accordance with statutory consumer protection regulations.';

const SUPPORT_CATEGORIES = [
    { id: 'food_not_provided', label: 'Promised Meals Not Provided' },
    { id: 'room_mismatch', label: 'Room Mismatch' },
    { id: 'safety_concern', label: 'Safety Concern' },
    { id: 'booking_problem', label: 'Booking Problem' },
    { id: 'payment_problem', label: 'Payment Problem' },
    { id: 'refund_request', label: 'Refund Request' },
    { id: 'customer_other', label: 'Other Stay Issue' },
] as const;

type SupportCategory = (typeof SUPPORT_CATEGORIES)[number]['id'];

export default function CustomerSupportScreen() {
    const router = useRouter();
    const { booking_reference } = useLocalSearchParams<{
        booking_reference?: string;
    }>();
    const { token, authState } = useAuth();

    const [cases, setCases] = useState<CustomerCaseSummary[]>([]);
    const [, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [slaModalVisible, setSlaModalVisible] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // New Request Form State
    const [bookingRef, setBookingRef] = useState(booking_reference || '');
    const [category, setCategory] =
        useState<SupportCategory>('booking_problem');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const isGuest =
        !token || authState === 'guest' || authState === 'session_expired';

    useEffect(() => {
        if (!isGuest) {
            void loadCases();
        }
    }, [isGuest]);

    const loadCases = async () => {
        try {
            setLoading(true);
            setErrorMessage(null);
            const res = await CustomerApi.getCases();
            if (res.data && res.data.length > 0) {
                setCases(res.data);
            } else {
                setCases([]);
            }
        } catch {
            setErrorMessage(
                'Unable to load your support cases. Please try again.',
            );
            setCases([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCase = async () => {
        if (!bookingRef.trim()) {
            Alert.alert('Required', 'Please enter your booking reference.');
            return;
        }
        if (description.trim().length < 20) {
            Alert.alert(
                'More Detail Required',
                'Please enter at least 20 characters describing the issue.',
            );
            return;
        }

        try {
            setSubmitting(true);
            await CustomerApi.createCase({
                booking_reference: bookingRef.trim(),
                category,
                description: description.trim(),
            });

            Alert.alert(
                'Request Submitted',
                'Your support case has been submitted. First-action SLA will trigger automatically.',
            );
            setModalVisible(false);
            setDescription('');
            void loadCases();
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to submit request.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {errorMessage ? (
                <View style={styles.errorContainer}>
                    <AlertCircle size={48} color={Colors.coral} />
                    <Text style={styles.errorTitle}>Unable to Load Cases</Text>
                    <Text style={styles.errorSubtitle}>{errorMessage}</Text>
                    <TouchableOpacity
                        style={styles.retryBtn}
                        onPress={loadCases}
                    >
                        <Text style={styles.retryBtnText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* Curved Plum Header */}
                    <View style={styles.plumHeader}>
                        <Text style={styles.headerTitle}>
                            Support & Protection
                        </Text>
                        <Text style={styles.headerSubtitle}>
                            Your safety, comfort, and satisfaction guaranteed
                        </Text>
                        <TouchableOpacity
                            accessibilityLabel="Open general helpdesk tickets"
                            accessibilityRole="button"
                            onPress={() =>
                                router.push('/(customer)/support/tickets')
                            }
                            style={styles.helpdeskButton}
                        >
                            <Ticket size={18} color={Colors.deepPlum} />
                            <Text style={styles.helpdeskButtonText}>
                                General Helpdesk Tickets
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Hero Illustration Card */}
                    <View style={styles.heroCard}>
                        <View style={styles.shieldWrapper}>
                            <View style={styles.shieldBackgroundCircle}>
                                <ShieldCheck size={48} color={Colors.success} />
                            </View>
                        </View>

                        <Text style={styles.heroTitle}>
                            We're here to help!
                        </Text>
                        <Text style={styles.heroSubtitle}>
                            Raise a support request or track your existing case.
                        </Text>

                        <View style={styles.heroActionButtons}>
                            <TouchableOpacity
                                style={styles.primaryPlumButton}
                                onPress={() => setModalVisible(true)}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.primaryPlumButtonText}>
                                    Raise a Request
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.secondaryOutlineButton}
                                onPress={() => {
                                    if (cases.length > 0) {
                                        router.push(
                                            `/(customer)/support/${cases[0].case_reference}`,
                                        );
                                    } else {
                                        Alert.alert(
                                            'No Cases',
                                            'You do not have any open cases yet.',
                                        );
                                    }
                                }}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.secondaryOutlineButtonText}>
                                    My Cases
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Your Cases Section */}
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionHeading}>Your Cases</Text>
                        <TouchableOpacity
                            onPress={() => {
                                if (cases.length > 0) {
                                    router.push(
                                        `/(customer)/support/${cases[0].case_reference}`,
                                    );
                                }
                            }}
                        >
                            <Text style={styles.seeAllText}>See All &gt;</Text>
                        </TouchableOpacity>
                    </View>

                    {cases.map((c) => (
                        <TouchableOpacity
                            key={c.id}
                            style={styles.caseCard}
                            onPress={() =>
                                router.push(
                                    `/(customer)/support/${c.case_reference}`,
                                )
                            }
                            activeOpacity={0.88}
                        >
                            <View style={styles.caseCardHeader}>
                                <Text style={styles.caseRefText}>
                                    {c.case_reference}
                                </Text>
                                <View style={styles.inProgressBadge}>
                                    <Text style={styles.inProgressBadgeText}>
                                        {c.status.replaceAll('_', ' ')}
                                    </Text>
                                </View>
                            </View>

                            <Text style={styles.caseCategoryText}>
                                {SUPPORT_CATEGORIES.find(
                                    (option) => option.id === c.category,
                                )?.label ?? c.category.replaceAll('_', ' ')}
                            </Text>
                            <Text style={styles.caseDateText}>
                                {new Date(c.created_at).toLocaleString(
                                    'en-IN',
                                    {
                                        dateStyle: 'medium',
                                        timeStyle: 'short',
                                    },
                                )}
                            </Text>

                            <View style={styles.caseDivider} />

                            <View style={styles.caseFooter}>
                                <Text style={styles.viewDetailsText}>
                                    View Details &gt;
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}

                    {/* Quick Navigation Links */}
                    <View style={styles.menuLinksCard}>
                        <TouchableOpacity
                            style={styles.menuLinkItem}
                            onPress={() => setSlaModalVisible(true)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.menuLinkLeft}>
                                <Clock size={18} color={Colors.coral} />
                                <Text style={styles.menuLinkLabel}>
                                    Customer Protection SLAs
                                </Text>
                            </View>
                            <ChevronRight size={16} color={Colors.gray400} />
                        </TouchableOpacity>

                        <View style={styles.menuLinkDivider} />

                        <TouchableOpacity
                            style={styles.menuLinkItem}
                            onPress={() =>
                                Alert.alert(
                                    'Help & FAQs',
                                    'Browse common questions and troubleshooting guides on tijum.com/faqs.',
                                )
                            }
                            activeOpacity={0.7}
                        >
                            <View style={styles.menuLinkLeft}>
                                <HelpCircle size={18} color={Colors.coral} />
                                <Text style={styles.menuLinkLabel}>
                                    Help & FAQs
                                </Text>
                            </View>
                            <ChevronRight size={16} color={Colors.gray400} />
                        </TouchableOpacity>
                    </View>

                    {/* Contact Helpline Touchpoints */}
                    <View style={styles.helplineCard}>
                        <Text style={styles.helplineTitle}>
                            Official Support Helpline
                        </Text>
                        <Text style={styles.helplineSubtitle}>
                            Operational Hours: 9:00 AM – 9:00 PM IST (Mon–Sat)
                        </Text>

                        <View style={styles.helplineButtonsRow}>
                            <TouchableOpacity
                                style={[styles.helplineBtn, styles.callBtn]}
                                onPress={() =>
                                    Linking.openURL('tel:+918142334033')
                                }
                                activeOpacity={0.8}
                            >
                                <Phone
                                    size={15}
                                    color="#1E40AF"
                                    style={{ marginRight: 6 }}
                                />
                                <Text style={styles.callBtnText}>
                                    Call Helpline
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.helplineBtn, styles.emailBtn]}
                                onPress={() =>
                                    Linking.openURL('mailto:support@tijum.com')
                                }
                                activeOpacity={0.8}
                            >
                                <Mail
                                    size={15}
                                    color="#9A3412"
                                    style={{ marginRight: 6 }}
                                />
                                <Text style={styles.emailBtnText}>
                                    Email Desk
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            )}

            {/* Raise Request Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                Raise a Support Request
                            </Text>
                            <TouchableOpacity
                                onPress={() => setModalVisible(false)}
                            >
                                <X size={20} color={Colors.gray600} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            <Text style={styles.inputLabel}>
                                Booking Reference *
                            </Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="Enter booking reference"
                                value={bookingRef}
                                onChangeText={setBookingRef}
                            />

                            <Text style={styles.inputLabel}>Category *</Text>
                            <View style={styles.categoryRadioGroup}>
                                {SUPPORT_CATEGORIES.map((cat) => (
                                    <TouchableOpacity
                                        key={cat.id}
                                        style={[
                                            styles.categoryRadioBtn,
                                            category === cat.id &&
                                                styles.categoryRadioBtnActive,
                                        ]}
                                        onPress={() => setCategory(cat.id)}
                                    >
                                        <Text
                                            style={[
                                                styles.categoryRadioBtnText,
                                                category === cat.id &&
                                                    styles.categoryRadioBtnTextActive,
                                            ]}
                                        >
                                            {cat.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.inputLabel}>Description *</Text>
                            <TextInput
                                style={[styles.textInput, styles.textArea]}
                                placeholder="Describe the issue in detail..."
                                multiline
                                numberOfLines={4}
                                value={description}
                                onChangeText={setDescription}
                            />

                            <TouchableOpacity
                                style={styles.submitModalBtn}
                                onPress={handleCreateCase}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator
                                        size="small"
                                        color={Colors.white}
                                    />
                                ) : (
                                    <Text style={styles.submitModalBtnText}>
                                        Submit Request
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* SLA Policy Modal */}
            <Modal
                visible={slaModalVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setSlaModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                Customer Protection SLAs
                            </Text>
                            <TouchableOpacity
                                onPress={() => setSlaModalVisible(false)}
                            >
                                <X size={20} color={Colors.gray600} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
                            <Text style={styles.slaSectionTitle}>
                                Internal First-Action Targets:
                            </Text>
                            <View style={styles.slaRow}>
                                <Text style={styles.slaPriorityUrgent}>
                                    Urgent:
                                </Text>
                                <Text style={styles.slaDuration}>2 Hours</Text>
                            </View>
                            <View style={styles.slaRow}>
                                <Text style={styles.slaPriorityHigh}>
                                    High:
                                </Text>
                                <Text style={styles.slaDuration}>4 Hours</Text>
                            </View>
                            <View style={styles.slaRow}>
                                <Text style={styles.slaPriorityMedium}>
                                    Medium:
                                </Text>
                                <Text style={styles.slaDuration}>24 Hours</Text>
                            </View>
                            <View style={styles.slaRow}>
                                <Text style={styles.slaPriorityLow}>Low:</Text>
                                <Text style={styles.slaDuration}>48 Hours</Text>
                            </View>

                            <View style={styles.caseDivider} />

                            <Text style={styles.slaSectionTitle}>
                                Statutory Redressal Timelines:
                            </Text>
                            <Text style={styles.slaStatutoryText}>
                                {STATUTORY_SLA_COPY}
                            </Text>
                            <Text style={styles.slaStatutoryText}>
                                • Acknowledgement within 48 hours
                            </Text>
                            <Text style={styles.slaStatutoryText}>
                                • Resolution within 30 days
                            </Text>

                            <TouchableOpacity
                                style={[
                                    styles.submitModalBtn,
                                    { marginTop: Spacing.lg },
                                ]}
                                onPress={() => setSlaModalVisible(false)}
                            >
                                <Text style={styles.submitModalBtnText}>
                                    Got it
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.canvas,
    },
    scrollContent: {
        paddingBottom: Spacing.xxl,
    },
    plumHeader: {
        backgroundColor: Colors.deepPlum,
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.base,
        paddingBottom: Spacing.xl,
        borderBottomLeftRadius: BorderRadius.xl,
        borderBottomRightRadius: BorderRadius.xl,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: Colors.white,
        textAlign: 'center',
    },
    headerSubtitle: {
        fontSize: 13,
        color: Colors.warmCream,
        textAlign: 'center',
        marginTop: 4,
        opacity: 0.9,
    },
    helpdeskButton: {
        minHeight: 48,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.warmCream,
        borderRadius: BorderRadius.pill,
        marginTop: Spacing.md,
        paddingHorizontal: Spacing.lg,
    },
    helpdeskButtonText: {
        color: Colors.deepPlum,
        fontSize: 13,
        fontWeight: '800',
    },
    heroCard: {
        backgroundColor: Colors.white,
        marginHorizontal: Spacing.base,
        marginTop: -Spacing.md,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        ...Shadows.card,
    },
    shieldWrapper: {
        marginBottom: Spacing.md,
    },
    shieldBackgroundCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.peachCream,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: Colors.peachSoft,
    },
    heroTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: Colors.inkPrimary,
    },
    heroSubtitle: {
        fontSize: 13,
        color: Colors.inkSecondary,
        textAlign: 'center',
        marginTop: 4,
        marginBottom: Spacing.base,
    },
    heroActionButtons: {
        width: '100%',
        gap: Spacing.sm,
    },
    primaryPlumButton: {
        backgroundColor: Colors.deepPlum,
        paddingVertical: 13,
        borderRadius: BorderRadius.pill,
        alignItems: 'center',
        width: '100%',
    },
    primaryPlumButtonText: {
        color: Colors.white,
        fontSize: 14,
        fontWeight: '700',
    },
    secondaryOutlineButton: {
        backgroundColor: Colors.white,
        borderWidth: 1.5,
        borderColor: Colors.deepPlum,
        paddingVertical: 12,
        borderRadius: BorderRadius.pill,
        alignItems: 'center',
        width: '100%',
    },
    secondaryOutlineButtonText: {
        color: Colors.deepPlum,
        fontSize: 14,
        fontWeight: '700',
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginHorizontal: Spacing.base,
        marginTop: Spacing.lg,
        marginBottom: Spacing.sm,
    },
    sectionHeading: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.inkPrimary,
    },
    seeAllText: {
        fontSize: 13,
        color: Colors.coral,
        fontWeight: '600',
    },
    caseCard: {
        backgroundColor: Colors.white,
        marginHorizontal: Spacing.base,
        marginBottom: Spacing.md,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        ...Shadows.subtle,
    },
    caseCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    caseRefText: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.deepPlum,
    },
    inProgressBadge: {
        backgroundColor: '#FFF3E0',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: BorderRadius.full,
    },
    inProgressBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#E65100',
    },
    caseCategoryText: {
        fontSize: 13,
        color: Colors.inkPrimary,
        fontWeight: '600',
        marginBottom: 2,
    },
    caseDateText: {
        fontSize: 11,
        color: Colors.inkMuted,
    },
    caseDivider: {
        height: 1,
        backgroundColor: Colors.borderSubtle,
        marginVertical: Spacing.sm,
    },
    caseFooter: {
        alignItems: 'flex-end',
    },
    viewDetailsText: {
        fontSize: 12,
        color: Colors.coral,
        fontWeight: '700',
    },
    menuLinksCard: {
        backgroundColor: Colors.white,
        marginHorizontal: Spacing.base,
        marginTop: Spacing.sm,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        ...Shadows.subtle,
    },
    menuLinkItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.base,
        paddingVertical: 14,
    },
    menuLinkLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    menuLinkLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.inkPrimary,
        marginLeft: Spacing.md,
    },
    menuLinkDivider: {
        height: 1,
        backgroundColor: Colors.borderSubtle,
        marginHorizontal: Spacing.base,
    },
    helplineCard: {
        backgroundColor: Colors.peachCream,
        marginHorizontal: Spacing.base,
        marginTop: Spacing.lg,
        padding: Spacing.base,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.peachSoft,
    },
    helplineTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.plumPrimary,
    },
    helplineSubtitle: {
        fontSize: 12,
        color: Colors.inkSecondary,
        marginTop: 2,
        marginBottom: Spacing.md,
    },
    helplineButtonsRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    helplineBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: BorderRadius.pill,
        borderWidth: 1,
    },
    callBtn: {
        backgroundColor: '#EFF6FF',
        borderColor: '#BFDBFE',
    },
    callBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#1E40AF',
    },
    emailBtn: {
        backgroundColor: '#FFF7ED',
        borderColor: '#FED7AA',
    },
    emailBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#9A3412',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        padding: Spacing.lg,
        maxHeight: '85%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.base,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.inkPrimary,
    },
    modalBody: {
        paddingBottom: Spacing.lg,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.inkSecondary,
        marginBottom: 4,
        marginTop: Spacing.sm,
    },
    textInput: {
        backgroundColor: Colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: 10,
        fontSize: 13,
        color: Colors.inkPrimary,
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    categoryRadioGroup: {
        flexDirection: 'row',
        gap: Spacing.xs,
        marginBottom: Spacing.sm,
    },
    categoryRadioBtn: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: BorderRadius.pill,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        alignItems: 'center',
        backgroundColor: Colors.surfaceSubtle,
    },
    categoryRadioBtnActive: {
        backgroundColor: Colors.peachCream,
        borderColor: Colors.coral,
    },
    categoryRadioBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: Colors.inkSecondary,
    },
    categoryRadioBtnTextActive: {
        color: Colors.coralDark,
        fontWeight: '700',
    },
    submitModalBtn: {
        backgroundColor: Colors.deepPlum,
        paddingVertical: 12,
        borderRadius: BorderRadius.pill,
        alignItems: 'center',
        marginTop: Spacing.base,
    },
    submitModalBtnText: {
        color: Colors.white,
        fontSize: 13,
        fontWeight: '700',
    },
    slaSectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.inkPrimary,
        marginBottom: 6,
    },
    slaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 4,
    },
    slaPriorityUrgent: {
        color: '#DC2626',
        fontWeight: '700',
        fontSize: 13,
    },
    slaPriorityHigh: {
        color: '#EA580C',
        fontWeight: '700',
        fontSize: 13,
    },
    slaPriorityMedium: {
        color: '#D97706',
        fontWeight: '600',
        fontSize: 13,
    },
    slaPriorityLow: {
        color: '#16A34A',
        fontWeight: '600',
        fontSize: 13,
    },
    slaDuration: {
        fontWeight: '700',
        color: Colors.inkPrimary,
        fontSize: 13,
    },
    slaStatutoryText: {
        fontSize: 12,
        color: Colors.inkSecondary,
        marginVertical: 2,
    },
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.xl,
        backgroundColor: Colors.canvas,
    },
    errorTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.deepPlum,
        marginTop: Spacing.md,
        textAlign: 'center',
    },
    errorSubtitle: {
        fontSize: 13,
        color: Colors.inkSecondary,
        marginTop: 4,
        textAlign: 'center',
        maxWidth: 280,
    },
    retryBtn: {
        backgroundColor: Colors.deepPlum,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs + 2,
        borderRadius: BorderRadius.md,
        marginTop: Spacing.md,
    },
    retryBtnText: {
        color: Colors.white,
        fontSize: 12,
        fontWeight: '700',
    },
});
