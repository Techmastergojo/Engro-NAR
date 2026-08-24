import React, { useState, useEffect } from 'react';
import { EngroLogo } from './EngroLogo';
import { Volume2, VolumeX, Sparkles, RefreshCw } from 'lucide-react';
import { soundFX } from '../utils/soundEffects';

interface HeaderProps {
  onResetData: () => void;
  activeCount: number;
  overallAvailability: number;
}

export const Header: React.FC<HeaderProps> = ({
  onResetData,
  activeCount,
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

  const isHealthy = overallAvailability >= 99.9;

  return (
    <header className="app-header">
      <div className="header-top-row">
        <EngroLogo size="medium" animated={true} />

        <div className="header-controls">
          {/* Sound Toggle */}
          <button
            className={`control-btn ${soundOn ? 'active' : ''}`}
            onClick={handleSoundToggle}
            title={soundOn ? 'Mute sound effects' : 'Enable sound effects'}
          >
            {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          {/* Quick Demo Reset */}
          <button
            className="control-btn"
            onClick={() => {
              soundFX.playClick();
              onResetData();
            }}
            title="Reload Sample Telecom Network"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Real-time Telemetry Status Bar */}
      <div className="telemetry-bar">
        <div className="live-pill">
          <span className="live-dot" />
          <span className="live-text">NOC LIVE</span>
          <span className="live-clock">{timeStr}</span>
        </div>

        <div className="telemetry-badges">
          <div className={`status-chip ${isHealthy ? 'chip-green' : 'chip-warning'}`}>
            <Sparkles size={12} />
            <span>{overallAvailability}% SLA</span>
          </div>

          <div className={`status-chip ${activeCount > 0 ? 'chip-red' : 'chip-green'}`}>
            <span>{activeCount} Outages</span>
          </div>
        </div>
      </div>
    </header>
  );
};
