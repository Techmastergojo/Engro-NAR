import React, { useState, useMemo } from 'react';
import { OutageRecord } from '../types';
import { Search, Filter, AlertCircle, CheckCircle2, Clock, MapPin, Wrench } from 'lucide-react';
import { soundFX } from '../utils/soundEffects';

interface OutagesTabProps {
  records: OutageRecord[];
  onToggleStatus: (id: string) => void;
}

export const OutagesTab: React.FC<OutagesTabProps> = ({
  records,
  onToggleStatus
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Extract unique regions
  const regions = useMemo(() => {
    const set = new Set(records.map((r) => r.region));
    return ['all', ...Array.from(set)];
  }, [records]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesSearch =
        r.siteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.siteId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.rootCause && r.rootCause.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesRegion = selectedRegion === 'all' || r.region === selectedRegion;
      const matchesStatus = selectedStatus === 'all' || r.status === selectedStatus;

      return matchesSearch && matchesRegion && matchesStatus;
    });
  }, [records, searchTerm, selectedRegion, selectedStatus]);

  return (
    <div className="tab-content outages-tab">
      {/* Search and Filter Box */}
      <div className="search-filter-card glass-panel">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search site, node ID, category, or cause..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="clear-search-btn" onClick={() => setSearchTerm('')}>
              ×
            </button>
          )}
        </div>

        {/* Region Pills Filter */}
        <div className="filter-pills-row">
          <Filter size={14} className="filter-icon" />
          {regions.map((region) => (
            <button
              key={region}
              className={`filter-pill ${selectedRegion === region ? 'active' : ''}`}
              onClick={() => {
                soundFX.playClick();
                setSelectedRegion(region);
              }}
            >
              {region === 'all' ? 'All Regions' : region}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="filter-status-row">
          {['all', 'Active', 'Investigating', 'Resolved'].map((st) => (
            <button
              key={st}
              className={`status-btn-filter ${selectedStatus === st ? 'active' : ''}`}
              onClick={() => {
                soundFX.playClick();
                setSelectedStatus(st);
              }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Counter summary */}
      <div className="list-meta-header">
        <span>
          Showing <strong>{filteredRecords.length}</strong> of {records.length} Monitored Incidents
        </span>
        <span className="sort-hint">Sorted by Downtime</span>
      </div>

      {/* Outage Items List */}
      <div className="outage-cards-list">
        {filteredRecords.length === 0 ? (
          <div className="empty-outage-state glass-panel">
            <CheckCircle2 size={36} className="text-emerald" />
            <h4>No Outages Match Your Filter</h4>
            <p>All monitored telecom sites in this view are operational.</p>
          </div>
        ) : (
          filteredRecords.map((r) => {
            const isResolved = r.status === 'Resolved';
            const isCritical = r.availability < 99.0;

            return (
              <div
                key={r.id}
                className={`outage-item-card glass-panel ${
                  !isResolved ? (isCritical ? 'border-coral glow-coral-subtle' : 'border-amber') : 'border-dim'
                }`}
              >
                <div className="outage-card-header">
                  <div className="site-identity">
                    <span className="site-badge-id">{r.siteId}</span>
                    <h4 className="site-title">{r.siteName}</h4>
                  </div>
                  <div className={`badge-status ${r.status.toLowerCase()}`}>
                    {!isResolved ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}
                    <span>{r.status}</span>
                  </div>
                </div>

                <div className="outage-card-meta">
                  <div className="meta-col">
                    <MapPin size={13} className="meta-icon" />
                    <span>{r.region}</span>
                  </div>
                  <div className="meta-col">
                    <Clock size={13} className="meta-icon" />
                    <span>{r.downtimeHours}h Outage</span>
                  </div>
                  <div className="meta-col">
                    <span className={`avail-tag ${isCritical ? 'tag-crit' : 'tag-norm'}`}>
                      {r.availability}% Avail
                    </span>
                  </div>
                </div>

                {r.rootCause && (
                  <div className="outage-root-cause">
                    <Wrench size={13} className="cause-icon" />
                    <span className="cause-text">
                      <strong>{r.category}:</strong> {r.rootCause}
                    </span>
                  </div>
                )}

                <div className="outage-card-footer">
                  <span className="timestamp-label">Logged: {r.timestamp}</span>
                  <button
                    className={`toggle-resolve-btn ${isResolved ? 'btn-reactivate' : 'btn-resolve'}`}
                    onClick={() => {
                      soundFX.playClick();
                      onToggleStatus(r.id);
                    }}
                  >
                    {isResolved ? 'Mark Active' : 'Resolve Incident'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
