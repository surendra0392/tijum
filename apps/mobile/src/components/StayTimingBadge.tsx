import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Clock } from 'lucide-react-native';
import { Colors } from '../theme/colors';
import { BorderRadius, Spacing } from '../theme/spacing';
import { Typography } from '../theme/typography';

export interface StayTimingBadgeProps {
    checkIn?: string;
    checkOut?: string;
}

export function StayTimingBadge({
    checkIn,
    checkOut,
}: StayTimingBadgeProps = {}) {
    const formatTime = (value?: string): string | null => {
        if (!value) {
            return null;
        }

        const match = value.match(/^(\d{1,2}):(\d{2})/);
        if (!match) {
            return value;
        }

        const hour = Number(match[1]);
        const minutes = match[2];
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;

        return `${displayHour}:${minutes} ${period}`;
    };

    const formattedCheckIn = formatTime(checkIn);
    const formattedCheckOut = formatTime(checkOut);
    const label =
        formattedCheckIn && formattedCheckOut
            ? `${formattedCheckIn} Check-In • ${formattedCheckOut} Checkout`
            : 'Stay timing not configured';

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
        color: Colors.inkSecondary,
        fontFamily: Typography.fontFamily.bodyMedium,
        fontSize: 11,
    },
});
