import { Link, router } from '@inertiajs/react';
import {
    CalendarClock,
    Gift,
    Heart,
    LogOut,
    Settings,
    ShieldCheck,
    UserRound,
} from 'lucide-react';
import {
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { UserInfo } from '@/components/user-info';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { logout } from '@/routes';
import { edit as appearanceEdit } from '@/routes/appearance';
import { edit as profileEdit } from '@/routes/profile';
import { index as reservationsIndex } from '@/routes/reservations';
import { edit as securityEdit } from '@/routes/security';
import type { User } from '@/types';

type Props = {
    user: User;
};

export function UserMenuContent({ user }: Props) {
    const cleanup = useMobileNavigation();

    const handleLogout = () => {
        cleanup();
        router.flushAll();
    };

    return (
        <>
            <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2.5 px-2 py-2 text-left text-sm">
                    <UserInfo user={user} showEmail />
                </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                    <Link
                        className="flex w-full cursor-pointer items-center gap-2 text-tijum-plum dark:text-foreground"
                        href={reservationsIndex()}
                        prefetch
                        onClick={cleanup}
                    >
                        <CalendarClock className="size-4 text-tijum-plum-muted dark:text-muted-foreground" />
                        <span>My Reservations</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link
                        className="flex w-full cursor-pointer items-center gap-2 text-tijum-plum dark:text-foreground"
                        href="/customer/wishlist"
                        prefetch
                        onClick={cleanup}
                    >
                        <Heart className="size-4 text-tijum-plum-muted dark:text-muted-foreground" />
                        <span>Saved Wishlist</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link
                        className="flex w-full cursor-pointer items-center gap-2 text-tijum-plum dark:text-foreground"
                        href="/customer/rewards"
                        prefetch
                        onClick={cleanup}
                    >
                        <Gift className="size-4 text-tijum-plum-muted dark:text-muted-foreground" />
                        <span>Rewards & Points</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link
                        className="flex w-full cursor-pointer items-center gap-2 text-tijum-plum dark:text-foreground"
                        href={profileEdit()}
                        prefetch
                        onClick={cleanup}
                    >
                        <UserRound className="size-4 text-tijum-plum-muted dark:text-muted-foreground" />
                        <span>Profile</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link
                        className="flex w-full cursor-pointer items-center gap-2 text-tijum-plum dark:text-foreground"
                        href={securityEdit()}
                        prefetch
                        onClick={cleanup}
                    >
                        <ShieldCheck className="size-4 text-tijum-plum-muted dark:text-muted-foreground" />
                        <span>Security</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link
                        className="flex w-full cursor-pointer items-center gap-2 text-tijum-plum dark:text-foreground"
                        href={appearanceEdit()}
                        prefetch
                        onClick={cleanup}
                    >
                        <Settings className="size-4 text-tijum-plum-muted dark:text-muted-foreground" />
                        <span>Settings</span>
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
                <Link
                    className="flex w-full cursor-pointer items-center gap-2 text-status-error-fg focus:text-status-error-fg"
                    href={logout()}
                    as="button"
                    onClick={handleLogout}
                    data-test="logout-button"
                >
                    <LogOut className="size-4" />
                    <span>Log out</span>
                </Link>
            </DropdownMenuItem>
        </>
    );
}
