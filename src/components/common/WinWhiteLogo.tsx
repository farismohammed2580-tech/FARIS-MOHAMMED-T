import React, { useState } from 'react';

export const OFFICIAL_WIN_WHITE_LOGO_URL = '/assets/aistudio/Win_White_Laundry_Emblem__1__46a32c03.png';

interface WinWhiteLogoProps {
  className?: string;
  size?: number | string;
  logoUrl?: string;
  alt?: string;
}

/**
 * Official WIN WHITE LAUNDRY circular emblem:
 * - Premium black disc with double outer ring and bright yellow accent arc
 * - Stylized white and yellow interlocking 'WW' serif monograms
 * - Circular arced 'WIN WHITE' and 'LAUNDRY' typography
 * - Clean responsive image display with fallback inline SVG
 */
export const WinWhiteLogo: React.FC<WinWhiteLogoProps> = ({
  className = '',
  size = 48,
  logoUrl,
  alt = 'WIN WHITE LAUNDRY',
}) => {
  const [imgError, setImgError] = useState(false);
  const targetLogoUrl = (logoUrl && logoUrl.trim() !== '') ? logoUrl : OFFICIAL_WIN_WHITE_LOGO_URL;
  const numericSize = typeof size === 'number' ? size : parseInt(String(size), 10) || 48;

  if (targetLogoUrl && !imgError) {
    return (
      <div
        className={`flex items-center justify-center overflow-hidden shrink-0 select-none ${className}`}
        style={{ width: numericSize, height: numericSize }}
      >
        <img
          src={targetLogoUrl}
          alt={alt}
          onError={() => setImgError(true)}
          className="h-full w-full object-contain rounded-full shadow-2xs"
        />
      </div>
    );
  }

  // Graceful fallback SVG if image asset cannot be loaded
  return (
    <svg
      width={numericSize}
      height={numericSize}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
      aria-label={alt}
      role="img"
    >
      <circle cx="60" cy="60" r="58" fill="#111111" stroke="#222222" strokeWidth="2" />
      <circle cx="60" cy="60" r="54" fill="none" stroke="#FFFFFF" strokeWidth="1.5" />
      <circle cx="60" cy="60" r="48" fill="none" stroke="#FCE300" strokeWidth="2" />
      <text
        x="60"
        y="67"
        textAnchor="middle"
        fill="#FFFFFF"
        fontFamily="serif"
        fontWeight="900"
        fontSize="24"
      >
        WW
      </text>
    </svg>
  );
};
