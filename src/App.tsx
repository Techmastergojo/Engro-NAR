import React, { useState, useEffect } from 'react';
import type { TabType, UserRole, HistoricalPeriod, GlobalTimelineFilter } from './types';
import { getAllPeriods, getActivePeriod, getActivePeriodId, setActivePeriodId } from './utils/periodStore';
import { syncDailyCloudTelemetry } from './utils/cloudSync';
import { Header } from './components/Header';
import { BottomNavBar } from './components/BottomNavBar';
import { DashboardTab } from './components/DashboardTab';
import { SitesTab } from './components/SitesTab';
import { RoleSelectorModal } from './components/RoleSelectorModal';
import { UpdateModal } from './components/UpdateModal';
import { checkForAppUpdates, type UpdateInfo } from './utils/updateChecker';
import './App.css';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [allPeriods, setAllPeriods] = useState<HistoricalPeriod[]>(() => getAllPeriods());
  const [activePeriodId, setActivePeriodIdState] = useState<string>(() => getActivePeriodId());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Global Timeline Filter State (From Date ➔ To Date)
  const [timelineFilter, setTimelineFilter] = useState<GlobalTimelineFilter>({
    mode: 'all',
    startDate: '2026-08-01',
    endDate: '2026-08-20'
  });
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem('engro_user_role');
    return (saved as UserRole) || 'admin';
  });

  const [showRoleModal, setShowRoleModal] = useState<boolean>(() => {
    return localStorage.getItem('engro_user_role') === null;
  });

  const [siteSearchQuery, setSiteSearchQuery] = useState<string>('');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState<boolean>(false);

  // Active dataset
  const activePeriod = allPeriods.find((p) => p.id === activePeriodId) || getActivePeriod();

  // Check for app updates on startup
  useEffect(() => {
    const checkUpdate = async () => {
      const info = await checkForAppUpdates();
      if (info.hasUpdate) {
        setUpdateInfo(info);
        setShowUpdateModal(true);
      }
    };
    checkUpdate();
  }, []);

  const handleSelectRole = (role: UserRole) => {
    setCurrentRole(role);
    localStorage.setItem('engro_user_role', role);
    setShowRoleModal(false);
  };

  const handleSelectPeriod = (id: string) => {
    setActivePeriodIdState(id);
    setActivePeriodId(id);
  };

  const handleCloudSync = async () => {
    setIsSyncing(true);
    await syncDailyCloudTelemetry();
    setAllPeriods(getAllPeriods());
    setTimeout(() => setIsSyncing(false), 800);
  };

  const handleNavigateToSites = (query: string = '') => {
    setSiteSearchQuery(query);
    setActiveTab('sites');
  };

  return (
    <div className="corporate-viewport-shell">
      {/* Background Corporate Glow */}
      <div className="corporate-bg-mesh" />

      {/* Main Corporate Mobile App Frame */}
      <div className="corporate-app-frame">
        {/* Header */}
        <Header
          currentRole={currentRole}
          onSelectRole={handleSelectRole}
          overallAvailability={activePeriod.avgAvailability}
          allPeriods={allPeriods}
          activePeriodId={activePeriodId}
          onSelectPeriod={handleSelectPeriod}
          onCloudSync={handleCloudSync}
          isSyncing={isSyncing}
        />

        {/* Tab Render Area */}
        <main className="corporate-tab-view">
          {activeTab === 'dashboard' && (
            <DashboardTab
              currentRole={currentRole}
              activePeriod={activePeriod}
              timelineFilter={timelineFilter}
              setTimelineFilter={setTimelineFilter}
              onNavigateToSites={handleNavigateToSites}
            />
          )}

          {activeTab === 'sites' && (
            <SitesTab
              currentRole={currentRole}
              activePeriod={activePeriod}
              timelineFilter={timelineFilter}
              initialQuery={siteSearchQuery}
            />
          )}
        </main>

        {/* Bottom Tab Bar */}
        <BottomNavBar
          activeTab={activeTab}
          onChangeTab={(tab) => {
            if (tab === 'dashboard' || tab === 'sites') {
              setActiveTab(tab);
            }
          }}
        />
      </div>



      {/* Role & MBU Selection Modal */}
      {showRoleModal && (
        <RoleSelectorModal
          currentRole={currentRole}
          onSelectRole={handleSelectRole}
          onClose={() => setShowRoleModal(false)}
          canDismiss={localStorage.getItem('engro_user_role') !== null}
        />
      )}

      {/* Auto-Update Notification Modal */}
      {showUpdateModal && updateInfo && (
        <UpdateModal
          updateInfo={updateInfo}
          onClose={() => setShowUpdateModal(false)}
        />
      )}
    </div>
  );
};

export default App;
