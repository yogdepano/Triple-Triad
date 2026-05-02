import React, { useState, useEffect } from 'react';

const LANDSCAPE_WIDTH = 1280;
const LANDSCAPE_HEIGHT = 720;

export default function DesktopScaler({ children }) {
  const [scale, setScale] = useState(1);
  const [isPortrait, setIsPortrait] = useState(false);
  const [dimensions, setDimensions] = useState({ w: LANDSCAPE_WIDTH, h: LANDSCAPE_HEIGHT });

  useEffect(() => {
    const handleResize = () => {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      const currentIsPortrait = windowHeight > windowWidth && windowWidth < 1024;
      setIsPortrait(currentIsPortrait);

      let baseW, baseH;
      if (currentIsPortrait) {
        // In portrait, fix the width to 720 and let height grow/shrink to match the phone's exact aspect ratio.
        // This eliminates black bars without cropping or stretching.
        baseW = 720;
        baseH = 720 * (windowHeight / windowWidth);
      } else {
        // In landscape, fix the height to 720 and let width adjust.
        baseH = 720;
        baseW = 720 * (windowWidth / windowHeight);
      }
      setDimensions({ w: baseW, h: baseH });

      const scaleX = windowWidth / baseW;
      const scaleY = windowHeight / baseH;
      
      let newScale = Math.min(scaleX, scaleY);
      if (newScale > 1) newScale = 1;

      setScale(newScale);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`desktop-scaler-wrapper ${isPortrait ? 'is-portrait' : ''}`}>
      <div 
        className="desktop-scaler-content"
        style={{
          width: `${dimensions.w}px`,
          height: `${dimensions.h}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        {children}
      </div>
    </div>
  );
}
