import React, { useState, useRef } from 'react';
import { OutageRecord } from '../types';
import { parseExcelFile } from '../utils/excelParser';
import { INITIAL_SAMPLE_RECORDS, ALTERNATE_STORM_DATASET } from '../utils/sampleData';
import {
  UploadCloud,
  FileCheck2,
  FileSpreadsheet,
  AlertCircle,
  Sparkles,
  Download,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import confetti from 'canvas-confetti';
import { soundFX } from '../utils/soundEffects';

interface ImportTabProps {
  onDataLoaded: (records: OutageRecord[], sourceTitle: string) => void;
  currentRecordsCount: number;
}

export const ImportTab: React.FC<ImportTabProps> = ({
  onDataLoaded,
  currentRecordsCount
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [previewData, setPreviewData] = useState<OutageRecord[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setStatusMessage({
        type: 'error',
        text: 'Please upload a valid Excel spreadsheet (.xlsx, .xls) or CSV file.'
      });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    try {
      const result = await parseExcelFile(file);
      setPreviewData(result.records);
      onDataLoaded(result.records, file.name);
      soundFX.playSuccess();
      confetti({ particleCount: 60, spread: 60 });
      setStatusMessage({
        type: 'success',
        text: `Successfully ingested ${result.totalRows} telecom sites from "${file.name}"!`
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to parse Excel file.';
      setStatusMessage({
        type: 'error',
        text: `Error reading file: ${message}`
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

  const loadPreset = (dataset: OutageRecord[], title: string) => {
    soundFX.playSuccess();
    onDataLoaded(dataset, title);
    setPreviewData(dataset);
    setStatusMessage({
      type: 'success',
      text: `Loaded ${title} (${dataset.length} nodes).`
    });
  };

  const downloadSampleTemplate = () => {
    soundFX.playClick();
    const sampleRows = [
      {
        'Site ID': 'ENGRO-101',
        'Site Name': 'Karachi Clifton Tower',
        'Region': 'South Region',
        'Downtime Hours': 3.5,
        'Availability %': 99.1,
        'Category': 'Commercial Grid Outage',
        'Root Cause': 'Transformer feeder breakdown',
        'Status': 'Resolved',
        'Date': '2026-08-24'
      },
      {
        'Site ID': 'ENGRO-102',
        'Site Name': 'Lahore Mall Road Hub',
        'Region': 'Central Region',
        'Downtime Hours': 0.8,
        'Availability %': 99.8,
        'Category': 'Fiber Cut',
        'Root Cause': 'Optical cable slice during trenching',
        'Status': 'Resolved',
        'Date': '2026-08-24'
      },
      {
        'Site ID': 'ENGRO-103',
        'Site Name': 'Islamabad F-7 Sector Mast',
        'Region': 'North Region',
        'Downtime Hours': 7.2,
        'Availability %': 98.4,
        'Category': 'Genset Fuel Exhaustion',
        'Root Cause': 'Fuel replenishment delay',
        'Status': 'Active',
        'Date': '2026-08-24'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'NAR_Template');
    XLSX.writeFile(wb, 'Engro_NAR_Template.xlsx');
  };

  return (
    <div className="tab-content import-tab">
      {/* Header Info */}
      <div className="import-hero-card glass-panel">
        <div className="import-hero-title">
          <FileSpreadsheet className="text-emerald" size={22} />
          <h3>Excel Ingestion & Telemetry Pipeline</h3>
        </div>
        <p className="import-hero-desc">
          Upload any Excel sheet (.xlsx, .xls, .csv). Our smart fuzzy engine auto-detects column names for downtime, site ID, availability, and causes.
        </p>
      </div>

      {/* Drag and Drop Zone */}
      <div
        className={`dropzone-card glass-panel ${isDragging ? 'dragging' : ''}`}
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

        <div className="dropzone-inner">
          <div className="dropzone-icon-pulse">
            <UploadCloud size={38} className="text-cyan" />
          </div>
          <h4>{loading ? 'Processing Telemetry Sheet...' : 'Tap or Drag & Drop Excel File'}</h4>
          <span className="dropzone-sub">Supports .XLSX, .XLS, .CSV format</span>
          <button className="browse-files-btn" type="button">
            Select Spreadsheet
          </button>
        </div>
      </div>

      {/* Status Feedback Notification */}
      {statusMessage && (
        <div className={`status-notification glass-panel ${statusMessage.type === 'success' ? 'notif-success' : 'notif-error'}`}>
          {statusMessage.type === 'success' ? (
            <CheckCircle2 size={18} className="text-emerald" />
          ) : (
            <AlertCircle size={18} className="text-coral" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Template & Preset Datasets Card */}
      <div className="presets-card glass-panel">
        <div className="presets-header">
          <Sparkles size={16} className="text-amber" />
          <h4>Instant Telecom Presets & Template</h4>
        </div>

        <div className="preset-buttons-row">
          <button
            className="preset-btn"
            onClick={() => loadPreset(INITIAL_SAMPLE_RECORDS, 'Standard 10-Tower Grid')}
          >
            <RefreshCw size={14} />
            <span>Load 10-Site Grid</span>
          </button>

          <button
            className="preset-btn preset-storm"
            onClick={() => loadPreset(ALTERNATE_STORM_DATASET, 'Monsoon Flood Scenario')}
          >
            <AlertCircle size={14} />
            <span>Load Storm Scenario</span>
          </button>

          <button className="preset-btn preset-download" onClick={downloadSampleTemplate}>
            <Download size={14} />
            <span>Download Excel Template</span>
          </button>
        </div>
      </div>

      {/* Currently Ingested Records Preview Table */}
      {previewData && previewData.length > 0 && (
        <div className="preview-table-card glass-panel">
          <div className="preview-header">
            <FileCheck2 size={16} className="text-cyan" />
            <h4>Ingested Data Preview ({previewData.length} records)</h4>
          </div>

          <div className="preview-table-scroll">
            <table className="mini-data-table">
              <thead>
                <tr>
                  <th>Site Name</th>
                  <th>Region</th>
                  <th>Downtime</th>
                  <th>Avail %</th>
                  <th>Category</th>
                </tr>
              </thead>
              <tbody>
                {previewData.slice(0, 5).map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.siteName}</strong>
                      <div className="sub-id">{row.siteId}</div>
                    </td>
                    <td>{row.region}</td>
                    <td>{row.downtimeHours}h</td>
                    <td className={row.availability < 99.0 ? 'text-coral' : 'text-emerald'}>
                      {row.availability}%
                    </td>
                    <td>{row.category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
