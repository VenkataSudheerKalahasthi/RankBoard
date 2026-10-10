import { toPng } from 'html-to-image';

/**
 * Robustly exports an achievement card element to a high-definition PNG image.
 * Ensures all fonts, remote images, and SVG icons are completely loaded,
 * measuring the exact content dimensions to prevent clipping.
 *
 * @param {HTMLElement} element - The target DOM node to capture
 * @param {Object} options - Export configuration options
 * @param {string} options.filename - Downloaded PNG filename
 * @param {number} [options.pixelRatio=2.5] - Output pixel ratio for sharp retina text
 * @param {number} [options.width] - Optional explicit width
 * @param {number} [options.height] - Optional explicit height
 * @returns {Promise<{ success: boolean, dataUrl?: string, error?: string }>}
 */
export const exportAchievementCard = async (element, options = {}) => {
  if (!element) {
    throw new Error('Target element for achievement export is not available.');
  }

  const {
    filename = 'rankboard_achievement.png',
    pixelRatio = 2.5,
    width,
    height,
  } = options;

  // 1. Ensure all custom and web fonts are fully rendered
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (fontErr) {
      console.warn('[Font Load Warning]:', fontErr.message);
    }
  }

  // 2. Ensure all images inside the element are fully loaded
  const images = Array.from(element.querySelectorAll('img'));
  await Promise.all(
    images.map((img) => {
      if (img.complete && img.naturalWidth !== 0) return Promise.resolve();
      return new Promise((resolve) => {
        const timeout = setTimeout(resolve, 2500);
        img.onload = () => {
          clearTimeout(timeout);
          resolve();
        };
        img.onerror = () => {
          clearTimeout(timeout);
          resolve();
        };
      });
    })
  );

  // 3. Give the browser a microtask tick for full style reflow
  await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 60)));

  // Measure target dimensions precisely
  const rect = element.getBoundingClientRect();
  const boundingWidth = Math.ceil(rect.width || element.offsetWidth || element.clientWidth || element.scrollWidth);
  const boundingHeight = Math.ceil(rect.height || element.offsetHeight || element.clientHeight || element.scrollHeight);

  const captureWidth = width || boundingWidth;
  const captureHeight = height || boundingHeight;

  // 4. Generate high-resolution PNG Data URL
  const dataUrl = await toPng(element, {
    cacheBust: true,
    pixelRatio,
    quality: 1,
    width: captureWidth,
    height: captureHeight,
    backgroundColor: '#ffffff',
    filter: (node) => !node.classList?.contains('exclude-from-download'),
    style: {
      position: 'static',
      left: 'auto',
      top: 'auto',
      margin: '0',
      transform: 'none',
      maxWidth: 'none',
      maxHeight: 'none',
      width: `${captureWidth}px`,
      boxSizing: 'border-box',
      overflow: 'visible',
    },
  });

  // 5. Trigger download safely via temporary anchor
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return {
    success: true,
    dataUrl,
    width: captureWidth * pixelRatio,
    height: captureHeight * pixelRatio,
  };
};

/**
 * Builds a clean, descriptive filename without exposing sensitive details.
 * @param {string} studentName 
 * @param {number|string} rank 
 * @param {'desktop'|'mobile'} layout 
 * @returns {string}
 */
export const buildAchievementFilename = (studentName, rank, layout = 'desktop') => {
  const safeName = (studentName || 'student')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  const rankStr = rank ? `_rank${rank}` : '';
  const layoutStr = layout ? `_${layout}` : '';
  return `rankboard_achievement_${safeName}${rankStr}${layoutStr}.png`;
};
