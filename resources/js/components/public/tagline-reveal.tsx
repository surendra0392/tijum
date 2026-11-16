import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type TaglineRevealProps = {
    text: string;
    className?: string;
};

export function TaglineReveal({ text, className }: TaglineRevealProps) {
    const root = useRef<HTMLParagraphElement>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const element = root.current;
        if (!element) {
            return;
        }

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setVisible(true);
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.35 },
        );

        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    return (
        <p ref={root} className={cn('text-wrap-balance', className)}>
            {text.split(' ').map((word, index) => (
                <span
                    key={`${word}-${index}`}
                    className={cn(
                        'mr-[0.22em] inline-block text-tijum-plum transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] last:mr-0',
                        visible ? 'translate-y-0' : 'translate-y-1',
                    )}
                    style={{ transitionDelay: `${index * 55}ms` }}
                >
                    {word}
                </span>
            ))}
        </p>
    );
}
