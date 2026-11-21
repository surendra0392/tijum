import React, { useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../src/auth/AuthContext';
import { CustomerApi } from '../../../src/api/customer';
import { Button } from '../../../src/components/Button';
import { Input } from '../../../src/components/Input';
import { Colors } from '../../../src/theme/colors';
import { BorderRadius, Spacing } from '../../../src/theme/spacing';

export default function EditCustomerProfileScreen() {
    const router = useRouter();
    const { user, refreshProfile } = useAuth();
    const [name, setName] = useState(user?.name ?? '');
    const [phone, setPhone] = useState(user?.phone ?? '');
    const [marketingConsent, setMarketingConsent] = useState(
        user?.marketing_consent ?? false,
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        CustomerApi.getProfile()
            .then((res) => {
                if (res.data) {
                    setName(res.data.name);
                    setPhone(res.data.phone ?? '');
                    setMarketingConsent(res.data.marketing_consent);
                }
            })
            .catch(() => {});
    }, []);

    const handleSave = async () => {
        const trimmedName = name.trim();
        if (trimmedName.length < 2) {
            setError('Please enter your full name.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            await CustomerApi.updateProfile({
                name: trimmedName,
                phone: phone.trim() || undefined,
                marketing_consent: marketingConsent,
            });
            await refreshProfile().catch(() => {});
            Alert.alert(
                'Profile Updated',
                'Your profile details have been saved.',
                [{ text: 'OK', onPress: () => router.back() }],
            );
        } catch (err: any) {
            setError(
                err?.message ||
                    'Could not update your profile. Please try again.',
            );
        } finally {
            setLoading(false);
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
                <Text style={styles.heading}>Personal Details</Text>
                <Text style={styles.subheading}>
                    Keep your contact information up to date so we can reach you
                    about bookings and support requests.
                </Text>

                <Input
                    label="Full Name"
                    value={name}
                    onChangeText={setName}
                    placeholder="Your full name"
                    autoCapitalize="words"
                />
                <Input
                    label="Mobile Number"
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="+91 98765 43210"
                    keyboardType="phone-pad"
                />
                <Input
                    label="Email Address"
                    value={user?.email ?? ''}
                    editable={false}
                    style={styles.disabledInput}
                />

                <View style={styles.switchRow}>
                    <View style={styles.switchTextWrap}>
                        <Text style={styles.switchTitle}>Offers & Updates</Text>
                        <Text style={styles.switchDescription}>
                            Receive deals, seasonal offers, and TIJUM news.
                        </Text>
                    </View>
                    <Switch
                        value={marketingConsent}
                        onValueChange={setMarketingConsent}
                        trackColor={{
                            false: Colors.gray300,
                            true: Colors.peachSoft,
                        }}
                        thumbColor={
                            marketingConsent ? Colors.coral : Colors.white
                        }
                    />
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <Button
                    title="Save Changes"
                    onPress={handleSave}
                    loading={loading}
                    size="lg"
                    style={styles.saveButton}
                />
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
    heading: {
        fontSize: 20,
        fontWeight: '800',
        color: Colors.deepPlum,
        marginBottom: Spacing.xs,
    },
    subheading: {
        fontSize: 13,
        lineHeight: 19,
        color: Colors.inkSecondary,
        marginBottom: Spacing.lg,
    },
    disabledInput: {
        backgroundColor: Colors.surfaceSubtle,
        color: Colors.inkMuted,
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.base,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        padding: Spacing.base,
        marginBottom: Spacing.base,
        gap: Spacing.base,
    },
    switchTextWrap: {
        flex: 1,
    },
    switchTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.inkPrimary,
    },
    switchDescription: {
        fontSize: 12,
        color: Colors.inkSecondary,
        marginTop: 2,
    },
    errorText: {
        color: Colors.rose,
        fontSize: 13,
        marginBottom: Spacing.sm,
    },
    saveButton: {
        marginTop: Spacing.sm,
    },
});
