import React from 'react';

interface WinWhiteLogoProps {
  className?: string;
  size?: number | string;
  logoUrl?: string;
  alt?: string;
}

/**
 * Authentic WIN WHITE LAUNDRY circular emblem faithfully reproduced from the official paper invoice:
 * - Crimson red circular stamp
 * - Double border rings
 * - Arced "WIN WHITE" on top
 * - Arced "LAUNDRY" on bottom
 * - Stylized "WW" monogram in the center
 * - Falls back to custom user-uploaded logoUrl if provided
 */
export const WinWhiteLogo: React.FC<WinWhiteLogoProps> = ({
  className = '',
  size = 48,
  logoUrl,
  alt = 'WIN WHITE LAUNDRY',
}) => {
  if (logoUrl) {
    return (
      <div
        className={`flex items-center justify-center overflow-hidden shrink-0 ${className}`}
        style={{ width: size, height: size }}
      >
        <img
          src={logoUrl}
          alt={alt}
          className="max-h-full max-w-full object-contain"
        />
      </div>
    );
  }

  const numericSize = typeof size === 'number' ? size : parseInt(String(size), 10) || 48;

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
      {/* Outer Circle Background */}
      <circle cx="60" cy="60" r="58" fill="#B91C1C" stroke="#991B1B" strokeWidth="2" />
      {/* Outer concentric thin ring */}
      <circle cx="60" cy="60" r="54" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeOpacity="0.85" />
      {/* Inner concentric ring */}
      <circle cx="60" cy="60" r="38" fill="#991B1B" stroke="#FFFFFF" strokeWidth="1.5" />

      {/* Curved Paths for Text */}
      <defs>
        <path
          id="wwl-top-arc"
          d="M 22 60 A 38 38 0 0 1 98 60"
          fill="none"
        />
        <path
          id="wwl-bottom-arc"
          d="M 98 60 A 38 38 0 0 1 22 60"
          fill="none"
        />
      </defs>

      {/* Top Curved Text: WIN WHITE */}
      <text fill="#FFFFFF" fontSize="9.5" fontWeight="900" letterSpacing="2.2" textAnchor="middle">
        <textPath href="#wwl-top-arc" startOffset="50%">
          WIN WHITE
        </textPath>
      </text>

      {/* Bottom Curved Text: LAUNDRY */}
      <text fill="#FFFFFF" fontSize="8.5" fontWeight="900" letterSpacing="3" textAnchor="middle">
        <textPath href="#wwl-bottom-arc" startOffset="50%">
          LAUNDRY
        </textPath>
      </text>

      {/* Center Stylized "WW" Monogram */}
      <g transform="translate(60, 60)">
        {/* Shadow / Base */}
        <text
          x="0"
          y="6.5"
          textAnchor="middle"
          fill="#FFFFFF"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="22"
          letterSpacing="-1.5"
        >
          WW
        </text>
        {/* Subtle decorative baseline line */}
        <line x1="-16" y1="9.5" x2="16" y2="9.5" stroke="#FFFFFF" strokeWidth="1" strokeOpacity="0.7" />
      </g>
    </svg>
  );
};
