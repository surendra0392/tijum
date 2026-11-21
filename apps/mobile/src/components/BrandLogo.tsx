import React from 'react';
import { StyleSheet, StyleProp, View, ViewStyle, Text } from 'react-native';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';

type BrandTone = 'light' | 'dark';

type BrandLogoProps = {
    size?: number;
    tone?: BrandTone;
    showTagline?: boolean;
    style?: StyleProp<ViewStyle>;
};

export function BrandLogo({
    size = 190,
    tone = 'dark',
    showTagline = true,
    style,
}: BrandLogoProps) {
    const wordColor = tone === 'light' ? Colors.warmCream : Colors.deepPlum;
    const wordmarkFontSize = Math.max(Typography.fontSize.xxl, size * 0.26);

    return (
        <View
            style={[styles.container, style]}
            accessible
            accessibilityLabel="TIJUM brand logo"
        >
            <Text
                style={[
                    styles.wordmark,
                    {
                        color: wordColor,
                        fontSize: wordmarkFontSize,
                        lineHeight: wordmarkFontSize * 1.1,
                        fontFamily: Typography.fontFamily.headingExtraBold,
                        letterSpacing: wordmarkFontSize * 0.006,
                        textAlign: 'center',
                    },
                ]}
            >
                TIJUM
            </Text>
            {showTagline && (
                <Text
                    style={[
                        styles.tagline,
                        {
                            color: Colors.coral,
                            fontSize: Typography.fontSize.lg,
                            lineHeight: Typography.lineHeight.xl,
                            fontFamily: Typography.fontFamily.subheading,
                            letterSpacing: 0.4,
                            textAlign: 'center',
                            marginTop: 4,
                        },
                    ]}
                >
                    Stay • Dine • Belong
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    wordmark: {
        includeFontPadding: false,
        textAlign: 'center',
    },
    tagline: {
        textAlign: 'center',
    },
});
