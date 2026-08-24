import React from 'react';
import type { UpdateInfo } from '../utils/updateChecker';
import { DownloadCloud, Sparkles, X, ExternalLink, CheckCircle } from 'lucide-react';
import { soundFX } from '../utils/soundEffects';

interface UpdateModalProps {
  updateInfo: UpdateInfo;
  onClose: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ updateInfo, onClose }) => {
  const handleDownload = () => {
    soundFX.playSuccess();
    window.open(updateInfo.downloadUrl, '_blank');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="update-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="update-modal-header">
          <div className="update-icon-badge">
            <DownloadCloud size={24} />
          </div>
          <button className="close-modal-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="update-modal-body">
          {updateInfo.hasUpdate ? (
            <>
              <div className="version-pill-row">
                <span className="update-badge-pill">NEW RELEASE AVAILABLE</span>
                <span className="version-tag">{updateInfo.latestVersion}</span>
              </div>
              <h3>Engro NAR Update Ready</h3>
              <p className="update-desc">
                A new version of Engro NAR is published on the web repository with enhanced telemetry tools.
              </p>

              <div className="release-notes-box">
                <div className="notes-title">
                  <Sparkles size={13} className="text-engro-green" />
                  <span>Release Notes:</span>
                </div>
                <div className="notes-text">{updateInfo.releaseNotes}</div>
              </div>

              <div className="update-actions">
                <button className="download-apk-action-btn" onClick={handleDownload}>
                  <DownloadCloud size={16} />
                  <span>Download Latest APK</span>
                  <ExternalLink size={14} />
                </button>
                <button className="dismiss-btn" onClick={onClose}>
                  Later
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="up-to-date-icon">
                <CheckCircle size={36} className="text-engro-green" />
              </div>
              <h3>You're on the Latest Version</h3>
              <p className="update-desc">
                Engro NAR is up to date ({updateInfo.currentVersion}). No new APK releases detected on the repository.
              </p>
              <button className="close-action-btn" onClick={onClose} style={{ marginTop: '12px' }}>
                Back to Dashboard
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
