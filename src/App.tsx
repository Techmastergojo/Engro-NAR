import React, { useState, useEffect } from 'react';
import type { TabType, UserRole, OutageRecord } from './types';
import { REAL_ENGRO_DATA } from './utils/realData';
import { Header } from './components/Header';
import { BottomNavBar } from './components/BottomNavBar';
import { DashboardTab } from './components/DashboardTab';
import { GraphsTab } from './components/GraphsTab';
import { SitesTab } from './components/SitesTab';
import { ImportTab } from './components/ImportTab';
import { RoleSelectorModal } from './components/RoleSelectorModal';
import { UpdateModal } from './components/UpdateModal';
import { checkForAppUpdates, type UpdateInfo } from './utils/updateChecker';
import './App.css';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
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

  // Check for updates on startup
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

  const handleManualCheckUpdates = async () => {
    const info = await checkForAppUpdates();
    setUpdateInfo(info);
    setShowUpdateModal(true);
  };

  const handleSelectRole = (role: UserRole) => {
    setCurrentRole(role);
    localStorage.setItem('engro_user_role', role);
    setShowRoleModal(false);
  };

  const handleNavigateToSites = (query: string = '') => {
    setSiteSearchQuery(query);
    setActiveTab('sites');
  };

  const handleDataOverride = (_newRecords: OutageRecord[], sourceTitle: string) => {
    localStorage.setItem('engro_custom_uploaded', sourceTitle);
    setActiveTab('dashboard');
  };


  const overallAvailability = REAL_ENGRO_DATA.summary.avgAvailability;

  return (
    <div className="corporate-viewport-shell">
      {/* Background Corporate Glow */}
      <div className="corporate-bg-mesh" />

      {/* Main Corporate Mobile App Frame */}
      <div className="corporate-app-frame">
        {/* Header */}
        <Header
          currentRole={currentRole}
          onOpenRoleSelector={() => setShowRoleModal(true)}
          overallAvailability={overallAvailability}
        />

        {/* Tab Render Area */}
        <main className="corporate-tab-view">
          {activeTab === 'dashboard' && (
            <DashboardTab
              currentRole={currentRole}
              onNavigateToSites={handleNavigateToSites}
              onNavigateToGraphs={() => setActiveTab('graphs')}
            />
          )}

          {activeTab === 'graphs' && (
            <GraphsTab currentRole={currentRole} />
          )}

          {activeTab === 'sites' && (
            <SitesTab
              currentRole={currentRole}
              initialQuery={siteSearchQuery}
            />
          )}

          {activeTab === 'import' && (
            <ImportTab
              onDataLoaded={handleDataOverride}
              onCheckUpdates={handleManualCheckUpdates}
            />
          )}
        </main>

        {/* Bottom Tab Bar */}
        <BottomNavBar
          activeTab={activeTab}
          onChangeTab={(tab) => setActiveTab(tab)}
        />
      </div>

      {/* Role & MBU Selection Modal ("Who are you?") */}
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
