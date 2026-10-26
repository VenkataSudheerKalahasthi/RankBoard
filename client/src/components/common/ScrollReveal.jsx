import React from 'react';
import { useInView } from '../../hooks/useInView';

/**
 * ScrollReveal Component
 * Smoothly reveals content when it enters the viewport.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child elements to animate
 * @param {number} [props.delay=0] - Delay in milliseconds before animating
 * @param {number} [props.duration=450] - Animation duration in milliseconds
 * @param {number} [props.distance=20] - Distance in pixels to translate upward
 * @param {'up' | 'down' | 'none'} [props.direction='up'] - Translation direction
 * @param {boolean} [props.scale=true] - Whether to apply subtle scale animation (0.985 -> 1)
 * @param {string} [props.className=''] - Additional CSS classes
 * @param {React.ElementType} [props.as='div'] - HTML tag or React component to render
 * @param {Object} [props.style={}] - Additional inline styles
 */
const ScrollReveal = ({
  children,
  delay = 0,
  duration = 380,
  distance = 16,
  direction = 'up',
  scale = false,
  className = '',
  as: Component = 'div',
  style = {},
  threshold = 0.05,
  rootMargin = '100px 0px',
  ...props
}) => {
  const [ref, inView] = useInView({ threshold, rootMargin, triggerOnce: true });

  const getTranslate = () => {
    if (direction === 'up') return `translateY(${distance}px)`;
    if (direction === 'down') return `translateY(-${distance}px)`;
    return 'none';
  };

  const hiddenTransform = `${getTranslate()} ${scale ? 'scale(0.985)' : ''}`.trim();
  const visibleTransform = 'translateY(0) scale(1)';

  return (
    <Component
      ref={ref}
      className={`scroll-reveal-container ${className}`}
      style={{
        ...style,
        opacity: inView ? 1 : 0,
        transform: inView ? visibleTransform : hiddenTransform,
        transitionProperty: 'opacity, transform',
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        willChange: inView ? 'auto' : 'opacity, transform',
      }}
      {...props}
    >
      {children}
    </Component>
  );
};

export default ScrollReveal;
