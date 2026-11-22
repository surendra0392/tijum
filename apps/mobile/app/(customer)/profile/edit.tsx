import React, { useEffect, useRef, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRouter } from 'expo-router';
import { useAuth } from '../../../src/auth/AuthContext';
import { CustomerApi } from '../../../src/api/customer';
import { AppHeader } from '../../../src/components/AppHeader';
import { RequireAuth } from '../../../src/components/RequireAuth';
import { Button } from '../../../src/components/Button';
import { Input } from '../../../src/components/Input';
import { Colors } from '../../../src/theme/colors';
import { BorderRadius, Spacing } from '../../../src/theme/spacing';

export default function EditCustomerProfileScreen() {
    const router = useRouter();
    const navigation = useNavigation();
    const { user, refreshProfile } = useAuth();
    const [name, setName] = useState(user?.name ?? '');
    const [phone, setPhone] = useState(user?.phone ?? '');
    const [marketingConsent, setMarketingConsent] = useState(
        user?.marketing_consent ?? false,
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const savedBaselineRef = useRef({
        name: user?.name ?? '',
        phone: user?.phone ?? '',
        marketingConsent: user?.marketing_consent ?? false,
    });
    const allowExitRef = useRef(false);

    useEffect(() => {
        CustomerApi.getProfile()
            .then((res) => {
                if (res.data) {
                    setName(res.data.name);
                    setPhone(res.data.phone ?? '');
                    setMarketingConsent(res.data.marketing_consent);
                    savedBaselineRef.current = {
                        name: res.data.name,
                        phone: res.data.phone ?? '',
                        marketingConsent: res.data.marketing_consent,
                    };
                }
            })
            .catch(() => {});
    }, []);

    const isDirty =
        name.trim() !== savedBaselineRef.current.name.trim() ||
        phone.trim() !== savedBaselineRef.current.phone.trim() ||
        marketingConsent !== savedBaselineRef.current.marketingConsent;

    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
            if (!isDirty || allowExitRef.current || loading) {
                return;
            }
            e.preventDefault();
            Alert.alert(
                'Discard Changes?',
                'You have unsaved profile changes. Do you want to leave without saving?',
                [
                    { text: 'Keep Editing', style: 'cancel' },
                    {
                        text: 'Discard',
                        style: 'destructive',
                        onPress: () => {
                            allowExitRef.current = true;
                            navigation.dispatch(e.data.action);
                        },
                    },
                ],
            );
        });
        return unsubscribe;
    }, [navigation, isDirty, loading]);

    const handleSave = async () => {
        const trimmedName = name.trim();
        if (trimmedName.length < 2) {
            setError('Please enter your full name.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const trimmedPhone = phone.trim();
            await CustomerApi.updateProfile({
                name: trimmedName,
                phone: trimmedPhone.length > 0 ? trimmedPhone : null,
                marketing_consent: marketingConsent,
            });
            savedBaselineRef.current = {
                name: trimmedName,
                phone: trimmedPhone,
                marketingConsent,
            };
            await refreshProfile().catch(() => {});
            allowExitRef.current = true;
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
        <RequireAuth role="customer">
            <SafeAreaView style={styles.container} edges={['bottom']}>
                <AppHeader
                    title="Edit Profile"
                    showBack
                    fallbackRoute="/(customer)/profile"
                />
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
            </SafeAreaView>
        </RequireAuth>
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
