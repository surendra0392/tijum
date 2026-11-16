import { useEffect, useRef, useState, type ReactNode } from 'react';
import gsap from 'gsap';
import { cn } from '@/lib/utils';

type ScrollRevealProps = {
    children: ReactNode;
    className?: string;
    direction?: 'up' | 'down' | 'left' | 'right' | 'none';
    distance?: number;
    duration?: number;
    delay?: number;
    stagger?: number;
    threshold?: number;
};

export function ScrollReveal({
    children,
    className,
    direction = 'up',
    distance = 28,
    duration = 0.75,
    delay = 0,
    stagger = 0.12,
    threshold = 0.15,
}: ScrollRevealProps) {
    const rootRef = useRef<HTMLDivElement>(null);
    const [hasAnimated, setHasAnimated] = useState(false);

    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;

        // Skip animation if user prefers reduced motion
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setHasAnimated(true);
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !hasAnimated) {
                    setHasAnimated(true);
                    observer.disconnect();

                    let x = 0;
                    let y = 0;
                    if (direction === 'up') y = distance;
                    else if (direction === 'down') y = -distance;
                    else if (direction === 'left') x = distance;
                    else if (direction === 'right') x = -distance;

                    const targets =
                        root.children.length > 1
                            ? Array.from(root.children)
                            : root;

                    gsap.fromTo(
                        targets,
                        {
                            opacity: 0,
                            x,
                            y,
                        },
                        {
                            opacity: 1,
                            x: 0,
                            y: 0,
                            duration,
                            delay,
                            stagger: root.children.length > 1 ? stagger : 0,
                            ease: 'power3.out',
                            clearProps: 'all',
                        },
                    );
                }
            },
            { threshold },
        );

        observer.observe(root);
        return () => observer.disconnect();
    }, [direction, distance, duration, delay, stagger, threshold, hasAnimated]);

    return (
        <div
            ref={rootRef}
            className={cn(className, !hasAnimated && 'opacity-0')}
            style={
                hasAnimated
                    ? undefined
                    : {
                          transition: 'opacity 0.2s ease',
                      }
            }
        >
            {children}
        </div>
    );
}
