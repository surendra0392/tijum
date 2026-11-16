import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Clock } from 'lucide-react-native';
import { Colors } from '../theme/colors';
import { BorderRadius, Spacing } from '../theme/spacing';

export interface StayTimingBadgeProps {
    checkIn?: string;
    checkOut?: string;
}

export function StayTimingBadge({
    checkIn,
    checkOut,
}: StayTimingBadgeProps = {}) {
    const label =
        checkIn && checkOut
            ? `${checkIn} Check-In • ${checkOut} Checkout`
            : '09:00 AM Check-In • 08:00 AM Checkout';

    return (
        <View style={styles.container}>
            <Clock size={12} color={Colors.gray700} style={styles.icon} />
            <Text style={styles.text}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderColor: Colors.neutralSurface,
        borderWidth: 1,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: BorderRadius.full,
        alignSelf: 'flex-start',
    },
    icon: {
        marginRight: 4,
    },
    text: {
        color: Colors.gray700,
        fontSize: 11,
        fontWeight: '600',
    },
});
