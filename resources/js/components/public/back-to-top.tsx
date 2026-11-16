import { ArrowUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export function BackToTop() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const toggleVisibility = () => {
            // Show after scrolling past 350px
            if (window.scrollY > 350) {
                setVisible(true);
            } else {
                setVisible(false);
            }
        };

        window.addEventListener('scroll', toggleVisibility, { passive: true });
        toggleVisibility();

        return () => window.removeEventListener('scroll', toggleVisibility);
    }, []);

    const scrollToTop = () => {
        const startPosition =
            window.pageYOffset || document.documentElement.scrollTop;
        if (startPosition <= 0) return;

        // Smooth easeInOutCubic animated scrolling over 400ms - 700ms
        const duration = Math.min(700, Math.max(400, startPosition * 0.35));
        let startTime: number | null = null;

        const easeInOutCubic = (t: number): number => {
            return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        };

        const animationStep = (currentTime: number) => {
            if (startTime === null) startTime = currentTime;
            const timeElapsed = currentTime - startTime;
            const progress = Math.min(timeElapsed / duration, 1);
            const ease = easeInOutCubic(progress);

            window.scrollTo(0, Math.round(startPosition * (1 - ease)));

            if (timeElapsed < duration) {
                window.requestAnimationFrame(animationStep);
            }
        };

        window.requestAnimationFrame(animationStep);
    };

    return (
        <button
            type="button"
            onClick={scrollToTop}
            aria-label="Back to top"
            className={cn(
                'group fixed right-6 bottom-6 z-40 flex cursor-pointer items-center gap-2 rounded-full border border-tijum-peach/40 bg-tijum-plum/95 px-3 py-2.5 font-heading text-xs font-bold text-tijum-cream shadow-tijum-soft backdrop-blur-md transition-all duration-300 ease-out focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none sm:right-8 sm:bottom-8 sm:px-4 sm:py-3',
                'hover:-translate-y-1 hover:border-tijum-coral hover:bg-tijum-coral hover:text-tijum-plum hover:shadow-tijum-card',
                visible
                    ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
                    : 'pointer-events-none translate-y-4 scale-95 opacity-0',
            )}
        >
            <ArrowUp
                className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5"
                aria-hidden="true"
            />
            <span className="hidden sm:inline">Back to top</span>
        </button>
    );
}
