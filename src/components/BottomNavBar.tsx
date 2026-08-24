import React from 'react';
import { TabType } from '../types';
import { LayoutDashboard, AlertTriangle, Cpu, FileSpreadsheet } from 'lucide-react';
import { soundFX } from '../utils/soundEffects';

interface BottomNavBarProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  activeIncidentsCount: number;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onChangeTab,
  activeIncidentsCount
}) => {
  const tabs: { id: TabType; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard size={20} />
    },
    {
      id: 'outages',
      label: 'Outages',
      icon: <AlertTriangle size={20} />,
      badge: activeIncidentsCount > 0 ? activeIncidentsCount : undefined
    },
    {
      id: 'insights',
      label: 'Smart AI',
      icon: <Cpu size={20} />
    },
    {
      id: 'import',
      label: 'Excel Hub',
      icon: <FileSpreadsheet size={20} />
    }
  ];

  return (
    <nav className="bottom-nav-bar" role="navigation" aria-label="Main Navigation">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            id={`nav-tab-${tab.id}`}
            className={`nav-tab-item ${isActive ? 'active' : ''}`}
            onClick={() => {
              if (!isActive) {
                soundFX.playTab();
                onChangeTab(tab.id);
              }
            }}
          >
            <div className="tab-icon-wrapper">
              {tab.icon}
              {tab.badge !== undefined && (
                <span className="tab-badge-pill">{tab.badge}</span>
              )}
            </div>
            <span className="tab-label">{tab.label}</span>
            {isActive && <div className="tab-active-glow-bar" />}
          </button>
        );
      })}
    </nav>
  );
};
