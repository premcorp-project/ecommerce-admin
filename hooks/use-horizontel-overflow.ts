'use client';

import * as React from 'react';

export function useHorizontalOverflow<T extends HTMLElement>() {
  const ref = React.useRef<T | null>(null);
  const [showLeft, setShowLeft] = React.useState(false);
  const [showRight, setShowRight] = React.useState(false);

  const update = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setShowLeft(scrollLeft > 5);
    setShowRight(scrollLeft + clientWidth < scrollWidth - 5);
  }, []);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Initial update with a slight delay to ensure content is rendered
    const timer = setTimeout(() => {
      update();
    }, 100);

    // Update on resize
    const ro = new ResizeObserver(() => {
      update();
    });
    ro.observe(el);

    // Update on scroll
    el.addEventListener('scroll', update, { passive: true });

    // Update on window resize
    const handleResize = () => update();
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      ro.disconnect();
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', handleResize);
    };
  }, [update]);

  const scrollByAmount = React.useCallback(
    (dir: 'left' | 'right', ratio = 0.85) => {
      const el = ref.current;
      if (!el) return;
      const amount = Math.floor(el.clientWidth * ratio);
      setTimeout(() => {
        el.scrollBy({
          left: dir === 'left' ? -amount : amount,
          behavior: 'smooth',
        });
      }, 0);
    },
    [],
  );

  return { ref, showLeft, showRight, scrollByAmount, update };
}
