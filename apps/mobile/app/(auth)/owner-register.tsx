import React, { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { AlertCircle, Building2, Home, Users } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/auth/AuthContext';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import {
    CANONICAL_CATEGORIES,
    CanonicalCategorySlug,
} from '../../src/constants/categories';
import { Colors } from '../../src/theme/colors';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { Typography } from '../../src/theme/typography';

const GENDER_OPTIONS = [
    { value: 'all_genders', label: 'All Genders (Both)' },
    { value: 'male_only', label: 'Men Only' },
    { value: 'female_only', label: 'Women Only' },
];

const CITIES = [
    'Hyderabad',
    'Guntur',
    'Vijayawada',
    'Visakhapatnam',
    'Bangalore',
    'Chennai',
];

export default function OwnerRegisterScreen() {
    const router = useRouter();
    const { registerPartner } = useAuth();

    // 10 Fields State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [propertyName, setPropertyName] = useState('');
    const [propertyType, setPropertyType] =
        useState<CanonicalCategorySlug>('hostels-pg');
    const [availableFor, setAvailableFor] = useState('all_genders');
    const [selectedCity, setSelectedCity] = useState('Hyderabad');
    const [locality, setLocality] = useState('');
    const [description, setDescription] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(false);

    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handleRegister = async () => {
        if (!name.trim() || !email.trim() || !password) {
            setErrorMessage('Please fill in your name, email, and password.');
            return;
        }

        if (!phone.trim()) {
            setErrorMessage(
                'Please provide your mandatory mobile phone number.',
            );
            return;
        }

        if (!propertyName.trim()) {
            setErrorMessage(
                'Please provide the name of your accommodation property.',
            );
            return;
        }

        if (!locality.trim()) {
            setErrorMessage(
                'Please enter the property locality or neighborhood.',
            );
            return;
        }

        if (password.length < 8) {
            setErrorMessage('Password must be at least 8 characters long.');
            return;
        }

        if (!termsAccepted) {
            setErrorMessage(
                'Please accept the TIJUM Partner Agreement and Terms.',
            );
            return;
        }

        setLoading(true);
        setErrorMessage('');

        try {
            await registerPartner({
                name: name.trim(),
                email: email.trim(),
                phone: phone.trim(),
                password,
                property_name: propertyName.trim(),
                property_type: propertyType,
                available_for: availableFor,
                location: selectedCity,
                locality: locality.trim(),
                description: description.trim() || undefined,
                terms: true,
                terms_accepted: true,
            });

            router.replace('/(partner)/dashboard');
        } catch (err: any) {
            setErrorMessage(
                err?.message ||
                    'Partner registration failed. Please review your details.',
            );
        } finally {
            setLoading(false);
        }
    };

    const getCategoryIcon = (slug: CanonicalCategorySlug) => {
        switch (slug) {
            case 'hostels-pg':
                return Building2;
            case 'homestays':
                return Home;
            case 'co-living':
                return Users;
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardView}
        >
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.header}>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>PARTNER ONBOARDING</Text>
                    </View>
                    <Text style={styles.title}>List Your Property</Text>
                    <Text style={styles.subtitle}>
                        Join TIJUM to reach verified tenants with seamless
                        monthly billing, meal disclosures, and guaranteed
                        payouts.
                    </Text>
                </View>

                {errorMessage ? (
                    <View style={styles.errorBox}>
                        <AlertCircle
                            size={16}
                            color={Colors.rose}
                            style={{ marginRight: 6 }}
                        />
                        <Text style={styles.errorText}>{errorMessage}</Text>
                    </View>
                ) : null}

                <View style={styles.form}>
                    <Text style={styles.sectionHeading}>
                        1. Partner Account Details
                    </Text>
                    <Input
                        label="Partner / Owner Full Name"
                        placeholder="K. Venkat Rao"
                        value={name}
                        onChangeText={setName}
                    />
                    <Input
                        label="Email Address"
                        placeholder="venkat@stayhostel.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={email}
                        onChangeText={setEmail}
                    />
                    <Input
                        label="Mobile Phone (Mandatory)"
                        placeholder="+91 98765 43210"
                        keyboardType="phone-pad"
                        value={phone}
                        onChangeText={setPhone}
                    />
                    <Input
                        label="Password (min 8 characters)"
                        placeholder="••••••••"
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                    />

                    <Text
                        style={[
                            styles.sectionHeading,
                            { marginTop: Spacing.lg },
                        ]}
                    >
                        2. Property Details
                    </Text>
                    <Input
                        label="Property / Stay Name"
                        placeholder="Sri Lakshmi Luxury Stays"
                        value={propertyName}
                        onChangeText={setPropertyName}
                    />

                    {/* Canonical Category Selector (3 Canonical Categories) */}
                    <Text style={styles.fieldLabel}>
                        Property Type (Canonical Category)
                    </Text>
                    <View style={styles.categoryRow}>
                        {CANONICAL_CATEGORIES.map((cat) => {
                            const isSelected = propertyType === cat.slug;
                            const IconComp = getCategoryIcon(cat.slug);
                            return (
                                <TouchableOpacity
                                    key={cat.slug}
                                    activeOpacity={0.8}
                                    onPress={() => setPropertyType(cat.slug)}
                                    style={[
                                        styles.categoryOption,
                                        isSelected &&
                                            styles.categoryOptionActive,
                                    ]}
                                >
                                    <IconComp
                                        size={16}
                                        color={
                                            isSelected
                                                ? Colors.white
                                                : Colors.deepPlum
                                        }
                                    />
                                    <Text
                                        style={[
                                            styles.categoryOptionText,
                                            isSelected &&
                                                styles.categoryOptionTextActive,
                                        ]}
                                    >
                                        {cat.name}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Available For / Gender Policy */}
                    <Text
                        style={[styles.fieldLabel, { marginTop: Spacing.md }]}
                    >
                        Available For (Gender Eligibility)
                    </Text>
                    <View style={styles.radioRow}>
                        {GENDER_OPTIONS.map((g) => {
                            const isSelected = availableFor === g.value;
                            return (
                                <TouchableOpacity
                                    key={g.value}
                                    activeOpacity={0.8}
                                    onPress={() => setAvailableFor(g.value)}
                                    style={[
                                        styles.radioPill,
                                        isSelected && styles.radioPillActive,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.radioPillText,
                                            isSelected &&
                                                styles.radioPillTextActive,
                                        ]}
                                    >
                                        {g.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* City / Location */}
                    <Text
                        style={[styles.fieldLabel, { marginTop: Spacing.md }]}
                    >
                        Location City
                    </Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.cityRow}
                    >
                        {CITIES.map((city) => {
                            const isSelected = selectedCity === city;
                            return (
                                <TouchableOpacity
                                    key={city}
                                    activeOpacity={0.8}
                                    onPress={() => setSelectedCity(city)}
                                    style={[
                                        styles.cityPill,
                                        isSelected && styles.cityPillActive,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.cityPillText,
                                            isSelected &&
                                                styles.cityPillTextActive,
                                        ]}
                                    >
                                        {city}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    <Input
                        label="Locality / Neighborhood"
                        placeholder="e.g. Brodipet, Arundelpet, Madhapur"
                        value={locality}
                        onChangeText={setLocality}
                    />

                    <Input
                        label="Description (Optional)"
                        placeholder="Brief overview of accommodation, atmosphere, and amenities..."
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={3}
                    />

                    {/* Terms & Conditions Acceptance */}
                    <TouchableOpacity
                        style={styles.termsRow}
                        activeOpacity={0.8}
                        onPress={() => setTermsAccepted(!termsAccepted)}
                    >
                        <View
                            style={[
                                styles.checkbox,
                                termsAccepted && styles.checkboxActive,
                            ]}
                        >
                            {termsAccepted && (
                                <Text style={styles.checkmark}>✓</Text>
                            )}
                        </View>
                        <Text style={styles.termsText}>
                            I accept the{' '}
                            <Text style={styles.termsLink}>
                                Partner Terms & Conditions
                            </Text>{' '}
                            and declare my property information is accurate.
                        </Text>
                    </TouchableOpacity>

                    <Button
                        title="Submit Partner Application"
                        variant="primary"
                        size="lg"
                        loading={loading}
                        onPress={handleRegister}
                        style={styles.submitButton}
                    />
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Already registered as a partner?{' '}
                    </Text>
                    <TouchableOpacity
                        onPress={() => router.push('/(auth)/owner-login')}
                    >
                        <Text style={styles.linkText}>Partner Sign In</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    keyboardView: {
        flex: 1,
        backgroundColor: Colors.cream,
    },
    container: {
        padding: Spacing.lg,
        paddingBottom: Spacing.xxl * 2,
    },
    header: {
        marginBottom: Spacing.lg,
    },
    badge: {
        backgroundColor: Colors.softPeach,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
        borderRadius: 6,
        alignSelf: 'flex-start',
        marginBottom: Spacing.xs,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: Colors.deepPlum,
        letterSpacing: 0.5,
    },
    title: {
        fontSize: Typography.fontSize.xxl,
        fontWeight: '800',
        color: Colors.deepPlum,
        marginBottom: Spacing.xs,
    },
    subtitle: {
        fontSize: Typography.fontSize.sm,
        color: Colors.gray600,
        lineHeight: 20,
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.roseLight,
        padding: Spacing.md,
        borderRadius: 8,
        marginBottom: Spacing.base,
        borderWidth: 1,
        borderColor: Colors.rose,
    },
    errorText: {
        flex: 1,
        color: '#9F1239',
        fontSize: Typography.fontSize.sm,
        fontWeight: '600',
    },
    form: {
        backgroundColor: Colors.white,
        padding: Spacing.lg,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.neutralSurface,
    },
    sectionHeading: {
        fontSize: Typography.fontSize.sm,
        fontWeight: '800',
        color: Colors.deepPlum,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginBottom: Spacing.sm,
    },
    fieldLabel: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '700',
        color: Colors.gray700,
        marginBottom: 6,
        textTransform: 'uppercase',
    },
    categoryRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: Spacing.sm,
    },
    categoryOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.gray100,
        paddingVertical: 10,
        paddingHorizontal: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.gray200,
        gap: 6,
    },
    categoryOptionActive: {
        backgroundColor: Colors.deepPlum,
        borderColor: Colors.deepPlum,
    },
    categoryOptionText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '700',
        color: Colors.gray800,
    },
    categoryOptionTextActive: {
        color: Colors.white,
    },
    radioRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: Spacing.sm,
    },
    radioPill: {
        paddingHorizontal: Spacing.md,
        paddingVertical: 7,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.gray100,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    radioPillActive: {
        backgroundColor: Colors.deepPlum,
        borderColor: Colors.deepPlum,
    },
    radioPillText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '600',
        color: Colors.gray700,
    },
    radioPillTextActive: {
        color: Colors.white,
    },
    cityRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: Spacing.md,
    },
    cityPill: {
        paddingHorizontal: Spacing.md,
        paddingVertical: 6,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.gray100,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    cityPillActive: {
        backgroundColor: Colors.deepPlum,
        borderColor: Colors.deepPlum,
    },
    cityPillText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '600',
        color: Colors.gray700,
    },
    cityPillTextActive: {
        color: Colors.white,
    },
    termsRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: Spacing.sm,
        marginBottom: Spacing.md,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderWidth: 2,
        borderColor: Colors.gray400,
        borderRadius: 4,
        marginRight: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    checkboxActive: {
        backgroundColor: Colors.deepPlum,
        borderColor: Colors.deepPlum,
    },
    checkmark: {
        color: Colors.white,
        fontSize: 12,
        fontWeight: 'bold',
    },
    termsText: {
        flex: 1,
        fontSize: Typography.fontSize.xs,
        color: Colors.gray600,
        lineHeight: 18,
    },
    termsLink: {
        color: Colors.deepPlum,
        fontWeight: '700',
    },
    submitButton: {
        marginTop: Spacing.sm,
    },
    footer: {
        alignItems: 'center',
        marginTop: Spacing.lg,
    },
    footerText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.gray600,
    },
    linkText: {
        fontSize: Typography.fontSize.sm,
        fontWeight: '700',
        color: Colors.deepPlum,
        marginTop: 2,
    },
});
