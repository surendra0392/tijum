import React from 'react';
import { Image, type ImageStyle, type StyleProp } from 'react-native';

const LOGOS = {
    light: require('../../assets/brand-logo-light.png'),
    dark: require('../../assets/brand-logo-dark.png'),
};

type BrandLogoProps = {
    size?: number;
    tone?: keyof typeof LOGOS;
    style?: StyleProp<ImageStyle>;
};

export function BrandLogo({ size = 190, tone = 'dark', style }: BrandLogoProps) {
    return (
        <Image
            source={LOGOS[tone]}
            style={[
                { width: size, height: size * (143 / 500), alignSelf: 'center' },
                style,
            ]}
            resizeMode="contain"
            accessible
            accessibilityRole="image"
            accessibilityLabel="TIJUM. Stay easy. Eat well. Spend less."
            testID={`tijum-brand-logo-${tone}`}
        />
    );
}
