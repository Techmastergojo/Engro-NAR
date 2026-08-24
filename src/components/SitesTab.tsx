import React, { useState, useMemo } from 'react';
import type { UserRole, SiteCatalogItem } from '../types';
import { REAL_ENGRO_DATA } from '../utils/realData';
import {
  Search,
  Filter,
  Radio,
  Zap,
  X
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
        <span className="sort-tag">Ranked by Downtime</span>
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

      {/* In-Depth Site Intelligence Modal */}
      {selectedSite && (
        <div className="modal-backdrop" onClick={() => setSelectedSite(null)}>
          <div className="site-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="site-modal-header">
              <div className="modal-site-title">
                <span className="modal-code">{selectedSite.siteCode}</span>
                <h3>{selectedSite.siteName}</h3>
                <span className="modal-mbu-badge">{selectedSite.mbu}</span>
              </div>
              <button className="close-modal-btn" onClick={() => setSelectedSite(null)}>
                <X size={18} />
              </button>
            </div>

            {/* Site Key Metrics */}
            <div className="site-modal-metrics-grid">
              <div className="modal-stat-box">
                <span className="stat-lbl">Availability</span>
                <span className={`stat-val ${selectedSite.availability >= 99.0 ? 'text-engro-green' : 'text-coral'}`}>
                  {selectedSite.availability}%
                </span>
              </div>

              <div className="modal-stat-box">
                <span className="stat-lbl">Total Downtime</span>
                <span className="stat-val text-coral">{selectedSite.totalDtHours} hrs</span>
              </div>

              <div className="modal-stat-box">
                <span className="stat-lbl">Alarms Logged</span>
                <span className="stat-val">{selectedSite.incidentCount}</span>
              </div>
            </div>

            {/* Site Metadata info */}
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
                <span className="spec-lbl">Priority:</span>
                <strong className="spec-val">{selectedSite.priority}</strong>
              </div>
            </div>

            {/* Root Causes breakdown for this site */}
            <div className="site-modal-reasons-section">
              <h4>Top Root Causes For This Site</h4>
              <div className="site-reasons-list">
                {selectedSite.topReasons.map((r, i) => (
                  <div key={r.reason} className="site-reason-item">
                    <span className="r-rank">#{i + 1}</span>
                    <span className="r-name">{r.reason}</span>
                    <span className="r-hrs">{r.hours} hrs</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="site-modal-footer">
              <button className="close-action-btn" onClick={() => setSelectedSite(null)}>
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
