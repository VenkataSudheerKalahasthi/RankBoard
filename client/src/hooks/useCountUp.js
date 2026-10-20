import { useState, useEffect, useRef } from 'react';

/**
 * Formats metric numbers cleanly and accurately:
 * - When compact: values >= 10,000 format as '12.5K' or '28.1K'; values < 10,000 format with commas like '1,250'
 * - When not compact: standard localized grouping '28,077'
 */
export const formatMetricNumber = (val, compact = false) => {
  if (val === null || val === undefined || isNaN(val)) {
    return null;
  }
  const num = Math.round(Number(val));
  if (num === 0) return '0';

  if (compact && num >= 10000) {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
    }
    return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  }

  return num.toLocaleString();
};

/**
 * Custom hook for smooth count-up number animations:
 * - Animates from previous displayed value to newly fetched authoritative value
 * - Avoids artificial increments or continuous looping
 * - Prevents replaying animation unnecessarily on unrelated re-renders
 * - Respects prefers-reduced-motion
 */
export const useCountUp = (targetValue, options = {}) => {
  const { duration = 750, compact = false } = options;

  const [currentNum, setCurrentNum] = useState(() => {
    return typeof targetValue === 'number' && !isNaN(targetValue) ? targetValue : null;
  });

  const prevTargetRef = useRef(targetValue);
  const animFrameRef = useRef(null);

  useEffect(() => {
    if (targetValue === null || targetValue === undefined || isNaN(targetValue)) {
      setCurrentNum(null);
      prevTargetRef.current = null;
      return;
    }

    const target = Number(targetValue);
    const startVal = prevTargetRef.current !== null && !isNaN(prevTargetRef.current)
      ? Number(prevTargetRef.current)
      : 0;

    // Skip animation if target hasn't changed
    if (prevTargetRef.current !== null && startVal === target && currentNum === target) {
      return;
    }

    prevTargetRef.current = target;

    // Respect user's motion preferences
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setCurrentNum(target);
      return;
    }

    // Cancel any previous in-flight animation frame
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }

    const startTime = performance.now();
    const animDuration = Math.min(duration, 900);

    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / animDuration, 1);

      // Ease-out cubic: smooth deceleration without overshoot
      const ease = 1 - Math.pow(1 - progress, 3);
      const interpolated = Math.round(startVal + (target - startVal) * ease);

      setCurrentNum(interpolated);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        setCurrentNum(target);
        animFrameRef.current = null;
      }
    };

    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [targetValue, duration]);

  const formatted = currentNum !== null ? formatMetricNumber(currentNum, compact) : null;
  const exact = currentNum !== null ? currentNum.toLocaleString() : null;

  return {
    value: currentNum,
    formatted,
    exact,
  };
};

export default useCountUp;
