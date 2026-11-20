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
    Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CustomerApi } from '../../../src/api/customer';
import { PublicApi } from '../../../src/api/public';
import { useAuth } from '../../../src/auth/AuthContext';
import { Colors } from '../../../src/theme/colors';
import { BorderRadius, Spacing } from '../../../src/theme/spacing';
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
    Phone,
    Mail,
    Clock,
    Send,
    ChevronRight,
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

const INQUIRY_SUBJECTS = [
    { label: 'Booking Assistance', value: 'booking' },
    { label: 'Host Partnership', value: 'partner' },
    { label: 'General Inquiry', value: 'general' },
];

export default function CustomerSupportScreen() {
    const router = useRouter();
    const { booking_reference } = useLocalSearchParams<{
        booking_reference?: string;
    }>();
    const { user } = useAuth();

    const [activeTab, setActiveTab] = useState<'grievance' | 'inquiry'>(
        booking_reference ? 'grievance' : 'inquiry',
    );

    // Grievance State
    const [cases, setCases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [bookingRef, setBookingRef] = useState(booking_reference || '');
    const [selectedCategory, setSelectedCategory] = useState('food_inclusions');
    const [description, setDescription] = useState('');

    // Contact Inquiry State
    const [contactName, setContactName] = useState(user?.name || '');
    const [contactEmail, setContactEmail] = useState(user?.email || '');
    const [contactMobile, setContactMobile] = useState(user?.phone || '');
    const [contactSubject, setContactSubject] = useState<'booking' | 'partner' | 'general'>('booking');
    const [contactMessage, setContactMessage] = useState('');
    const [inquirySubmitting, setInquirySubmitting] = useState(false);

    useEffect(() => {
        loadCases();
    }, []);

    useEffect(() => {
        if (user) {
            if (!contactName && user.name) setContactName(user.name);
            if (!contactEmail && user.email) setContactEmail(user.email);
            if (!contactMobile && user.phone) setContactMobile(user.phone);
        }
    }, [user]);

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

    const handleGrievanceSubmit = async () => {
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
                    'Our Customer Protection desk will acknowledge your grievance within 48 hours and resolve it within 30 days pursuant to the TIJUM Grievance Redressal Policy.',
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

    const handleInquirySubmit = async () => {
        if (!contactName.trim()) {
            Alert.alert('Required', 'Please provide your name.');
            return;
        }
        if (!contactEmail.trim() || !contactEmail.includes('@')) {
            Alert.alert('Required', 'Please provide a valid email address.');
            return;
        }
        if (!contactMobile.trim()) {
            Alert.alert('Required', 'Please provide your mobile phone number.');
            return;
        }
        if (!contactMessage.trim()) {
            Alert.alert('Required', 'Please enter your message or question.');
            return;
        }

        try {
            setInquirySubmitting(true);
            await PublicApi.submitContact({
                name: contactName.trim(),
                email: contactEmail.trim(),
                mobile: contactMobile.trim(),
                subject: contactSubject,
                message: contactMessage.trim(),
            });

            Alert.alert(
                'Inquiry Received',
                'Thank you for reaching out to TIJUM! Our support desk has received your message and will respond within 4 hours during operational hours.',
            );
            setContactMessage('');
        } catch (e: any) {
            Alert.alert(
                'Inquiry Failed',
                e.message || 'Could not send message. Please contact via phone or email.',
            );
        } finally {
            setInquirySubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Official Channels & Direct Helpline Header */}
                <View style={styles.touchpointsCard}>
                    <View style={styles.touchpointsHeader}>
                        <Clock size={16} color={Colors.deepPlum} style={{ marginRight: 6 }} />
                        <Text style={styles.touchpointsTitle}>Official Helpline & Touchpoints</Text>
                    </View>
                    <Text style={styles.touchpointsSubtitle}>
                        Operational Hours: 9:00 AM – 9:00 PM IST (Mon–Sat)
                    </Text>

                    <View style={styles.touchpointButtonsRow}>
                        <TouchableOpacity
                            style={[styles.touchpointBtn, styles.callBtn]}
                            onPress={() => Linking.openURL('tel:+918142334033')}
                            activeOpacity={0.8}
                        >
                            <Phone size={16} color="#1E40AF" style={{ marginRight: 6 }} />
                            <Text style={styles.callBtnText}>Call Helpline (+91 81423 34033)</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.touchpointBtn, styles.emailBtn]}
                            onPress={() => Linking.openURL('mailto:support@tijum.com')}
                            activeOpacity={0.8}
                        >
                            <Mail size={16} color="#9A3412" style={{ marginRight: 6 }} />
                            <Text style={styles.emailBtnText}>Email Desk (support@tijum.com)</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Tab Navigation */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'inquiry' && styles.tabButtonActive]}
                        onPress={() => setActiveTab('inquiry')}
                        activeOpacity={0.8}
                    >
                        <MessageSquare
                            size={16}
                            color={activeTab === 'inquiry' ? Colors.coral : Colors.gray500}
                            style={{ marginRight: 6 }}
                        />
                        <Text
                            style={[
                                styles.tabText,
                                activeTab === 'inquiry' && styles.tabTextActive,
                            ]}
                        >
                            Contact Inquiry
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'grievance' && styles.tabButtonActive]}
                        onPress={() => setActiveTab('grievance')}
                        activeOpacity={0.8}
                    >
                        <ShieldCheck
                            size={16}
                            color={activeTab === 'grievance' ? Colors.coral : Colors.gray500}
                            style={{ marginRight: 6 }}
                        />
                        <Text
                            style={[
                                styles.tabText,
                                activeTab === 'grievance' && styles.tabTextActive,
                            ]}
                        >
                            Booking Grievance
                        </Text>
                    </TouchableOpacity>
                </View>

                {activeTab === 'inquiry' ? (
                    <View style={styles.contentPadding}>
                        <Text style={styles.sectionTitle}>Send an Inquiry</Text>
                        <Text style={styles.sectionSubtitle}>
                            Have questions about booking, property amenities, or partner registrations? Let us know.
                        </Text>

                        <Input
                            label="Your Name"
                            value={contactName}
                            onChangeText={setContactName}
                            placeholder="Enter your full name"
                        />

                        <Input
                            label="Email Address"
                            value={contactEmail}
                            onChangeText={setContactEmail}
                            placeholder="name@example.com"
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />

                        <Input
                            label="Mobile Number"
                            value={contactMobile}
                            onChangeText={setContactMobile}
                            placeholder="+91 98765 43210"
                            keyboardType="phone-pad"
                        />

                        <Text style={styles.fieldLabel}>Topic / Subject</Text>
                        <View style={styles.subjectRow}>
                            {INQUIRY_SUBJECTS.map((sub) => {
                                const isSelected = contactSubject === sub.value;
                                return (
                                    <TouchableOpacity
                                        key={sub.value}
                                        style={[
                                            styles.subjectChip,
                                            isSelected && styles.subjectChipActive,
                                        ]}
                                        onPress={() => setContactSubject(sub.value as any)}
                                        activeOpacity={0.8}
                                    >
                                        <Text
                                            style={[
                                                styles.subjectChipText,
                                                isSelected && styles.subjectChipTextActive,
                                            ]}
                                        >
                                            {sub.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <Input
                            label="Your Message"
                            value={contactMessage}
                            onChangeText={setContactMessage}
                            placeholder="Write your question, dates, or assistance details..."
                            multiline
                            numberOfLines={4}
                        />

                        <Button
                            title="Send Inquiry Message"
                            loading={inquirySubmitting}
                            onPress={handleInquirySubmit}
                            style={{ marginTop: Spacing.sm }}
                        />
                    </View>
                ) : (
                    <>
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
                            <Text style={styles.sectionTitle}>Lodge a Stay Grievance</Text>
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
                                onPress={handleGrievanceSubmit}
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
                                    <TouchableOpacity
                                        key={c.id || c.reference}
                                        style={styles.caseCard}
                                        onPress={() =>
                                            router.push({
                                                pathname: '/(customer)/support/[reference]',
                                                params: { reference: c.reference },
                                            })
                                        }
                                        activeOpacity={0.8}
                                    >
                                        <View style={styles.rowBetween}>
                                            <Text style={styles.caseRef}>
                                                {c.reference}
                                            </Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                <Badge
                                                    label={c.status}
                                                    variant={
                                                        c.status === 'resolved'
                                                            ? 'accent'
                                                            : 'secondary'
                                                    }
                                                />
                                                <ChevronRight size={16} color={Colors.gray400} />
                                            </View>
                                        </View>
                                        <Text style={styles.caseCategory}>
                                            Category: {c.category} • Priority: {(c.priority || 'standard').toUpperCase()}
                                        </Text>
                                        <Text style={styles.caseDesc} numberOfLines={2}>
                                            {c.description}
                                        </Text>
                                        {c.resolution_notes ? (
                                            <View style={styles.resolutionBox}>
                                                <Text style={styles.resolutionTitle}>
                                                    Support Team Update:
                                                </Text>
                                                <Text style={styles.resolutionText} numberOfLines={2}>
                                                    {c.resolution_notes}
                                                </Text>
                                            </View>
                                        ) : null}
                                        <View style={styles.viewTimelineRow}>
                                            <Text style={styles.viewTimelineText}>
                                                View Case & Messages →
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <Text style={styles.emptyText}>
                                    No previous grievances filed.
                                </Text>
                            )}
                        </View>
                    </>
                )}
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
    touchpointsCard: {
        backgroundColor: Colors.warmOffWhite,
        padding: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray200,
    },
    touchpointsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    touchpointsTitle: {
        ...Typography.labelMedium,
        color: Colors.deepPlum,
        fontWeight: '800',
    },
    touchpointsSubtitle: {
        ...Typography.bodySmall,
        fontSize: 11,
        color: Colors.gray600,
        marginBottom: Spacing.sm,
    },
    touchpointButtonsRow: {
        flexDirection: 'row',
        gap: Spacing.xs,
        flexWrap: 'wrap',
    },
    touchpointBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 7,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
    },
    whatsappBtn: {
        backgroundColor: '#F0FDF4',
        borderColor: '#BBF7D0',
    },
    whatsappBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#166534',
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
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: Colors.warmOffWhite,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray200,
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.md,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabButtonActive: {
        borderBottomColor: Colors.coral,
        backgroundColor: Colors.white,
    },
    tabText: {
        ...Typography.labelMedium,
        color: Colors.gray500,
        fontWeight: '600',
    },
    tabTextActive: {
        color: Colors.coral,
        fontWeight: '700',
    },
    banner: {
        backgroundColor: '#F0FDF4',
        padding: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#DCFCE7',
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
        marginBottom: 4,
    },
    sectionSubtitle: {
        ...Typography.bodySmall,
        color: Colors.gray600,
        marginBottom: Spacing.md,
    },
    fieldLabel: {
        ...Typography.labelSmall,
        color: Colors.deepPlum,
        marginBottom: Spacing.xs,
        marginTop: Spacing.xs,
    },
    subjectRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.xs,
        marginBottom: Spacing.md,
    },
    subjectChip: {
        paddingHorizontal: Spacing.md,
        paddingVertical: 7,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.warmOffWhite,
        borderWidth: 1,
        borderColor: Colors.gray300,
    },
    subjectChipActive: {
        backgroundColor: '#FEF2F2',
        borderColor: Colors.coral,
    },
    subjectChipText: {
        fontSize: 12,
        color: Colors.gray700,
        fontWeight: '600',
    },
    subjectChipTextActive: {
        color: Colors.coral,
        fontWeight: '700',
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
    viewTimelineRow: {
        marginTop: Spacing.xs,
        paddingTop: Spacing.xs,
        borderTopWidth: 1,
        borderTopColor: Colors.gray200,
        alignItems: 'flex-end',
    },
    viewTimelineText: {
        ...Typography.labelSmall,
        color: Colors.coral,
        fontWeight: '700',
    },
});
