import React from 'react';
import { EngroLogo } from './EngroLogo';
import { Cloud, RefreshCw } from 'lucide-react';
import type { UserRole, HistoricalPeriod } from '../types';

interface HeaderProps {
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  overallAvailability: number;
  allPeriods: HistoricalPeriod[];
  activePeriodId: string;
  onSelectPeriod: (id: string) => void;
  onCloudSync: () => void;
  isSyncing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onSelectRole,
  overallAvailability,
  allPeriods,
  activePeriodId,
  onSelectPeriod,
  onCloudSync,
  isSyncing = false
}) => {
  const isHealthy = overallAvailability >= 99.0;

  const roles: { id: UserRole; name: string }[] = [
    { id: 'admin', name: 'Executive HQ (All MBUs)' },
    { id: 'C4-GUJ-01', name: 'C4-GUJ-01 (Gujranwala 1)' },
    { id: 'C4-GUJ-02', name: 'C4-GUJ-02 (Gujranwala 2)' },
    { id: 'C4-SKT-03', name: 'C4-SKT-03 (Sialkot)' },
    { id: 'C4-GRT-04', name: 'C4-GRT-04 (Gujrat)' },
    { id: 'C4-NRW-05', name: 'C4-NRW-05 (Narowal)' },
    { id: 'C4-HFZ-06', name: 'C4-HFZ-06 (Hafizabad)' },
    { id: 'C4-WZD-07', name: 'C4-WZD-07 (Wazirabad)' },
    { id: 'C4-MBD-08', name: 'C4-MBD-08 (Mandi Bahauddin)' }
  ];

  return (
    <header className="corporate-header">
      <div className="header-top-row">
        <div className="header-left">
          <EngroLogo size="medium" />
          <span className="header-title">NAR Monitor</span>
        </div>

        <div className="header-right-controls">
          <button
            className={`cloud-sync-btn ${isSyncing ? 'syncing' : ''}`}
            onClick={onCloudSync}
            title="Sync Daily Cloud Data"
          >
            {isSyncing ? <RefreshCw size={13} className="spin-icon" /> : <Cloud size={13} />}
            <span>{isSyncing ? 'Syncing...' : 'Sync Cloud'}</span>
          </button>
        </div>
      </div>

      <div className="header-sub-bar">
        <div className="workspace-selector-container">
          <select
            className="workspace-select"
            value={currentRole}
            onChange={(e) => onSelectRole(e.target.value as UserRole)}
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sub-bar-right">
          <select
            className="period-dropdown-select"
            value={activePeriodId}
            onChange={(e) => onSelectPeriod(e.target.value)}
          >
            {allPeriods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <div className={`sla-status-pill ${isHealthy ? 'sla-good' : 'sla-warning'}`}>
            <span>SLA: {overallAvailability}%</span>
          </div>
        </div>
      </div>
    </header>
  );
};

