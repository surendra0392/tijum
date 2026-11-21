import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Headphones, Plus, X } from 'lucide-react-native';
import { CustomerApi } from '../../../src/api/customer';
import { useAuth } from '../../../src/auth/AuthContext';
import {
    SupportTicketIndexData,
    SupportTicketSummary,
} from '../../../src/api/types';
import { AppHeader } from '../../../src/components/AppHeader';
import { Button } from '../../../src/components/Button';
import { ExceptionalState } from '../../../src/components/ExceptionalState';
import { Input } from '../../../src/components/Input';
import { Colors } from '../../../src/theme/colors';
import { BorderRadius, Spacing } from '../../../src/theme/spacing';

const PRIORITIES = [
    { value: 'low', label: 'Low' },
    { value: 'standard', label: 'Standard' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
] as const;

export default function CustomerSupportTicketsScreen() {
    const router = useRouter();
    const { token, authState } = useAuth();
    const [data, setData] = useState<SupportTicketIndexData | null>(null);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [formVisible, setFormVisible] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [category, setCategory] = useState('general_inquiry');
    const [priority, setPriority] = useState<
        'low' | 'standard' | 'high' | 'urgent'
    >('standard');
    const [bookingReference, setBookingReference] = useState('');

    const loadTickets = async () => {
        if (!token || authState !== 'customer_authenticated') {
            return;
        }

        try {
            setLoading(true);
            setErrorMessage(null);
            const response = await CustomerApi.getSupportTickets();
            setData(response.data);
        } catch (error: unknown) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'Unable to load helpdesk tickets.',
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadTickets();
    }, [authState, token]);

    const resetForm = () => {
        setSubject('');
        setMessage('');
        setCategory('general_inquiry');
        setPriority('standard');
        setBookingReference('');
    };

    const submitTicket = async () => {
        if (subject.trim().length < 3 || message.trim().length < 20) {
            Alert.alert(
                'More Detail Required',
                'Enter a subject and at least 20 characters describing your request.',
            );
            return;
        }

        try {
            setSubmitting(true);
            const response = await CustomerApi.createSupportTicket({
                subject: subject.trim(),
                category,
                priority,
                message: message.trim(),
                booking_reference: bookingReference || undefined,
            });
            setFormVisible(false);
            resetForm();
            await loadTickets();
            router.push(
                `/(customer)/support/ticket/${response.data.ticket_reference}`,
            );
        } catch (error: unknown) {
            Alert.alert(
                'Ticket Not Submitted',
                error instanceof Error
                    ? error.message
                    : 'Please check your connection and try again.',
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (!token || authState !== 'customer_authenticated') {
        return (
            <ExceptionalState
                type="auth-required"
                title="Customer Sign-In Required"
                description="Sign in to create and track helpdesk tickets."
                actionLabel="Customer Sign In"
                onAction={() => router.push('/(auth)/customer-login')}
            />
        );
    }

    const renderTicket = ({ item }: { item: SupportTicketSummary }) => (
        <TouchableOpacity
            accessibilityLabel={`Open ticket ${item.ticket_reference}`}
            accessibilityRole="button"
            activeOpacity={0.8}
            onPress={() =>
                router.push(
                    `/(customer)/support/ticket/${item.ticket_reference}`,
                )
            }
            style={styles.ticketCard}
        >
            <View style={styles.ticketTopRow}>
                <Text style={styles.reference}>{item.ticket_reference}</Text>
                <Text style={styles.status}>{item.status_label}</Text>
            </View>
            <Text style={styles.subject}>{item.subject}</Text>
            <Text style={styles.meta}>
                {item.priority_label} priority
                {item.booking_reference
                    ? ` • Booking ${item.booking_reference}`
                    : ''}
            </Text>
            <Text style={styles.meta}>
                {new Date(item.created_at).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                })}
            </Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <AppHeader
                title="Helpdesk Tickets"
                rightAction={
                    <TouchableOpacity
                        accessibilityLabel="Create helpdesk ticket"
                        accessibilityRole="button"
                        onPress={() => setFormVisible(true)}
                        style={styles.headerAction}
                    >
                        <Plus size={22} color={Colors.deepPlum} />
                    </TouchableOpacity>
                }
            />

            {loading && !data ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={Colors.deepPlum} />
                </View>
            ) : errorMessage && !data ? (
                <ExceptionalState
                    type="no-internet"
                    title="Helpdesk Unavailable"
                    description={errorMessage}
                    actionLabel="Try Again"
                    onAction={() => loadTickets()}
                />
            ) : (
                <FlatList
                    contentContainerStyle={styles.listContent}
                    data={data?.tickets ?? []}
                    keyExtractor={(item) => String(item.id)}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Headphones size={40} color={Colors.gray400} />
                            <Text style={styles.emptyTitle}>
                                No helpdesk tickets
                            </Text>
                            <Text style={styles.emptyText}>
                                Create a ticket for booking, payment, account,
                                or general assistance.
                            </Text>
                            <Button
                                title="Create Ticket"
                                onPress={() => setFormVisible(true)}
                            />
                        </View>
                    }
                    renderItem={renderTicket}
                />
            )}

            <Modal
                animationType="slide"
                onRequestClose={() => setFormVisible(false)}
                transparent
                visible={formVisible}
            >
                <View style={styles.modalBackdrop}>
                    <SafeAreaView style={styles.modalSheet}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                Create Helpdesk Ticket
                            </Text>
                            <TouchableOpacity
                                accessibilityLabel="Close ticket form"
                                accessibilityRole="button"
                                onPress={() => setFormVisible(false)}
                                style={styles.closeButton}
                            >
                                <X size={22} color={Colors.deepPlum} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView contentContainerStyle={styles.formContent}>
                            <Input
                                label="Subject"
                                maxLength={255}
                                onChangeText={setSubject}
                                value={subject}
                            />
                            <Text style={styles.fieldLabel}>Category</Text>
                            <View style={styles.chips}>
                                {(data?.categories ?? []).map((option) => (
                                    <TouchableOpacity
                                        key={option.value}
                                        onPress={() =>
                                            setCategory(option.value)
                                        }
                                        style={[
                                            styles.chip,
                                            category === option.value &&
                                                styles.chipActive,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.chipText,
                                                category === option.value &&
                                                    styles.chipTextActive,
                                            ]}
                                        >
                                            {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <Text style={styles.fieldLabel}>Priority</Text>
                            <View style={styles.chips}>
                                {PRIORITIES.map((option) => (
                                    <TouchableOpacity
                                        key={option.value}
                                        onPress={() =>
                                            setPriority(option.value)
                                        }
                                        style={[
                                            styles.chip,
                                            priority === option.value &&
                                                styles.chipActive,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.chipText,
                                                priority === option.value &&
                                                    styles.chipTextActive,
                                            ]}
                                        >
                                            {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <Text style={styles.fieldLabel}>
                                Related Booking
                            </Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                            >
                                <TouchableOpacity
                                    onPress={() => setBookingReference('')}
                                    style={[
                                        styles.chip,
                                        !bookingReference && styles.chipActive,
                                    ]}
                                >
                                    <Text style={styles.chipText}>None</Text>
                                </TouchableOpacity>
                                {(data?.reservations ?? []).map(
                                    (reservation) => (
                                        <TouchableOpacity
                                            key={reservation.id}
                                            onPress={() =>
                                                setBookingReference(
                                                    reservation.booking_reference,
                                                )
                                            }
                                            style={[
                                                styles.chip,
                                                bookingReference ===
                                                    reservation.booking_reference &&
                                                    styles.chipActive,
                                            ]}
                                        >
                                            <Text style={styles.chipText}>
                                                {reservation.booking_reference}
                                            </Text>
                                        </TouchableOpacity>
                                    ),
                                )}
                            </ScrollView>
                            <Input
                                label="Message"
                                maxLength={5000}
                                multiline
                                onChangeText={setMessage}
                                style={styles.messageInput}
                                value={message}
                            />
                            <Button
                                loading={submitting}
                                onPress={submitTicket}
                                title="Submit Ticket"
                            />
                        </ScrollView>
                    </SafeAreaView>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.canvas },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    headerAction: {
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listContent: { padding: Spacing.base, paddingBottom: Spacing.xxl },
    ticketCard: {
        backgroundColor: Colors.white,
        borderColor: Colors.neutralSurface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        marginBottom: Spacing.md,
        padding: Spacing.md,
    },
    ticketTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: Spacing.sm,
    },
    reference: { color: Colors.deepPlum, fontSize: 12, fontWeight: '800' },
    status: { color: Colors.coralDark, fontSize: 12, fontWeight: '700' },
    subject: {
        color: Colors.inkPrimary,
        fontSize: 15,
        fontWeight: '700',
        marginTop: Spacing.sm,
    },
    meta: { color: Colors.inkMuted, fontSize: 12, marginTop: 4 },
    emptyState: {
        alignItems: 'center',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.xl,
        paddingTop: 80,
    },
    emptyTitle: { color: Colors.inkPrimary, fontSize: 18, fontWeight: '800' },
    emptyText: {
        color: Colors.inkMuted,
        fontSize: 13,
        lineHeight: 19,
        textAlign: 'center',
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.35)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        maxHeight: '92%',
        backgroundColor: Colors.canvas,
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.base,
        paddingTop: Spacing.md,
    },
    modalTitle: { color: Colors.deepPlum, fontSize: 18, fontWeight: '800' },
    closeButton: {
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    formContent: {
        gap: Spacing.md,
        padding: Spacing.base,
        paddingBottom: Spacing.xxl,
    },
    fieldLabel: { color: Colors.inkPrimary, fontSize: 13, fontWeight: '700' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    chip: {
        minHeight: 44,
        justifyContent: 'center',
        backgroundColor: Colors.white,
        borderColor: Colors.neutralSurface,
        borderRadius: BorderRadius.pill,
        borderWidth: 1,
        paddingHorizontal: Spacing.md,
        marginRight: Spacing.sm,
    },
    chipActive: {
        backgroundColor: Colors.peachCream,
        borderColor: Colors.coral,
    },
    chipText: { color: Colors.inkSecondary, fontSize: 12, fontWeight: '600' },
    chipTextActive: { color: Colors.deepPlum, fontWeight: '800' },
    messageInput: { minHeight: 120, textAlignVertical: 'top' },
});
