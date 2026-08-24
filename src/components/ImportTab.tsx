import React, { useState, useRef } from 'react';
import type { HistoricalPeriod, SiteCatalogItem } from '../types';
import { parseExcelFile } from '../utils/excelParser';
import { savePeriod, getActivePeriod } from '../utils/periodStore';
import {
  UploadCloud,
  FileSpreadsheet,
  AlertCircle,
  Sparkles,
  Download,
  CheckCircle2,
  RefreshCw,
  Layers,
  ArrowRight,
  PlusCircle,
  Share2
} from 'lucide-react';

import * as XLSX from 'xlsx';
import confetti from 'canvas-confetti';
import { soundFX } from '../utils/soundEffects';

interface ImportTabProps {
  onPeriodCreated: (newPeriod: HistoricalPeriod) => void;
  onCheckUpdates?: () => void;
  onCloudSync?: () => void;
  isSyncing?: boolean;
}

export const ImportTab: React.FC<ImportTabProps> = ({
  onPeriodCreated,
  onCheckUpdates,
  onCloudSync,
  isSyncing = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [periodNameInput, setPeriodNameInput] = useState<string>('September 2026 Telemetry');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string; details?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setStatusMessage({
        type: 'error',
        text: 'Invalid file format. Please upload an Excel spreadsheet (.xlsx, .xls) or CSV.'
      });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    try {
      const result = await parseExcelFile(file);
      
      const siteMap: Record<string, SiteCatalogItem> = {};
      const reasonMap: Record<string, { reason: string; category: string; totalDtHours: number; incidentCount: number }> = {};
      const mbuMap: Record<string, { mbu: string; totalDtHours: number; incidentCount: number; siteCount: Set<string> }> = {};
      const dailyMap: Record<string, { date: string; totalDtHours: number; incidentCount: number; mbus: Record<string, number> }> = {};
      let totalDt = 0;

      result.records.forEach(r => {
        const siteCode = r.siteId;
        const dt = r.downtimeHours || 0;
        totalDt += dt;

        if (!siteMap[siteCode]) {
          siteMap[siteCode] = {
            siteCode: r.siteId,
            siteName: r.siteName,
            mbu: r.region,
            vendor: 'Huawei',
            siteType: 'Macro',
            priority: 'General',
            totalDtHours: 0,
            incidentCount: 0,
            availability: r.availability,
            nar6Months: [],
            topReasons: [],
            dailyTimeline: []
          };
        }
        siteMap[siteCode].totalDtHours += dt;
        siteMap[siteCode].incidentCount += 1;

        const reason = r.rootCause || r.category || 'Power Grid';
        if (!reasonMap[reason]) {
          reasonMap[reason] = { reason, category: r.category, totalDtHours: 0, incidentCount: 0 };
        }
        reasonMap[reason].totalDtHours += dt;
        reasonMap[reason].incidentCount += 1;

        const mbu = r.region || 'C4-GUJ-01';
        if (!mbuMap[mbu]) {
          mbuMap[mbu] = { mbu, totalDtHours: 0, incidentCount: 0, siteCount: new Set() };
        }
        mbuMap[mbu].totalDtHours += dt;
        mbuMap[mbu].incidentCount += 1;
        mbuMap[mbu].siteCount.add(siteCode);

        const d = r.timestamp || '2026-09-01';
        if (!dailyMap[d]) {
          dailyMap[d] = { date: d, totalDtHours: 0, incidentCount: 0, mbus: {} };
        }
        dailyMap[d].totalDtHours += dt;
        dailyMap[d].incidentCount += 1;
        dailyMap[d].mbus[mbu] = (dailyMap[d].mbus[mbu] || 0) + dt;
      });

      const allSitesList: SiteCatalogItem[] = Object.values(siteMap).map(s => ({
        ...s,
        totalDtHours: Number(s.totalDtHours.toFixed(1))
      })).sort((a, b) => b.totalDtHours - a.totalDtHours);

      const mbuList = Object.entries(mbuMap).map(([mbu, d]) => ({
        mbu,
        totalDtHours: Number(d.totalDtHours.toFixed(1)),
        incidentCount: d.incidentCount,
        siteCount: d.siteCount.size,
        avgAvailability: Number((100 - (d.totalDtHours / Math.max(1, d.siteCount.size * 480)) * 100).toFixed(2))
      })).sort((a, b) => b.totalDtHours - a.totalDtHours);

      const topReasonsList = Object.values(reasonMap).map(r => ({
        reason: r.reason,
        category: r.category,
        totalDtHours: Number(r.totalDtHours.toFixed(1)),
        incidentCount: r.incidentCount
      })).sort((a, b) => b.totalDtHours - a.totalDtHours);

      const dailyTimelineList = Object.values(dailyMap).map(d => ({
        ...d,
        narPercent: Math.max(90, Number((100 - (d.totalDtHours / Math.max(1, allSitesList.length * 24)) * 100).toFixed(2)))
      })).sort((a, b) => a.date.localeCompare(b.date));

      const newPeriodId = `period-${Date.now()}`;
      const periodName = periodNameInput.trim() || file.name.replace(/\.[^/.]+$/, '');

      const newHistoricalPeriod: HistoricalPeriod = {
        id: newPeriodId,
        name: periodName,
        createdAt: new Date().toISOString().split('T')[0],
        sitesCount: allSitesList.length,
        totalDtHours: Number(totalDt.toFixed(1)),
        avgAvailability: Number((result.records.reduce((s, r) => s + r.availability, 0) / Math.max(1, result.records.length)).toFixed(2)),
        allSites: allSitesList,
        topReasons: topReasonsList,
        mbuBreakdown: mbuList,
        dailyTimeline: dailyTimelineList,
        sampleIncidents: result.records.slice(0, 2000)
      };

      savePeriod(newHistoricalPeriod);
      onPeriodCreated(newHistoricalPeriod);

      soundFX.playSuccess();
      confetti({ particleCount: 70, spread: 65, origin: { y: 0.6 } });
      setStatusMessage({
        type: 'success',
        text: `New Period "${periodName}" Ingested & Stored!`,
        details: `Saved ${allSitesList.length} sites and ${result.totalRows} records as a historical dataset. Switch anytime via the top bar selector.`
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to parse Excel file.';
      setStatusMessage({
        type: 'error',
        text: `Ingestion Failed: ${message}`
      });
    } finally {
      setLoading(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Reliable Universal Excel & CSV Downloader
  const downloadSampleTemplate = () => {
    soundFX.playClick();
    const sampleData = [
      ['Site Code', 'Site', 'MBU#', 'DT', 'Reasons', 'Reason Category', 'Vendor', 'SiteType', 'Priority', 'Date'],
      ['GUJ9515', 'Rahwali GJ4165', 'C4-GUJ-02', '96.00', 'B2S', 'B2S Prolonged Outage', 'Huawei', 'Platinum', 'Platinum', '2026-08-24'],
      ['ALC6522', 'ALC6522__S_NearSaidNagar', 'C4-HFZ-06', '24.48', 'B2S', 'B2S/Exclusion Good Grid', 'Huawei', 'Macro', 'General', '2026-08-24'],
      ['KMK5618', 'KMK5618__S_PakTown', 'C4-GUJ-01', '12.50', 'OMO', 'Power Issue On OMO', 'Huawei', 'Macro', 'Elite', '2026-08-24']
    ];

    try {
      const ws = XLSX.utils.aoa_to_sheet(sampleData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Consolidated RSL');
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Engro_Enfrashare_NAR_Template.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // CSV Fallback
      const csvContent = 'data:text/csv;charset=utf-8,' + sampleData.map(e => e.join(',')).join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', 'Engro_NAR_Template.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Export Active Telemetry for Cloud Repository (To Update All Users Globally)
  const exportTelemetryForCloud = () => {
    soundFX.playClick();
    const active = getActivePeriod();
    const exportPayload = {
      version: '1.0.0',
      syncedAt: new Date().toISOString(),
      summary: {
        totalSites: active.sitesCount,
        totalDowntimeHours: active.totalDtHours,
        avgAvailability: active.avgAvailability
      },
      allSites: active.allSites,
      mbuBreakdown: active.mbuBreakdown,
      topReasons: active.topReasons,
      dailyTimeline: active.dailyTimeline
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'telemetry-data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setStatusMessage({
      type: 'success',
      text: 'telemetry-data.json Exported Successfully!',
      details: 'Commit this file to "Techmastergojo/Engro-Connect-Web" repo. Once committed, all users across Pakistan will automatically receive this updated telemetry over the air!'
    });
  };

  return (
    <div className="tab-content import-content">
      {/* Upload Hero Card */}
      <div className="corp-card upload-hero-card">
        <div className="hero-header-row">
          <div className="hero-icon-box">
            <FileSpreadsheet size={22} className="text-engro-green" />
          </div>
          <div>
            <h3 className="hero-title">Telemetry Data Ingestion & Archiving</h3>
            <p className="hero-sub">Upload daily or monthly sheets without overwriting historical datasets.</p>
          </div>
        </div>
      </div>

      {/* Dataset Label Input */}
      <div className="corp-card period-name-box">
        <label className="period-name-lbl">
          <PlusCircle size={13} className="text-engro-green" />
          <span>New Historical Period / Month Label:</span>
        </label>
        <input
          type="text"
          className="period-name-input"
          value={periodNameInput}
          onChange={(e) => setPeriodNameInput(e.target.value)}
          placeholder="e.g. September 2026 Telemetry, March 2026 Report"
        />
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        className={`corp-card upload-dropzone ${isDragging ? 'is-dragging' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept=".xlsx, .xls, .csv"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFile(e.target.files[0]);
            }
          }}
        />

        <div className="dropzone-center">
          <div className="upload-cloud-circle">
            <UploadCloud size={34} className="text-engro-green" />
          </div>
          <h4>{loading ? 'Processing & Archiving...' : 'Drop Excel / CSV Telemetry Sheet Here'}</h4>
          <span className="dropzone-hint">Tap to browse &bull; Supports .XLSX, .XLS, .CSV</span>
          <button className="select-file-btn" type="button">
            Browse Document
          </button>
        </div>
      </div>

      {/* Ingestion Feedback Banner */}
      {statusMessage && (
        <div className={`corp-card upload-status-card ${statusMessage.type === 'success' ? 'status-pass' : 'status-fail'}`}>
          <div className="status-title-row">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 size={18} className="text-engro-green" />
            ) : (
              <AlertCircle size={18} className="text-coral" />
            )}
            <h4>{statusMessage.text}</h4>
          </div>
          {statusMessage.details && <p className="status-detail-text">{statusMessage.details}</p>}
        </div>
      )}

      {/* Quick Action Tools */}
      <div className="corp-card actions-panel">
        <div className="panel-title-row">
          <Layers size={15} className="text-engro-blue" />
          <h4>Cloud Sync & Global Deployment Tools</h4>
        </div>

        <div className="action-buttons-list">
          {onCloudSync && (
            <button className="corp-action-btn cloud-sync-action" onClick={onCloudSync}>
              <RefreshCw size={15} className={isSyncing ? 'spin-icon text-engro-green' : ''} />
              <div className="btn-text-block">
                <span className="btn-main">Sync Daily Cloud Telemetry</span>
                <span className="btn-sub">Fetch latest updates over the air without updating APK</span>
              </div>
              <ArrowRight size={14} className="arrow-icon" />
            </button>
          )}

          <button className="corp-action-btn" onClick={downloadSampleTemplate}>
            <Download size={15} />
            <div className="btn-text-block">
              <span className="btn-main">Download Excel / CSV Template</span>
              <span className="btn-sub">Includes site GUJ9515 sample row</span>
            </div>
            <ArrowRight size={14} className="arrow-icon" />
          </button>

          <button className="corp-action-btn global-export-btn" onClick={exportTelemetryForCloud}>
            <Share2 size={15} className="text-amber" />
            <div className="btn-text-block">
              <span className="btn-main">Export Telemetry Feed for All Users</span>
              <span className="btn-sub">Generates telemetry-data.json for GitHub cloud push</span>
            </div>
            <ArrowRight size={14} className="arrow-icon" />
          </button>

          {onCheckUpdates && (
            <button className="corp-action-btn" onClick={onCheckUpdates}>
              <RefreshCw size={15} />
              <div className="btn-text-block">
                <span className="btn-main">Check for App Updates</span>
                <span className="btn-sub">GitHub: Techmastergojo/Engro-Connect-Web</span>
              </div>
              <ArrowRight size={14} className="arrow-icon" />
            </button>
          )}
        </div>
      </div>

      {/* Engineer Signature Card */}
      <div className="corp-card signature-banner">
        <div className="sig-content">
          <div className="sig-badge">
            <Sparkles size={13} className="text-amber" />
            <span>PLATFORM ARCHITECT</span>
          </div>
          <h4 className="sig-name">Engro Enfrashare NAR</h4>
          <span className="sig-creator">Powered By <strong>Hamza Tehseen Cheema</strong></span>
        </div>
      </div>
    </div>
  );
};
