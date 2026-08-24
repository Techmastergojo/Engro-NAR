import React, { useState, useEffect } from 'react';
import type { TabType, OutageRecord } from './types';

import { REAL_ENGRO_DATA } from './utils/realData';
import { calculateTelecomStats } from './utils/analytics';
import { Header } from './components/Header';
import { BottomNavBar } from './components/BottomNavBar';
import { DashboardTab } from './components/DashboardTab';
import { OutagesTab } from './components/OutagesTab';
import { InsightsTab } from './components/InsightsTab';
import { ImportTab } from './components/ImportTab';
import './App.css';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [records, setRecords] = useState<OutageRecord[]>(() => {
    const saved = localStorage.getItem('engro_nar_real_records');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {
        // fallback
      }
    }
    return REAL_ENGRO_DATA.sampleIncidents;
  });

  // Persist to local storage
  useEffect(() => {
    try {
      localStorage.setItem('engro_nar_real_records', JSON.stringify(records));
    } catch {
      // ignore
    }
  }, [records]);

  const stats = calculateTelecomStats(records);

  const handleResetData = () => {
    setRecords(REAL_ENGRO_DATA.sampleIncidents);
  };

  const handleDataLoaded = (newRecords: OutageRecord[]) => {
    setRecords(newRecords);
    setActiveTab('dashboard');
  };

  const handleToggleStatus = (id: string) => {
    setRecords((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const nextStatus = r.status === 'Resolved' ? 'Active' : 'Resolved';
          return { ...r, status: nextStatus };
        }
        return r;
      })
    );
  };

  return (
    <div className="mobile-viewport-shell">
      {/* Ambient Animated Glow Mesh Background */}
      <div className="ambient-mesh-bg">
        <div className="ambient-orb orb-1" />
        <div className="ambient-orb orb-2" />
        <div className="ambient-orb orb-3" />
      </div>

      {/* Main Mobile App Frame */}
      <div className="mobile-app-container">
        {/* Header */}
        <Header
          onResetData={handleResetData}
          activeCount={stats.activeIncidents}
          overallAvailability={stats.overallAvailability}
        />

        {/* Dynamic Animated View Area */}
        <main className="tab-render-area">
          {activeTab === 'dashboard' && (
            <DashboardTab
              records={records}
              stats={stats}
              onNavigateToOutages={() => setActiveTab('outages')}
              onNavigateToImport={() => setActiveTab('import')}
            />
          )}

          {activeTab === 'outages' && (
            <OutagesTab
              records={records}
              onToggleStatus={handleToggleStatus}
            />
          )}

          {activeTab === 'insights' && (
            <InsightsTab records={records} stats={stats} />
          )}

          {activeTab === 'import' && (
            <ImportTab
              onDataLoaded={handleDataLoaded}
              currentRecordsCount={records.length}
            />
          )}
        </main>

        {/* Bottom Tab Bar */}
        <BottomNavBar
          activeTab={activeTab}
          onChangeTab={(tab) => setActiveTab(tab)}
          activeIncidentsCount={stats.activeIncidents}
        />
      </div>
    </div>
  );
};

export default App;
