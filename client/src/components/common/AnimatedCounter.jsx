import React, { useState, useEffect, useRef } from 'react';
import { useInView } from '../../hooks/useInView';

/**
 * Safely parses input value to determine if and how it can be animated.
 * Returns null if the value is non-numeric (e.g. 'Unranked', 'Pending', null).
 */
export function parseNumericTarget(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  // Raw number
  if (typeof value === 'number') {
    if (isNaN(value)) return null;
    return {
      prefix: '',
      suffix: '',
      target: value,
      decimals: Number.isInteger(value) ? 0 : 1,
    };
  }

  const str = String(value).trim();

  // Pattern: "#7" or "# 7"
  const rankMatch = str.match(/^#\s*(\d+)$/);
  if (rankMatch) {
    return {
      prefix: '#',
      suffix: '',
      target: parseInt(rankMatch[1], 10),
      decimals: 0,
    };
  }

  // Pattern: "4 / 5" or "5/5"
  const fractionMatch = str.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fractionMatch) {
    return {
      prefix: '',
      suffix: ` / ${fractionMatch[2]}`,
      target: parseInt(fractionMatch[1], 10),
      decimals: 0,
    };
  }

  // Pattern: "1,478" or "1478" or "842.5"
  const cleanStr = str.replace(/,/g, '');
  const num = Number(cleanStr);
  if (!isNaN(num)) {
    const hasDecimal = cleanStr.includes('.');
    const decimals = hasDecimal ? cleanStr.split('.')[1].length : 0;
    return {
      prefix: '',
      suffix: '',
      target: num,
      decimals: Math.min(decimals, 2),
    };
  }

  // Non-numeric (e.g. 'Unranked', 'Pending sync')
  return null;
}

/**
 * AnimatedCounter component
 * Animates numeric value from 0 to target when visible in viewport.
 */
const AnimatedCounter = ({
  value,
  duration = 900,
  className = '',
}) => {
  const [ref, inView] = useInView({ threshold: 0.1, triggerOnce: true });
  const parsed = parseNumericTarget(value);

  const [displayValue, setDisplayValue] = useState(() => {
    if (!parsed) return value ?? '—';
    if (parsed.target === 0) return `${parsed.prefix}0${parsed.suffix}`;
    return `${parsed.prefix}0${parsed.suffix}`;
  });

  const animatedRef = useRef(false);
  const startRef = useRef(null);

  useEffect(() => {
    const currentParsed = parseNumericTarget(value);
    if (!currentParsed) {
      setDisplayValue(value ?? '—');
      return;
    }

    // If target is 0, display 0 directly
    if (currentParsed.target === 0) {
      setDisplayValue(`${currentParsed.prefix}0${currentParsed.suffix}`);
      return;
    }

    if (!inView) {
      if (!animatedRef.current) {
        setDisplayValue(`${currentParsed.prefix}0${currentParsed.suffix}`);
      }
      return;
    }

    // If already animated, update directly to new value if it changes
    if (animatedRef.current) {
      formatAndSet(currentParsed.target, currentParsed);
      return;
    }

    // Check prefers-reduced-motion
    try {
      if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        animatedRef.current = true;
        formatAndSet(currentParsed.target, currentParsed);
        return;
      }
    } catch {
      // fallback
    }

    animatedRef.current = true;
    let animId;
    const startValue = 0;
    const endValue = currentParsed.target;

    // Smooth cubic ease-out curve
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const step = (timestamp) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);

      const current = startValue + (endValue - startValue) * easedProgress;
      formatAndSet(current, currentParsed);

      if (progress < 1) {
        animId = requestAnimationFrame(step);
      } else {
        formatAndSet(endValue, currentParsed);
      }
    };

    animId = requestAnimationFrame(step);

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [inView, value, duration]);

  function formatAndSet(val, p) {
    let formatted;
    if (p.decimals > 0) {
      formatted = val.toFixed(p.decimals);
    } else {
      formatted = Math.round(val).toLocaleString();
    }
    setDisplayValue(`${p.prefix}${formatted}${p.suffix}`);
  }

  return (
    <span ref={ref} className={className}>
      {displayValue}
    </span>
  );
};

export default AnimatedCounter;
