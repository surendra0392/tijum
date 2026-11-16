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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/auth/AuthContext';
import { Colors } from '../../src/theme/colors';
import { Spacing } from '../../src/theme/spacing';
import { Typography } from '../../src/theme/typography';
import { Button } from '../../src/components/Button';
import { Badge } from '../../src/components/Badge';
import { Building2 } from 'lucide-react-native';

export default function PartnerAccountScreen() {
    const router = useRouter();
    const { owner, logout } = useAuth();

    const handleLogout = () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out of the Host Portal?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        await logout();
                        router.replace('/');
                    },
                },
            ],
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Host Avatar / Profile Header */}
                <View style={styles.header}>
                    <View style={styles.avatarCircle}>
                        {owner?.name ? (
                            <Text style={styles.avatarText}>
                                {owner.name.charAt(0).toUpperCase()}
                            </Text>
                        ) : (
                            <Building2 size={32} color={Colors.white} />
                        )}
                    </View>
                    <Text style={styles.userName}>
                        {owner?.name || 'Accommodation Partner'}
                    </Text>
                    <Text style={styles.userEmail}>{owner?.email}</Text>
                    <View style={{ marginTop: Spacing.xs }}>
                        <Badge label="VERIFIED HOST" variant="accent" />
                    </View>
                </View>

                <View style={styles.contentPadding}>
                    {/* Host Business Credentials */}
                    <Text style={styles.sectionTitle}>
                        Host Business Information
                    </Text>
                    <View style={styles.infoCard}>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Business Name:</Text>
                            <Text style={styles.infoValue}>
                                {owner?.business_name || 'Independent Host'}
                            </Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Contact Phone:</Text>
                            <Text style={styles.infoValue}>
                                {owner?.phone || 'Not configured'}
                            </Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>
                                Marketplace Agreement:
                            </Text>
                            <Text
                                style={[
                                    styles.infoValue,
                                    { color: Colors.forestGreen },
                                ]}
                            >
                                Active & Verified
                            </Text>
                        </View>
                    </View>

                    {/* Settlement Account Status */}
                    <View style={styles.divider} />
                    <Text style={styles.sectionTitle}>
                        Settlement & Route Status
                    </Text>
                    <View style={styles.infoCard}>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>
                                Settlement Channel:
                            </Text>
                            <Text style={styles.infoValue}>
                                Razorpay Route Linked Account
                            </Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>
                                Payout Schedule:
                            </Text>
                            <Text style={styles.infoValue}>
                                T+3 Weekly Batch
                            </Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>
                                Payout Currency:
                            </Text>
                            <Text style={styles.infoValue}>INR (₹)</Text>
                        </View>
                    </View>

                    {/* Switch to Customer Portal */}
                    <View style={styles.divider} />
                    <Button
                        title="Switch to Customer (Guest) Portal"
                        variant="outline"
                        onPress={() => {
                            logout();
                            router.replace('/');
                        }}
                        style={{ marginBottom: Spacing.sm }}
                    />

                    <Button
                        title="Sign Out"
                        variant="outline"
                        onPress={handleLogout}
                        style={styles.logoutBtn}
                    />
                </View>
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
    header: {
        alignItems: 'center',
        paddingVertical: Spacing.xl,
        backgroundColor: Colors.warmOffWhite,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray200,
    },
    avatarCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: Colors.deepPlum,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.sm,
    },
    avatarText: {
        fontSize: 28,
        color: Colors.white,
        fontWeight: '700',
    },
    userName: {
        ...Typography.titleMedium,
        color: Colors.deepPlum,
    },
    userEmail: {
        ...Typography.bodySmall,
        color: Colors.gray500,
        marginTop: 2,
    },
    contentPadding: {
        padding: Spacing.lg,
    },
    sectionTitle: {
        ...Typography.titleSmall,
        color: Colors.deepPlum,
        marginBottom: Spacing.sm,
    },
    infoCard: {
        backgroundColor: Colors.warmOffWhite,
        borderRadius: 10,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
        gap: 8,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    infoLabel: {
        ...Typography.bodySmall,
        color: Colors.gray500,
    },
    infoValue: {
        ...Typography.bodySmall,
        color: Colors.deepPlum,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: Colors.gray200,
        marginVertical: Spacing.xl,
    },
    logoutBtn: {
        borderColor: Colors.coral,
    },
});
