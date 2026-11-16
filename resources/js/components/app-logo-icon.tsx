import {
    TIJUM_BRAND_ASSETS,
    type BrandLogoTone,
} from '@/components/brand/brand-logo';
import { cn } from '@/lib/utils';

type AppLogoIconProps = {
    className?: string;
    tone?: BrandLogoTone;
    alt?: string;
};

export default function AppLogoIcon({
    className,
    tone = 'light',
    alt = 'TIJUM',
}: AppLogoIconProps) {
    const isDarkSurface = tone === 'dark';

    return (
        <picture className="inline-flex shrink-0 items-center justify-center">
            <source
                srcSet={
                    isDarkSurface
                        ? TIJUM_BRAND_ASSETS.symbolLight
                        : TIJUM_BRAND_ASSETS.symbol
                }
                type="image/webp"
            />
            <img
                src={
                    isDarkSurface
                        ? TIJUM_BRAND_ASSETS.symbolLightPng
                        : TIJUM_BRAND_ASSETS.symbolPng
                }
                alt={alt}
                width={200}
                height={180}
                decoding="async"
                className={cn('object-contain select-none', className)}
            />
        </picture>
    );
}
