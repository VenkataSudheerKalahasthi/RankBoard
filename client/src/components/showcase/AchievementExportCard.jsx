import React, { forwardRef } from 'react';
import AchievementCard from './AchievementCard';

/**
 * Dedicated export component for generating deterministic, uncropped achievement card PNGs.
 * 
 * Guarantees:
 * 1. Explicit, viewport-independent dimensions:
 *    - Desktop: 872px (840px card + 16px equal outer frame on both sides)
 *    - Mobile: 472px (440px card + 16px equal outer frame on both sides)
 * 2. Unbroken, continuous left and right borders with equal outer margins
 * 3. Profile photo and content completely inside the card without edge clipping
 * 4. Solid background (#ffffff) preventing transparent or black artifact borders
 */
const AchievementExportCard = forwardRef(({ showcase, layout = 'desktop' }, ref) => {
  const isMobile = layout === 'mobile';
  const cardWidth = isMobile ? 440 : 840;
  const outerGutter = 16;
  const frameWidth = cardWidth + (outerGutter * 2);

  return (
    <div
      ref={ref}
      className="achievement-export-frame"
      style={{
        width: `${frameWidth}px`,
        minWidth: `${frameWidth}px`,
        maxWidth: `${frameWidth}px`,
        padding: `${outerGutter}px`,
        backgroundColor: '#ffffff',
        boxSizing: 'border-box',
        display: 'inline-block',
        margin: 0,
        position: 'relative',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <AchievementCard
        showcase={showcase}
        layout={layout}
        forExport={true}
      />
    </div>
  );
});

AchievementExportCard.displayName = 'AchievementExportCard';

export default AchievementExportCard;
