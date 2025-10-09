import { useEffect, useRef, type RefObject } from 'react';

export function useScrollToBottom<T extends HTMLElement>(): [
    RefObject<T | null>,
    RefObject<T | null>,
] {
    const containerRef = useRef<T>(null);
    const endRef = useRef<T>(null);

    useEffect(() => {
        const container = containerRef.current;
        const end = endRef.current;

        if (container && end) {
            const observer = new MutationObserver((mutationList) => {
                // Detect if any mutation is specifically toggling a <details> element
                const isDetailsToggle = mutationList.some((mutation) => {

                    return (
                        mutation.type === 'attributes' &&
                        (mutation.target as Element).tagName.toLowerCase() === 'details' &&
                        mutation.attributeName === 'open'
                    );
                });

                // If this is *not* a <details> toggle, do the scroll
                if (!isDetailsToggle) {
                    end.scrollIntoView({ behavior: 'instant', block: 'end' });
                }
            });

            observer.observe(container, {
                childList: true,
                subtree: true,
                attributes: true,
                characterData: true,
            });

            return () => observer.disconnect();
        }
    }, []);

    return [containerRef, endRef];
}