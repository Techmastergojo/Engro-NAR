import React, { useState } from 'react';
import type { UserRole } from '../types';
import { MBU_NAMES } from '../utils/realData';
import { ChevronRight, X } from 'lucide-react';
import { soundFX } from '../utils/soundEffects';


interface RoleSelectorModalProps {
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  onClose?: () => void;
  canDismiss?: boolean;
}

export const RoleSelectorModal: React.FC<RoleSelectorModalProps> = ({
  currentRole,
  onSelectRole,
  onClose,
  canDismiss = false
}) => {
  const [selected, setSelected] = useState<UserRole>(currentRole);

  const handleConfirm = () => {
    soundFX.playSuccess();
    onSelectRole(selected);
    if (onClose) onClose();
  };

  const rolesList: { id: UserRole; title: string; subtitle: string; icon: string }[] = [
    {
      id: 'admin',
      title: 'Executive / HQ Admin',
      subtitle: 'Full access to all 8 MBUs, 1,239 towers & corporate SLA',
      icon: '🏢'
    },
    {
      id: 'C4-GUJ-01',
      title: 'C4-GUJ-01 Lead',
      subtitle: 'Gujranwala Cluster 1 & associated towers',
      icon: '📡'
    },
    {
      id: 'C4-GUJ-02',
      title: 'C4-GUJ-02 Lead',
      subtitle: 'Gujranwala Cluster 2 & associated towers',
      icon: '📡'
    },
    {
      id: 'C4-SKT-03',
      title: 'C4-SKT-03 Lead',
      subtitle: 'Sialkot Cluster & associated towers',
      icon: '📡'
    },
    {
      id: 'C4-GRT-04',
      title: 'C4-GRT-04 Lead',
      subtitle: 'Gujrat Cluster & associated towers',
      icon: '📡'
    },
    {
      id: 'C4-NRW-05',
      title: 'C4-NRW-05 Lead',
      subtitle: 'Narowal Cluster & associated towers',
      icon: '📡'
    },
    {
      id: 'C4-HFZ-06',
      title: 'C4-HFZ-06 Lead',
      subtitle: 'Hafizabad Cluster & associated towers',
      icon: '📡'
    },
    {
      id: 'C4-WZD-07',
      title: 'C4-WZD-07 Lead',
      subtitle: 'Wazirabad Cluster & associated towers',
      icon: '📡'
    },
    {
      id: 'C4-MBD-08',
      title: 'C4-MBD-08 Lead',
      subtitle: 'Mandi Bahauddin Cluster & associated towers',
      icon: '📡'
    }
  ];

  return (
    <div className="modal-backdrop">
      <div className="role-modal-card">
        <div className="role-modal-header">
          <div className="modal-brand-row">
            <img src="/engro_logo.png" alt="Engro" style={{ height: '32px' }} />
            {canDismiss && onClose && (
              <button className="close-modal-btn" onClick={onClose}>
                <X size={18} />
              </button>
            )}
          </div>
          <h2>Select Your Role</h2>
          <p>Please select your designation or MBU cluster to personalize the NAR dashboard.</p>
        </div>

        <div className="role-dropdown-container">
          <label className="dropdown-label">Active Workspace / Role:</label>
          <select
            className="styled-role-select"
            value={selected}
            onChange={(e) => {
              soundFX.playClick();
              setSelected(e.target.value as UserRole);
            }}
          >
            {rolesList.map((r) => (
              <option key={r.id} value={r.id}>
                {r.icon} {MBU_NAMES[r.id] || r.title}
              </option>
            ))}
          </select>
        </div>

        <div className="role-cards-scroll">
          {rolesList.map((r) => {
            const isChosen = selected === r.id;
            return (
              <div
                key={r.id}
                className={`role-option-item ${isChosen ? 'active' : ''}`}
                onClick={() => {
                  soundFX.playClick();
                  setSelected(r.id);
                }}
              >
                <span className="role-icon">{r.icon}</span>
                <div className="role-info">
                  <div className="role-title">{r.title}</div>
                  <div className="role-desc">{r.subtitle}</div>
                </div>
                <div className={`role-radio ${isChosen ? 'checked' : ''}`}>
                  {isChosen && <div className="radio-dot" />}
                </div>
              </div>
            );
          })}
        </div>

        <div className="role-modal-footer">
          <button className="enter-portal-btn" onClick={handleConfirm}>
            <span>Access {selected === 'admin' ? 'Executive Dashboard' : selected}</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
