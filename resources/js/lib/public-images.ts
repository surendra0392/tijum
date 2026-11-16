export function resolveLegacyPublicImage(
    url: string | null | undefined,
): string | null {
    if (!url) {
        return null;
    }

    if (
        url.startsWith('/images/public/') &&
        url.endsWith('.jpg') &&
        !/-\d+w\.jpg$/.test(url)
    ) {
        const width = url.endsWith('/hero-stay.jpg')
            ? 1200
            : url.endsWith('/hero-meal.jpg')
              ? 960
              : 800;

        return url.replace(/\.jpg$/, `-${width}w.jpg`);
    }

    return url;
}

export function isGenericPublicPlaceholder(
    url: string | null | undefined,
): boolean {
    return Boolean(
        url &&
        (url.endsWith('/hero-stay.jpg') ||
            url.endsWith('/hero-stay-1200w.jpg')),
    );
}
