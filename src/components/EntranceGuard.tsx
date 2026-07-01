'use client';

import { useEffect } from 'react';

const ENTRANCE_ANIM = 'enterUp';

export default function EntranceGuard() {
    useEffect(() => {
        const markEntered = (el: EventTarget | null) => {
            if (el instanceof HTMLElement && el.hasAttribute('data-chunk')) {
                el.setAttribute('data-entered', '');
            }
        };

        const onSettle = (event: AnimationEvent) => {
            if (event.animationName === ENTRANCE_ANIM)
                markEntered(event.target);
        };
        document.addEventListener('animationend', onSettle, true);
        document.addEventListener('animationcancel', onSettle, true);

        for (const el of document.querySelectorAll<HTMLElement>(
            '[data-chunk]:not([data-entered])'
        )) {
            for (const anim of el.getAnimations()) {
                if ((anim as CSSAnimation).animationName === ENTRANCE_ANIM) {
                    anim.finished
                        .then(() => el.setAttribute('data-entered', ''))
                        .catch(() => {});
                }
            }
        }

        return () => {
            document.removeEventListener('animationend', onSettle, true);
            document.removeEventListener('animationcancel', onSettle, true);
        };
    }, []);

    return null;
}
