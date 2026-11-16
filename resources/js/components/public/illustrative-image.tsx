import type { ResponsiveImageSpec } from '@/data/public-content';
import { cn } from '@/lib/utils';

type IllustrativeImageProps = {
    image: ResponsiveImageSpec;
    priority?: boolean;
    aspectClassName?: string;
    imgClassName?: string;
    className?: string;
    showIllustrativeTag?: boolean;
};

export function IllustrativeImage({
    image,
    priority = false,
    aspectClassName = 'aspect-4/3',
    imgClassName,
    className,
    showIllustrativeTag = false,
}: IllustrativeImageProps) {
    return (
        <div
            className={cn(
                'relative overflow-hidden bg-tijum-surface/40',
                aspectClassName,
                className,
            )}
        >
            <picture>
                <source
                    type="image/webp"
                    srcSet={image.webpSrcSet}
                    sizes={image.sizes}
                />
                <img
                    src={image.fallbackSrc}
                    srcSet={image.jpgSrcSet}
                    sizes={image.sizes}
                    alt={image.alt}
                    width={image.width}
                    height={image.height}
                    loading={priority ? 'eager' : 'lazy'}
                    fetchPriority={priority ? 'high' : undefined}
                    decoding={priority ? 'sync' : 'async'}
                    className={cn(
                        'size-full object-cover object-center',
                        imgClassName,
                    )}
                />
            </picture>
            {showIllustrativeTag && (
                <span className="pointer-events-none absolute bottom-2.5 left-2.5 rounded-full border border-tijum-cream/25 bg-tijum-plum/85 px-2.5 py-1 font-heading text-[10px] font-semibold tracking-wide text-tijum-cream backdrop-blur-xs">
                    Illustrative Visual
                </span>
            )}
        </div>
    );
}
