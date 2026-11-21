import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CustomerApi } from '../../../../src/api/customer';
import { useAuth } from '../../../../src/auth/AuthContext';
import {
    SupportTicketDetail,
    SupportTicketMessage,
} from '../../../../src/api/types';
import { AppHeader } from '../../../../src/components/AppHeader';
import { Button } from '../../../../src/components/Button';
import { ExceptionalState } from '../../../../src/components/ExceptionalState';
import { Input } from '../../../../src/components/Input';
import { Colors } from '../../../../src/theme/colors';
import { BorderRadius, Spacing } from '../../../../src/theme/spacing';

export default function CustomerSupportTicketDetailScreen() {
    const router = useRouter();
    const { reference } = useLocalSearchParams<{ reference: string }>();
    const { token, authState } = useAuth();
    const [ticket, setTicket] = useState<SupportTicketDetail | null>(null);
    const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [reply, setReply] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const loadTicket = async () => {
        if (!reference || !token || authState !== 'customer_authenticated') {
            return;
        }

        try {
            setLoading(true);
            setErrorMessage(null);
            const response = await CustomerApi.getSupportTicket(reference);
            setTicket(response.data.ticket);
            setMessages(response.data.messages);
        } catch (error: unknown) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'Unable to load this support ticket.',
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadTicket();
    }, [authState, reference, token]);

    const sendReply = async () => {
        if (!reference || !reply.trim()) {
            return;
        }

        try {
            setSubmitting(true);
            await CustomerApi.addSupportTicketMessage(reference, reply.trim());
            setReply('');
            await loadTicket();
        } catch (error: unknown) {
            Alert.alert(
                'Reply Not Sent',
                error instanceof Error
                    ? error.message
                    : 'Please check your connection and try again.',
            );
        } finally {
            setSubmitting(false);
        }
    };

    const closeTicket = () => {
        if (!reference) {
            return;
        }

        Alert.alert(
            'Close Ticket',
            'Close this ticket? You can create another ticket if you need more help.',
            [
                { text: 'Keep Open', style: 'cancel' },
                {
                    text: 'Close Ticket',
                    style: 'destructive',
                    onPress: () => {
                        void (async () => {
                            try {
                                await CustomerApi.closeSupportTicket(reference);
                                await loadTicket();
                            } catch (error: unknown) {
                                Alert.alert(
                                    'Ticket Not Closed',
                                    error instanceof Error
                                        ? error.message
                                        : 'Please try again.',
                                );
                            }
                        })();
                    },
                },
            ],
        );
    };

    if (!token || authState !== 'customer_authenticated') {
        return (
            <ExceptionalState
                type="auth-required"
                title="Customer Sign-In Required"
                description="Sign in to view this helpdesk ticket."
                actionLabel="Customer Sign In"
                onAction={() => router.push('/(auth)/customer-login')}
            />
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <AppHeader title="Helpdesk Ticket" />
            {loading && !ticket ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={Colors.deepPlum} />
                </View>
            ) : errorMessage && !ticket ? (
                <ExceptionalState
                    type="no-internet"
                    title="Ticket Unavailable"
                    description={errorMessage}
                    actionLabel="Try Again"
                    onAction={() => loadTicket()}
                />
            ) : ticket ? (
                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.summaryCard}>
                        <View style={styles.topRow}>
                            <Text style={styles.reference}>
                                {ticket.ticket_reference}
                            </Text>
                            <Text style={styles.status}>
                                {ticket.status_label}
                            </Text>
                        </View>
                        <Text style={styles.subject}>{ticket.subject}</Text>
                        <Text style={styles.meta}>
                            {ticket.priority_label} priority
                            {ticket.booking_reference
                                ? ` • Booking ${ticket.booking_reference}`
                                : ''}
                        </Text>
                        {ticket.sla_due_at ? (
                            <Text style={styles.meta}>
                                Response target:{' '}
                                {new Date(ticket.sla_due_at).toLocaleString(
                                    'en-IN',
                                    { dateStyle: 'medium', timeStyle: 'short' },
                                )}
                            </Text>
                        ) : null}
                    </View>

                    <Text style={styles.sectionTitle}>Conversation</Text>
                    {messages.map((message) => (
                        <View
                            key={message.id}
                            style={[
                                styles.messageCard,
                                message.sender_type === 'customer'
                                    ? styles.customerMessage
                                    : styles.supportMessage,
                            ]}
                        >
                            <Text style={styles.sender}>
                                {message.sender_name}
                            </Text>
                            <Text style={styles.messageText}>
                                {message.message}
                            </Text>
                            <Text style={styles.messageDate}>
                                {new Date(message.created_at).toLocaleString(
                                    'en-IN',
                                    { dateStyle: 'medium', timeStyle: 'short' },
                                )}
                            </Text>
                        </View>
                    ))}

                    {ticket.status !== 'closed' ? (
                        <>
                            <Input
                                label="Reply"
                                maxLength={5000}
                                multiline
                                onChangeText={setReply}
                                style={styles.replyInput}
                                value={reply}
                            />
                            <Button
                                disabled={!reply.trim()}
                                loading={submitting}
                                onPress={sendReply}
                                title="Send Reply"
                            />
                            <Button
                                onPress={closeTicket}
                                title="Close Ticket"
                                variant="outline"
                            />
                        </>
                    ) : (
                        <Text style={styles.closedText}>
                            This ticket is closed.
                        </Text>
                    )}
                </ScrollView>
            ) : null}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.canvas },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: {
        gap: Spacing.md,
        padding: Spacing.base,
        paddingBottom: Spacing.xxl,
    },
    summaryCard: {
        backgroundColor: Colors.white,
        borderColor: Colors.neutralSurface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        padding: Spacing.md,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: Spacing.sm,
    },
    reference: { color: Colors.deepPlum, fontSize: 12, fontWeight: '800' },
    status: { color: Colors.coralDark, fontSize: 12, fontWeight: '700' },
    subject: {
        color: Colors.inkPrimary,
        fontSize: 18,
        fontWeight: '800',
        marginTop: Spacing.sm,
    },
    meta: { color: Colors.inkMuted, fontSize: 12, marginTop: 5 },
    sectionTitle: { color: Colors.inkPrimary, fontSize: 16, fontWeight: '800' },
    messageCard: { borderRadius: BorderRadius.lg, padding: Spacing.md },
    customerMessage: {
        backgroundColor: Colors.peachCream,
        marginLeft: Spacing.lg,
    },
    supportMessage: { backgroundColor: Colors.white, marginRight: Spacing.lg },
    sender: { color: Colors.deepPlum, fontSize: 12, fontWeight: '800' },
    messageText: {
        color: Colors.inkPrimary,
        fontSize: 14,
        lineHeight: 20,
        marginTop: 4,
    },
    messageDate: {
        color: Colors.inkMuted,
        fontSize: 11,
        marginTop: Spacing.sm,
    },
    replyInput: { minHeight: 100, textAlignVertical: 'top' },
    closedText: {
        color: Colors.inkMuted,
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
    },
});
