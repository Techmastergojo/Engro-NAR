import React, { useState, useMemo } from 'react';
import type { UserRole, SiteCatalogItem } from '../types';
import { REAL_ENGRO_DATA } from '../utils/realData';
import {
  Search,
  Filter,
  Radio,
  Zap,
  X,
  ShieldCheck,
  Wrench,
  AlertTriangle,
  Sparkles
} from 'lucide-react';

import { soundFX } from '../utils/soundEffects';

interface SitesTabProps {
  currentRole: UserRole;
  initialQuery?: string;
}

export const SitesTab: React.FC<SitesTabProps> = ({ currentRole, initialQuery = '' }) => {
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [selectedMbu, setSelectedMbu] = useState<string>(currentRole === 'admin' ? 'all' : currentRole);
  const [selectedSite, setSelectedSite] = useState<SiteCatalogItem | null>(null);
  const [pageLimit, setPageLimit] = useState<number>(25);

  const mbuList = useMemo(() => {
    const set = new Set(REAL_ENGRO_DATA.allSites.map((s) => s.mbu).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, []);

  // Filtered sites
  const filteredSites = useMemo(() => {
    return REAL_ENGRO_DATA.allSites.filter((s) => {
      const matchesSearch =
        s.siteCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.siteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.vendor.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesMbu = selectedMbu === 'all' || s.mbu === selectedMbu;

      return matchesSearch && matchesMbu;
    });
  }, [searchTerm, selectedMbu]);

  const displayedSites = filteredSites.slice(0, pageLimit);

  // Generate automated recommendation based on site's top reason
  const getSiteRecommendation = (site: SiteCatalogItem): string => {
    const topReason = site.topReasons[0]?.reason || 'Power';
    if (topReason.toLowerCase().includes('b2s') || topReason.toLowerCase().includes('grid')) {
      return 'Inspect CP changeover switch and calibrate automatic phase reversal relay with local utility.';
    }
    if (topReason.toLowerCase().includes('omo')) {
      return 'Coordinate with host OMO operator to verify power feeder SLA and battery bank float voltage.';
    }
    if (topReason.toLowerCase().includes('fuel') || topReason.toLowerCase().includes('refueling')) {
      return 'Schedule urgent diesel replenishment and inspect DG fuel sensor threshold calibration.';
    }
    if (topReason.toLowerCase().includes('dg') || topReason.toLowerCase().includes('generator')) {
      return 'Dispatch field generator technician for alternator overhaul and battery starter swap.';
    }
    if (topReason.toLowerCase().includes('battery') || topReason.toLowerCase().includes('bb')) {
      return 'Perform deep discharge test on lithium/lead-acid battery banks; replace degraded strings.';
    }
    return 'Conduct comprehensive site infrastructure and optical backhaul diagnostic audit.';
  };

  return (
    <div className="tab-content sites-content">
      {/* Search & Filter Header */}
      <div className="corp-card search-card">
        <div className="search-input-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="styled-search-field"
            placeholder="Search any site code (e.g. RUR6564, ALC6522) or name..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPageLimit(25);
            }}
          />
          {searchTerm && (
            <button className="clear-btn" onClick={() => setSearchTerm('')}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* MBU Filter Pills */}
        <div className="mbu-pills-row">
          <Filter size={13} className="filter-icon" />
          {mbuList.map((m) => (
            <button
              key={m}
              className={`filter-pill-btn ${selectedMbu === m ? 'active' : ''}`}
              onClick={() => {
                soundFX.playClick();
                setSelectedMbu(m);
                setPageLimit(25);
              }}
            >
              {m === 'all' ? 'All C4 MBUs' : m}
            </button>
          ))}
        </div>
      </div>

      {/* Results Meta Info */}
      <div className="search-meta-bar">
        <span>
          Showing <strong>{displayedSites.length}</strong> of {filteredSites.length} Towers
        </span>
        <span className="sort-tag">Ranked by Outage Hours</span>
      </div>

      {/* Sites List */}
      <div className="sites-catalog-list">
        {displayedSites.length === 0 ? (
          <div className="corp-card empty-search-card">
            <Radio size={32} className="text-muted" />
            <h4>No Sites Found</h4>
            <p>No telecom sites match your search keyword or MBU filter.</p>
          </div>
        ) : (
          displayedSites.map((site) => {
            const isGood = site.availability >= 99.0;
            return (
              <div
                key={site.siteCode}
                className="corp-card site-card-row"
                onClick={() => {
                  soundFX.playClick();
                  setSelectedSite(site);
                }}
              >
                <div className="site-row-left">
                  <div className="site-code-badge-row">
                    <span className="site-code-badge">{site.siteCode}</span>
                    <span className="site-mbu-tag">{site.mbu}</span>
                    <span className="site-type-tag">{site.siteType}</span>
                  </div>
                  <div className="site-name-text-row">{site.siteName}</div>
                  <div className="site-lead-cause">
                    <Zap size={11} className="text-amber" />
                    <span>
                      {site.topReasons[0]
                        ? `${site.topReasons[0].reason} (${site.topReasons[0].hours}h)`
                        : 'Power Issue'}
                    </span>
                  </div>
                </div>

                <div className="site-row-right">
                  <span className="site-dt-text">{site.totalDtHours.toLocaleString()}h</span>
                  <span className={`site-avail-badge ${isGood ? 'avail-good' : 'avail-low'}`}>
                    {site.availability}%
                  </span>
                  <span className="alarms-count">{site.incidentCount} alarms</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Load More Pagination */}
      {displayedSites.length < filteredSites.length && (
        <button
          className="load-more-btn"
          onClick={() => {
            soundFX.playClick();
            setPageLimit((prev) => prev + 25);
          }}
        >
          Load Next 25 Sites ({filteredSites.length - displayedSites.length} remaining)
        </button>
      )}

      {/* In-Depth Site Intelligence Diagnostic Modal */}
      {selectedSite && (
        <div className="modal-backdrop" onClick={() => setSelectedSite(null)}>
          <div className="site-detail-modal" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="site-modal-header">
              <div className="modal-site-title">
                <div className="modal-code-row">
                  <span className="modal-code">{selectedSite.siteCode}</span>
                  <span className="modal-mbu-badge">{selectedSite.mbu}</span>
                  <span className="modal-prio-badge">{selectedSite.priority}</span>
                </div>
                <h3>{selectedSite.siteName}</h3>
              </div>
              <button className="close-modal-btn" onClick={() => setSelectedSite(null)}>
                <X size={18} />
              </button>
            </div>

            {/* SLA Score & Status Card */}
            <div className="site-sla-highlight-card">
              <div className="sla-score-left">
                <span className="sla-micro-lbl">SITE AVAILABILITY (SLA)</span>
                <span className={`sla-large-score ${selectedSite.availability >= 99.0 ? 'text-engro-green' : 'text-coral'}`}>
                  {selectedSite.availability}%
                </span>
              </div>
              <div className="sla-grade-right">
                {selectedSite.availability >= 99.0 ? (
                  <div className="grade-pill grade-pass">
                    <ShieldCheck size={14} />
                    <span>SLA Benchmark Met</span>
                  </div>
                ) : (
                  <div className="grade-pill grade-fail">
                    <AlertTriangle size={14} />
                    <span>Critical Outage Risk</span>
                  </div>
                )}
              </div>
            </div>

            {/* Site Telemetry Stats Grid */}
            <div className="site-modal-metrics-grid">
              <div className="modal-stat-box">
                <span className="stat-lbl">Cumulative Downtime</span>
                <span className="stat-val text-coral">{selectedSite.totalDtHours.toLocaleString()}h</span>
              </div>

              <div className="modal-stat-box">
                <span className="stat-lbl">Alarms Logged</span>
                <span className="stat-val">{selectedSite.incidentCount}</span>
              </div>

              <div className="modal-stat-box">
                <span className="stat-lbl">Avg Alarm Duration</span>
                <span className="stat-val">
                  {selectedSite.incidentCount > 0
                    ? (selectedSite.totalDtHours / selectedSite.incidentCount).toFixed(1)
                    : 0}h
                </span>
              </div>
            </div>

            {/* Technical Specifications */}
            <div className="site-spec-box">
              <div className="spec-item">
                <span className="spec-lbl">Vendor:</span>
                <strong className="spec-val">{selectedSite.vendor}</strong>
              </div>
              <div className="spec-item">
                <span className="spec-lbl">Type:</span>
                <strong className="spec-val">{selectedSite.siteType}</strong>
              </div>
              <div className="spec-item">
                <span className="spec-lbl">MBU:</span>
                <strong className="spec-val">{selectedSite.mbu}</strong>
              </div>
            </div>

            {/* Top Root Causes for this Site with percentage share */}
            <div className="site-modal-reasons-section">
              <div className="section-title-row">
                <Zap size={14} className="text-amber" />
                <h4>Root Cause Breakdown & Share</h4>
              </div>
              <div className="site-reasons-list">
                {selectedSite.topReasons.map((r, i) => {
                  const share = ((r.hours / Math.max(1, selectedSite.totalDtHours)) * 100).toFixed(0);
                  return (
                    <div key={r.reason} className="site-reason-item">
                      <span className="r-rank">#{i + 1}</span>
                      <div className="r-info">
                        <span className="r-name">{r.reason}</span>
                        <div className="r-bar-track">
                          <div className="r-bar-fill" style={{ width: `${Math.min(100, parseInt(share, 10))}%` }} />
                        </div>
                      </div>
                      <div className="r-stats-col">
                        <span className="r-hrs">{r.hours}h</span>
                        <span className="r-share">{share}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actionable Engineering Recommendation */}
            <div className="site-recom-card">
              <div className="recom-header">
                <Wrench size={14} className="text-engro-green" />
                <span>Recommended Engineering Action:</span>
              </div>
              <p className="recom-text">{getSiteRecommendation(selectedSite)}</p>
            </div>

            {/* Signature Badge */}
            <div className="engineer-signature-badge">
              <Sparkles size={12} className="text-amber" />
              <span>Telemetry Engine &bull; Powered By <strong>Hamza Tehseen Cheema</strong></span>
            </div>

            <div className="site-modal-footer">
              <button className="close-action-btn" onClick={() => setSelectedSite(null)}>
                Close Diagnostic Card
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
