import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { Colors } from '../theme/colors';
import { BorderRadius, Spacing } from '../theme/spacing';

interface SkeletonProps {
    width?: number | `${number}%` | 'auto';
    height?: number;
    borderRadius?: number;
    style?: ViewStyle;
}

export function Skeleton({
    width = '100%',
    height = 16,
    borderRadius = BorderRadius.sm,
    style,
}: SkeletonProps) {
    const opacity = useRef(new Animated.Value(0.45)).current;

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.9,
                    duration: 750,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.45,
                    duration: 750,
                    useNativeDriver: true,
                }),
            ]),
        );
        pulse.start();
        return () => pulse.stop();
    }, [opacity]);

    return (
        <Animated.View
            style={[
                styles.base,
                { width, height, borderRadius, opacity },
                style,
            ]}
        />
    );
}

export function SkeletonCard() {
    return (
        <View style={styles.card}>
            <Skeleton height={160} borderRadius={BorderRadius.base} />
            <View style={styles.cardBody}>
                <Skeleton width="65%" height={18} />
                <Skeleton width="42%" height={14} style={styles.mtSm} />
                <Skeleton width="35%" height={16} style={styles.mtMd} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    base: {
        backgroundColor: Colors.neutralSurface,
    },
    card: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        marginBottom: Spacing.base,
    },
    cardBody: {
        padding: Spacing.base,
    },
    mtSm: {
        marginTop: Spacing.sm,
    },
    mtMd: {
        marginTop: Spacing.md,
    },
});
