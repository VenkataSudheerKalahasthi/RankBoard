import { useState, useEffect, useRef } from 'react';

/**
 * Lightweight IntersectionObserver hook for high-performance scroll triggers.
 *
 * @param {Object} options
 * @param {number} [options.threshold=0.1] - Viewport intersection threshold
 * @param {string} [options.rootMargin='0px 0px -40px 0px'] - Margins around the root
 * @param {boolean} [options.triggerOnce=true] - Only trigger once when entering viewport
 * @returns {[React.RefObject, boolean]} [ref, inView]
 */
export function useInView(options = {}) {
  const {
    threshold = 0.05,
    rootMargin = '100px 0px',
    triggerOnce = true,
  } = options;

  const elementRef = useRef(null);
  const [inView, setInView] = useState(() => {
    // Immediate fallback for SSR or environments without IntersectionObserver
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return true;
    }
    // Reduced motion preference: reveal immediately without waiting
    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return true;
      }
    } catch {
      // Fallback
    }
    return false;
  });

  useEffect(() => {
    // If already in view and triggerOnce is active, no need to observe
    if (inView && triggerOnce) return;

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setInView(true);
      return;
    }

    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setInView(true);
        return;
      }
    } catch {
      // ignore
    }

    const node = elementRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry && entry.isIntersecting) {
          setInView(true);
          if (triggerOnce) {
            observer.unobserve(node);
          }
        } else if (!triggerOnce) {
          setInView(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(node);

    return () => {
      if (node) {
        observer.unobserve(node);
      }
      observer.disconnect();
    };
  }, [threshold, rootMargin, triggerOnce, inView]);

  return [elementRef, inView];
}

export default useInView;
