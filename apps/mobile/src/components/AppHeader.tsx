import React from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewStyle,
} from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';
import { BorderRadius, Spacing } from '../theme/spacing';
import { Typography } from '../theme/typography';

interface AppHeaderProps {
    title: string;
    subtitle?: string;
    showBack?: boolean;
    onBack?: () => void;
    fallbackRoute?: string;
    rightAction?: React.ReactNode;
    style?: ViewStyle;
    variant?: 'plum' | 'white';
}

export function AppHeader({
    title,
    subtitle,
    showBack = false,
    onBack,
    fallbackRoute = '/(customer)/explore',
    rightAction,
    style,
    variant = 'plum',
}: AppHeaderProps) {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else if (router.canGoBack()) {
            router.back();
        } else {
            router.replace(fallbackRoute as never);
        }
    };

    const isPlum = variant === 'plum';

    return (
        <View
            style={[
                styles.container,
                { paddingTop: Math.max(insets.top, Spacing.sm) + Spacing.xs },
                isPlum ? styles.plumContainer : styles.whiteContainer,
                style,
            ]}
        >
            <View style={styles.contentRow}>
                {showBack ? (
                    <TouchableOpacity
                        accessibilityLabel="Go back"
                        accessibilityRole="button"
                        onPress={handleBack}
                        style={[
                            styles.backButton,
                            isPlum
                                ? styles.plumBackButton
                                : styles.whiteBackButton,
                        ]}
                        activeOpacity={0.7}
                    >
                        <ChevronLeft
                            size={20}
                            color={isPlum ? Colors.white : Colors.deepPlum}
                        />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.spacer} />
                )}

                <View style={styles.titleColumn}>
                    <Text
                        style={[
                            styles.title,
                            isPlum ? styles.plumTitle : styles.whiteTitle,
                        ]}
                        numberOfLines={1}
                    >
                        {title}
                    </Text>
                    {subtitle ? (
                        <Text
                            style={[
                                styles.subtitle,
                                isPlum
                                    ? styles.plumSubtitle
                                    : styles.whiteSubtitle,
                            ]}
                            numberOfLines={1}
                        >
                            {subtitle}
                        </Text>
                    ) : null}
                </View>

                {rightAction ? (
                    <View style={styles.rightActionContainer}>
                        {rightAction}
                    </View>
                ) : (
                    <View style={styles.spacer} />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: Spacing.base,
        paddingBottom: Spacing.base,
    },
    plumContainer: {
        backgroundColor: Colors.deepPlum,
        borderBottomLeftRadius: BorderRadius.xl,
        borderBottomRightRadius: BorderRadius.xl,
    },
    whiteContainer: {
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderSubtle,
    },
    contentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 48,
    },
    backButton: {
        width: 48,
        height: 48,
        borderRadius: BorderRadius.pill,
        alignItems: 'center',
        justifyContent: 'center',
    },
    plumBackButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.16)',
    },
    whiteBackButton: {
        backgroundColor: Colors.surfaceSubtle,
    },
    titleColumn: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: Spacing.sm,
    },
    title: {
        fontFamily: Typography.fontFamily.heading,
        fontSize: 18,
    },
    plumTitle: {
        color: Colors.white,
    },
    whiteTitle: {
        color: Colors.deepPlum,
    },
    subtitle: {
        fontFamily: Typography.fontFamily.bodyMedium,
        fontSize: 12,
        marginTop: 2,
    },
    plumSubtitle: {
        color: Colors.softPeach,
    },
    whiteSubtitle: {
        color: Colors.inkSecondary,
    },
    rightActionContainer: {
        minWidth: 48,
        minHeight: 48,
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    spacer: {
        width: 48,
    },
});
