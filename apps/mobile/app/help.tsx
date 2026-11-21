import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    ChevronDown,
    ChevronUp,
    LifeBuoy,
    Mail,
    Phone,
} from 'lucide-react-native';
import { useAuth } from '../src/auth/AuthContext';
import { PublicApi } from '../src/api/public';
import { Button } from '../src/components/Button';
import { Input } from '../src/components/Input';
import { Colors } from '../src/theme/colors';
import { BorderRadius, Spacing } from '../src/theme/spacing';

interface FaqItem {
    id: number;
    question: string;
    answer: string;
    category?: string;
}

const SUBJECTS = [
    { value: 'booking', label: 'Booking' },
    { value: 'partner', label: 'Partner' },
    { value: 'general', label: 'General' },
] as const;

export default function HelpCentreScreen() {
    const { user } = useAuth();
    const [faqs, setFaqs] = useState<FaqItem[]>([]);
    const [loadingFaqs, setLoadingFaqs] = useState(true);
    const [openId, setOpenId] = useState<number | null>(null);
    const [name, setName] = useState(user?.name ?? '');
    const [email, setEmail] = useState(user?.email ?? '');
    const [mobile, setMobile] = useState(user?.phone ?? '');
    const [subject, setSubject] =
        useState<(typeof SUBJECTS)[number]['value']>('booking');
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        PublicApi.getFaqs()
            .then((res) => {
                setFaqs(Array.isArray(res.data) ? res.data : []);
            })
            .catch(() => {})
            .finally(() => setLoadingFaqs(false));
    }, []);

    const handleSubmit = async () => {
        if (
            !name.trim() ||
            !email.trim() ||
            !mobile.trim() ||
            !message.trim()
        ) {
            setError('Please complete all fields so we can help you.');
            return;
        }

        setSubmitting(true);
        setError('');
        try {
            await PublicApi.submitContact({
                name: name.trim(),
                email: email.trim(),
                mobile: mobile.trim(),
                subject,
                message: message.trim(),
            });
            setMessage('');
            Alert.alert(
                'Message Sent',
                'Our support team will get back to you within 24 hours.',
            );
        } catch (err: any) {
            setError(
                err?.message ||
                    'Could not send your message. Please try again.',
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.hero}>
                    <LifeBuoy size={28} color={Colors.coral} />
                    <Text style={styles.heroTitle}>How can we help?</Text>
                    <Text style={styles.heroSubtitle}>
                        Browse common questions or send our support team a
                        message.
                    </Text>
                </View>

                <View style={styles.contactRow}>
                    <View style={styles.contactCard}>
                        <Phone size={18} color={Colors.deepPlum} />
                        <Text style={styles.contactLabel}>Call us</Text>
                        <Text style={styles.contactValue}>+91 81423 34033</Text>
                    </View>
                    <View style={styles.contactCard}>
                        <Mail size={18} color={Colors.deepPlum} />
                        <Text style={styles.contactLabel}>Email</Text>
                        <Text style={styles.contactValue}>
                            support@tijum.com
                        </Text>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>
                    Frequently Asked Questions
                </Text>
                {loadingFaqs ? (
                    <ActivityIndicator
                        color={Colors.coral}
                        style={styles.loader}
                    />
                ) : faqs.length === 0 ? (
                    <Text style={styles.mutedText}>
                        FAQs are unavailable right now. Send us a message below.
                    </Text>
                ) : (
                    faqs.map((faq) => {
                        const isOpen = openId === faq.id;
                        return (
                            <View key={faq.id} style={styles.faqCard}>
                                <TouchableOpacity
                                    style={styles.faqHeader}
                                    onPress={() =>
                                        setOpenId(isOpen ? null : faq.id)
                                    }
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.faqQuestion}>
                                        {faq.question}
                                    </Text>
                                    {isOpen ? (
                                        <ChevronUp
                                            size={18}
                                            color={Colors.inkMuted}
                                        />
                                    ) : (
                                        <ChevronDown
                                            size={18}
                                            color={Colors.inkMuted}
                                        />
                                    )}
                                </TouchableOpacity>
                                {isOpen ? (
                                    <Text style={styles.faqAnswer}>
                                        {faq.answer}
                                    </Text>
                                ) : null}
                            </View>
                        );
                    })
                )}

                <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>
                    Send a Message
                </Text>
                <View style={styles.formCard}>
                    <Input
                        label="Full Name"
                        value={name}
                        onChangeText={setName}
                        placeholder="Your name"
                    />
                    <Input
                        label="Email Address"
                        value={email}
                        onChangeText={setEmail}
                        placeholder="you@example.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                    <Input
                        label="Mobile Number"
                        value={mobile}
                        onChangeText={setMobile}
                        placeholder="+91 98765 43210"
                        keyboardType="phone-pad"
                    />

                    <Text style={styles.fieldLabel}>What is this about?</Text>
                    <View style={styles.subjectRow}>
                        {SUBJECTS.map((option) => {
                            const active = subject === option.value;
                            return (
                                <TouchableOpacity
                                    key={option.value}
                                    style={[
                                        styles.subjectChip,
                                        active && styles.subjectChipActive,
                                    ]}
                                    onPress={() => setSubject(option.value)}
                                >
                                    <Text
                                        style={[
                                            styles.subjectText,
                                            active && styles.subjectTextActive,
                                        ]}
                                    >
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <Input
                        label="Message"
                        value={message}
                        onChangeText={setMessage}
                        placeholder="Tell us what happened and how we can help."
                        multiline
                        numberOfLines={5}
                        style={styles.messageInput}
                    />

                    {error ? (
                        <Text style={styles.errorText}>{error}</Text>
                    ) : null}

                    <Button
                        title="Send Message"
                        onPress={handleSubmit}
                        loading={submitting}
                        size="lg"
                    />
                </View>

                <Text style={styles.hoursText}>
                    Support hours: 9:00 AM – 9:00 PM IST, Monday to Saturday.
                </Text>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.canvas,
    },
    content: {
        padding: Spacing.base,
        paddingBottom: Spacing.xxl,
    },
    hero: {
        backgroundColor: Colors.deepPlum,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        marginBottom: Spacing.base,
    },
    heroTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: Colors.white,
        marginTop: Spacing.sm,
    },
    heroSubtitle: {
        fontSize: 13,
        lineHeight: 19,
        color: Colors.warmCream,
        marginTop: 4,
        opacity: 0.9,
    },
    contactRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.lg,
    },
    contactCard: {
        flex: 1,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        padding: Spacing.base,
        gap: 4,
    },
    contactLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: Colors.inkMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: 4,
    },
    contactValue: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.inkPrimary,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: Colors.deepPlum,
        marginBottom: Spacing.sm,
    },
    loader: {
        marginVertical: Spacing.base,
    },
    mutedText: {
        fontSize: 13,
        color: Colors.inkSecondary,
        marginBottom: Spacing.base,
    },
    faqCard: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        marginBottom: Spacing.sm,
        overflow: 'hidden',
    },
    faqHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
        padding: Spacing.base,
    },
    faqQuestion: {
        flex: 1,
        fontSize: 13,
        fontWeight: '700',
        color: Colors.inkPrimary,
    },
    faqAnswer: {
        fontSize: 13,
        lineHeight: 19,
        color: Colors.inkSecondary,
        paddingHorizontal: Spacing.base,
        paddingBottom: Spacing.base,
    },
    formCard: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        padding: Spacing.base,
    },
    fieldLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.gray700,
        marginBottom: Spacing.xs,
    },
    subjectRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    subjectChip: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 9,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
    },
    subjectChipActive: {
        backgroundColor: Colors.deepPlum,
        borderColor: Colors.deepPlum,
    },
    subjectText: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.inkSecondary,
    },
    subjectTextActive: {
        color: Colors.white,
    },
    messageInput: {
        minHeight: 110,
        textAlignVertical: 'top',
    },
    errorText: {
        color: Colors.rose,
        fontSize: 13,
        marginBottom: Spacing.sm,
    },
    hoursText: {
        fontSize: 11,
        color: Colors.inkMuted,
        textAlign: 'center',
        marginTop: Spacing.base,
    },
});
