import BrandLogo from '@/components/brand/brand-logo';

type TijumWordmarkProps = {
    portalLabel?: string;
    inverted?: boolean;
    className?: string;
};

export default function TijumWordmark({
    portalLabel,
    inverted = false,
    className,
}: TijumWordmarkProps) {
    return (
        <BrandLogo
            variant="horizontal"
            tone={inverted ? 'dark' : 'light'}
            portalLabel={portalLabel}
            className={className}
        />
    );
}
