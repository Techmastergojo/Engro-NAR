import React, { useState, useEffect } from 'react';
import { EngroLogo } from './EngroLogo';
import { UserCheck, Volume2, VolumeX } from 'lucide-react';
import type { UserRole } from '../types';
import { soundFX } from '../utils/soundEffects';

interface HeaderProps {
  currentRole: UserRole;
  onOpenRoleSelector: () => void;
  overallAvailability: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onOpenRoleSelector,
  overallAvailability
}) => {
  const [soundOn, setSoundOn] = useState(soundFX.isEnabled());
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setTimeStr(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSoundToggle = () => {
    const newState = soundFX.toggle();
    setSoundOn(newState);
  };

  const isHealthy = overallAvailability >= 99.0;

  return (
    <header className="corporate-header">
      <div className="header-top-row">
        <EngroLogo size="medium" />

        <div className="header-right-controls">
          {/* Active Role Badge (Clickable to switch) */}
          <button
            className="role-switch-badge"
            onClick={() => {
              soundFX.playClick();
              onOpenRoleSelector();
            }}
            title="Click to Switch Role / Cluster"
          >
            <UserCheck size={13} />
            <span>{currentRole === 'admin' ? 'Executive Admin' : currentRole}</span>
          </button>

          {/* Sound Toggle */}
          <button
            className={`header-icon-btn ${soundOn ? 'active' : ''}`}
            onClick={handleSoundToggle}
            title={soundOn ? 'Mute sound' : 'Enable sound'}
          >
            {soundOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
        </div>
      </div>

      {/* Corporate Telemetry Sub-bar */}
      <div className="header-sub-bar">
        <div className="live-status-group">
          <span className="live-pulse-dot" />
          <span className="live-cluster-text">NOC LIVE</span>
          <span className="live-clock-text">{timeStr}</span>
        </div>

        <div className={`sla-status-pill ${isHealthy ? 'sla-good' : 'sla-warning'}`}>
          <span>SLA: {overallAvailability}%</span>
        </div>
      </div>
    </header>
  );
};
