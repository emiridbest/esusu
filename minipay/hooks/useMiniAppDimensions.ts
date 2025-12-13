import React from 'react';

interface MiniAppDimensions {
  width: number | string;
  height: number | string;
  isMobile: boolean;
  maxWidth: string;
  containerClass: string;
}

/**
 * Custom hook to get responsive Mini App dimensions
 * Web: Fixed 424x695px
 * Mobile: Device-aware responsive sizing
 */
export const useMiniAppDimensions = (): MiniAppDimensions => {
  const [dimensions, setDimensions] = React.useState<MiniAppDimensions>({
    width: 424,
    height: 695,
    isMobile: false,
    maxWidth: '100%',
    containerClass: 'web-mini-app',
  });

  React.useEffect(() => {
    const updateDimensions = () => {
      const isMobile = window.innerWidth < 768;

      if (isMobile) {
        // Mobile: Use 95% of viewport width and 90% of viewport height for responsive fit
        setDimensions({
          width: '95vw',
          height: '90vh',
          isMobile: true,
          maxWidth: 'calc(100vw - 20px)',
          containerClass: 'mobile-mini-app',
        });
      } else {
        // Web: Fixed dimensions
        setDimensions({
          width: 424,
          height: 695,
          isMobile: false,
          maxWidth: '424px',
          containerClass: 'web-mini-app',
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  return dimensions;
};
