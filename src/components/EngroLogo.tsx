import React from 'react';

interface EngroLogoProps {
  size?: 'small' | 'medium' | 'large';
}

export const EngroLogo: React.FC<EngroLogoProps> = ({ size = 'medium' }) => {
  const height = size === 'small' ? '28px' : size === 'large' ? '44px' : '34px';

  return (
    <div className="engro-logo-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <img
        src="/engro_logo.png"
        alt="Engro Enfrashare"
        style={{
          height,
          width: 'auto',
          objectFit: 'contain',
          display: 'block'
        }}
      />
      <div className="logo-nar-tag">
        <span className="nar-badge">NAR</span>
        <span className="c4-badge">C4 TELEMETRY</span>
      </div>
    </div>
  );
};
