import React from 'react';
import type { TabType } from '../types';
import { LayoutDashboard, BarChart3, Search, FileSpreadsheet } from 'lucide-react';
import { soundFX } from '../utils/soundEffects';

interface BottomNavBarProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onChangeTab
}) => {
  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard size={19} />
    },
    {
      id: 'graphs',
      label: 'Graphs',
      icon: <BarChart3 size={19} />
    },
    {
      id: 'sites',
      label: 'Site Intel',
      icon: <Search size={19} />
    },
    {
      id: 'import',
      label: 'Reports',
      icon: <FileSpreadsheet size={19} />
    }
  ];

  return (
    <nav className="corporate-nav-bar" role="navigation" aria-label="Main Tabs">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            id={`nav-${tab.id}`}
            className={`corp-tab-btn ${isActive ? 'active' : ''}`}
            onClick={() => {
              if (!isActive) {
                soundFX.playTab();
                onChangeTab(tab.id);
              }
            }}
          >
            <div className="tab-icon">{tab.icon}</div>
            <span className="tab-text">{tab.label}</span>
            {isActive && <div className="tab-indicator" />}
          </button>
        );
      })}
    </nav>
  );
};
