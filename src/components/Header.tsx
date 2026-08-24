import React, { useState, useEffect } from 'react';
import { EngroLogo } from './EngroLogo';
import { UserCheck, Volume2, VolumeX, Cloud, RefreshCw, Calendar } from 'lucide-react';
import type { UserRole, HistoricalPeriod } from '../types';
import { soundFX } from '../utils/soundEffects';

interface HeaderProps {
  currentRole: UserRole;
  onOpenRoleSelector: () => void;
  overallAvailability: number;
  allPeriods: HistoricalPeriod[];
  activePeriodId: string;
  onSelectPeriod: (id: string) => void;
  onCloudSync: () => void;
  isSyncing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onOpenRoleSelector,
  overallAvailability,
  allPeriods,
  activePeriodId,
  onSelectPeriod,
  onCloudSync,
  isSyncing = false
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
          {/* Cloud Sync Button */}
          <button
            className={`cloud-sync-btn ${isSyncing ? 'syncing' : ''}`}
            onClick={() => {
              soundFX.playClick();
              onCloudSync();
            }}
            title="Sync Daily Cloud Data from Backend"
          >
            {isSyncing ? <RefreshCw size={13} className="spin-icon" /> : <Cloud size={13} />}
            <span>{isSyncing ? 'Syncing...' : 'Sync Cloud'}</span>
          </button>

          {/* Active Role Badge */}
          <button
            className="role-switch-badge"
            onClick={() => {
              soundFX.playClick();
              onOpenRoleSelector();
            }}
            title="Click to Switch Role / Cluster"
          >
            <UserCheck size={13} />
            <span>{currentRole === 'admin' ? 'Executive HQ' : currentRole}</span>
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

      {/* Corporate Telemetry Sub-bar + Period Selector */}
      <div className="header-sub-bar">
        {/* Multi-Month Historical Period Dropdown */}
        <div className="period-selector-wrapper">
          <Calendar size={12} className="period-cal-icon" />
          <select
            className="period-dropdown-select"
            value={activePeriodId}
            onChange={(e) => {
              soundFX.playClick();
              onSelectPeriod(e.target.value);
            }}
          >
            {allPeriods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sub-bar-right">
          <div className="live-status-group">
            <span className="live-pulse-dot" />
            <span className="live-clock-text">{timeStr}</span>
          </div>

          <div className={`sla-status-pill ${isHealthy ? 'sla-good' : 'sla-warning'}`}>
            <span>SLA: {overallAvailability}%</span>
          </div>
        </div>
      </div>
    </header>
  );
};
