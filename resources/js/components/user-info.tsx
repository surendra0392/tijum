import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import type { User } from '@/types';

export function UserInfo({
    user,
    showEmail = false,
}: {
    user: User;
    showEmail?: boolean;
}) {
    const getInitials = useInitials();

    return (
        <>
            <Avatar className="size-8 shrink-0 overflow-hidden rounded-full border border-tijum-peach">
                {user.avatar && (
                    <AvatarImage src={user.avatar} alt={user.name} />
                )}
                <AvatarFallback className="rounded-full bg-tijum-peach/65 font-heading text-xs font-bold text-tijum-plum">
                    {getInitials(user.name)}
                </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-heading font-semibold text-tijum-plum dark:text-foreground">
                    {user.name}
                </span>
                {showEmail && (
                    <span className="truncate text-xs text-tijum-plum-muted dark:text-muted-foreground">
                        {user.email}
                    </span>
                )}
            </div>
        </>
    );
}
