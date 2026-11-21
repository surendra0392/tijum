import { resolveDeepLinkPath } from '../src/utils/deepLinkRouting.ts';

export function redirectSystemPath({
    path,
}: {
    path: string;
    initial: boolean;
}): string {
    return resolveDeepLinkPath(path);
}
