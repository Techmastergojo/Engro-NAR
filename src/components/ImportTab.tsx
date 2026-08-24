import React, { useState, useRef } from 'react';
import type { OutageRecord } from '../types';
import { parseExcelFile } from '../utils/excelParser';
import {
  UploadCloud,
  FileSpreadsheet,
  AlertCircle,
  Sparkles,
  Download,
  CheckCircle2,
  RefreshCw,
  Layers,
  ArrowRight
} from 'lucide-react';

import * as XLSX from 'xlsx';
import confetti from 'canvas-confetti';
import { soundFX } from '../utils/soundEffects';

interface ImportTabProps {
  onDataLoaded: (records: OutageRecord[], sourceTitle: string) => void;
  onCheckUpdates?: () => void;
}

export const ImportTab: React.FC<ImportTabProps> = ({
  onDataLoaded,
  onCheckUpdates
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
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
      onDataLoaded(result.records, file.name);
      soundFX.playSuccess();
      confetti({ particleCount: 70, spread: 65, origin: { y: 0.6 } });
      setStatusMessage({
        type: 'success',
        text: `Data Ingestion Complete: ${result.totalRows.toLocaleString()} Records Overridden!`,
        details: `Loaded "${file.name}" (Sheet: ${result.sheetName}). All dashboard KPIs, graphs, and site intelligence cards are now updated with this data.`
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

  const downloadSampleTemplate = () => {
    soundFX.playClick();
    const sampleRows = [
      {
        'Site Code': 'ALC6522',
        'Site': 'ALC6522__S_NearSaidNagar',
        'MBU#': 'C4-HFZ-06',
        'DT': 24.48,
        'Reasons': 'B2S',
        'Reason Category': 'B2S/Exclusion- Good Grid Site , CP Prolonged Outage',
        'Vendor': 'Huawei',
        'SiteType': 'Macro',
        'Priority': 'General',
        'Date': '2026-08-24'
      },
      {
        'Site Code': 'KMK5618',
        'Site': 'KMK5618__S_PakTown',
        'MBU#': 'C4-GUJ-01',
        'DT': 12.50,
        'Reasons': 'OMO',
        'Reason Category': 'Power Issue On OMO',
        'Vendor': 'Huawei',
        'SiteType': 'Macro',
        'Priority': 'Elite',
        'Date': '2026-08-24'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Consolidated RSL');
    XLSX.writeFile(wb, 'Engro_NAR_Telemetry_Template.xlsx');
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
            <h3 className="hero-title">Telemetry Data Ingestion Portal</h3>
            <p className="hero-sub">Upload any new C4 report to immediately override active telemetry metrics.</p>
          </div>
        </div>
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
          <h4>{loading ? 'Processing Spreadsheet...' : 'Drop Excel / CSV Telemetry Sheet Here'}</h4>
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
          <h4>Data Management Tools</h4>
        </div>

        <div className="action-buttons-list">
          <button className="corp-action-btn" onClick={downloadSampleTemplate}>
            <Download size={15} />
            <div className="btn-text-block">
              <span className="btn-main">Download Excel Template</span>
              <span className="btn-sub">C4 Consolidated RSL format</span>
            </div>
            <ArrowRight size={14} className="arrow-icon" />
          </button>

          {onCheckUpdates && (
            <button className="corp-action-btn update-btn" onClick={onCheckUpdates}>
              <RefreshCw size={15} />
              <div className="btn-text-block">
                <span className="btn-main">Check for App Updates</span>
                <span className="btn-sub">Sync with Engro-Connect-Web repo</span>
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
            <span>AUTHOR & ARCHITECT</span>
          </div>
          <h4 className="sig-name">Engro NAR Platform</h4>
          <span className="sig-creator">Powered By <strong>Hamza Tehseen Cheema</strong></span>
        </div>
      </div>
    </div>
  );
};
