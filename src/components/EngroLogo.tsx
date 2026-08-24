import React from 'react';

interface EngroLogoProps {
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
}

export const EngroLogo: React.FC<EngroLogoProps> = ({ size = 'medium', animated = true }) => {
  const isSmall = size === 'small';
  const isLarge = size === 'large';

  return (
    <div className={`engro-logo-container ${isSmall ? 'size-sm' : isLarge ? 'size-lg' : 'size-md'}`}>
      {/* Animated Radar Pulse Effect */}
      {animated && <div className="radar-glow-effect" />}

      {/* Engro Multi-Color Graphic Symbol */}
      <svg
        viewBox="0 0 160 56"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`engro-brand-svg ${animated ? 'glow-active' : ''}`}
        style={{ width: isSmall ? '130px' : isLarge ? '210px' : '170px', height: 'auto' }}
      >
        <defs>
          <linearGradient id="engroBlueGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0066CC" />
            <stop offset="100%" stopColor="#003B73" />
          </linearGradient>
          <linearGradient id="engroOrangeGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FF9900" />
            <stop offset="100%" stopColor="#E65C00" />
          </linearGradient>
          <linearGradient id="engroGreenGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#00D26A" />
            <stop offset="100%" stopColor="#008A3E" />
          </linearGradient>
          <linearGradient id="engroRedGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FF3366" />
            <stop offset="100%" stopColor="#D90429" />
          </linearGradient>
          <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Dynamic Engro Multi-element Swirl */}
        <g className={animated ? 'logo-swirl-group' : ''}>
          {/* Cyan/Blue Arc */}
          <path
            d="M18 10 C 26 10, 32 16, 32 24 C 32 26, 30 27, 28 26 C 24 23, 20 22, 16 23 C 14 23, 13 21, 14 19 C 15 14, 17 11, 18 10 Z"
            fill="url(#engroBlueGrad)"
            filter="url(#neonGlow)"
          />
          {/* Orange/Yellow Flame Arc */}
          <path
            d="M32 24 C 32 32, 26 38, 18 38 C 16 38, 15 36, 16 34 C 19 32, 21 28, 20 24 C 20 22, 22 21, 24 22 C 29 23, 31 23, 32 24 Z"
            fill="url(#engroOrangeGrad)"
            filter="url(#neonGlow)"
          />
          {/* Green Growth Leaf Arc */}
          <path
            d="M18 38 C 10 38, 4 32, 4 24 C 4 22, 6 21, 8 22 C 12 25, 16 26, 20 25 C 22 25, 23 27, 22 29 C 21 34, 19 37, 18 38 Z"
            fill="url(#engroGreenGrad)"
            filter="url(#neonGlow)"
          />
          {/* Crimson Red Core Seed */}
          <path
            d="M4 24 C 4 16, 10 10, 18 10 C 20 10, 21 12, 20 14 C 17 16, 15 20, 16 24 C 16 26, 14 27, 12 26 C 7 25, 5 25, 4 24 Z"
            fill="url(#engroRedGrad)"
            filter="url(#neonGlow)"
          />
          {/* Center Tech Core */}
          <circle cx="18" cy="24" r="3.2" fill="#FFFFFF" opacity="0.95" />
          <circle cx="18" cy="24" r="1.5" fill="#00E5FF" />
        </g>

        {/* Text: engro */}
        <text
          x="42"
          y="28"
          fill="#FFFFFF"
          fontFamily="'Plus Jakarta Sans', sans-serif"
          fontWeight="800"
          fontSize="19"
          letterSpacing="-0.5px"
        >
          engro
        </text>

        {/* Text: enfrashare */}
        <text
          x="43"
          y="42"
          fill="#00D26A"
          fontFamily="'Outfit', sans-serif"
          fontWeight="700"
          fontSize="11.5"
          letterSpacing="1.2px"
        >
          ENFRASHARE
        </text>

        {/* Sub-badge: NAR */}
        <rect x="130" y="14" width="28" height="15" rx="4" fill="rgba(0, 229, 255, 0.15)" stroke="#00E5FF" strokeWidth="0.8" />
        <text
          x="134"
          y="25"
          fill="#00E5FF"
          fontFamily="'JetBrains Mono', monospace"
          fontWeight="700"
          fontSize="8.5"
          letterSpacing="0.5px"
        >
          NAR
        </text>
      </svg>
    </div>
  );
};
