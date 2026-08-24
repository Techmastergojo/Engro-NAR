import React, { useState, useMemo } from 'react';
import type { UserRole, SiteCatalogItem, HistoricalPeriod } from '../types';
import {
  Search,
  Filter,
  Radio,
  Zap,
  X,
  ShieldCheck,
  Wrench,
  AlertTriangle,
  Sparkles,
  Calendar
} from 'lucide-react';

import { soundFX } from '../utils/soundEffects';

interface SitesTabProps {
  currentRole: UserRole;
  activePeriod: HistoricalPeriod;
  initialQuery?: string;
}

export const SitesTab: React.FC<SitesTabProps> = ({
  currentRole,
  activePeriod,
  initialQuery = ''
}) => {
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [selectedMbu, setSelectedMbu] = useState<string>(currentRole === 'admin' ? 'all' : currentRole);
  const [selectedSite, setSelectedSite] = useState<SiteCatalogItem | null>(null);
  const [pageLimit, setPageLimit] = useState<number>(25);

  // Site-level Date Range Filter state
  const [timelineModalSite, setTimelineModalSite] = useState<SiteCatalogItem | null>(null);
  const [filterStartDate, setFilterStartDate] = useState<string>('2026-08-01');
  const [filterEndDate, setFilterEndDate] = useState<string>('2026-08-20');
  const [selectedSingleDay, setSelectedSingleDay] = useState<string | null>(null);

  const mbuList = useMemo(() => {
    const set = new Set(activePeriod.allSites.map((s) => s.mbu).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [activePeriod]);

  // Filtered sites from active period
  const filteredSites = useMemo(() => {
    return activePeriod.allSites.filter((s) => {
      const matchesSearch =
        s.siteCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.siteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.vendor.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesMbu = selectedMbu === 'all' || s.mbu === selectedMbu;

      return matchesSearch && matchesMbu;
    });
  }, [searchTerm, selectedMbu, activePeriod]);

  const displayedSites = filteredSites.slice(0, pageLimit);

  // Calculate filtered stats for a site within selected date range
  const getSiteFilteredStats = (site: SiteCatalogItem) => {
    if (!site.dailyTimeline || site.dailyTimeline.length === 0) {
      return {
        downtimeHours: site.totalDtHours,
        daysCount: 20,
        availability: site.availability,
        dailyBars: []
      };
    }

    const filteredDays = site.dailyTimeline.filter((d) => {
      if (selectedSingleDay) {
        return d.date === selectedSingleDay;
      }
      return d.date >= filterStartDate && d.date <= filterEndDate;
    });

    const rangeDt = filteredDays.reduce((sum, d) => sum + d.hours, 0);
    const rangeDays = selectedSingleDay ? 1 : Math.max(1, filteredDays.length);
    const totalPossibleHours = rangeDays * 24;
    const rangeAvail = Math.max(70, Number(((totalPossibleHours - rangeDt) / totalPossibleHours * 100).toFixed(2)));

    return {
      downtimeHours: Number(rangeDt.toFixed(1)),
      daysCount: rangeDays,
      availability: rangeAvail,
      dailyBars: filteredDays
    };
  };

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
          Showing <strong>{displayedSites.length}</strong> of {filteredSites.length} Towers ({activePeriod.name})
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
              <div key={site.siteCode} className="corp-card site-card-row">
                <div
                  className="site-row-left"
                  onClick={() => {
                    soundFX.playClick();
                    setSelectedSite(site);
                  }}
                >
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
                  
                  {/* Dedicated Timeline & Date Filter Button */}
                  <button
                    className="site-timeline-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      soundFX.playClick();
                      setTimelineModalSite(site);
                      setSelectedSingleDay(null);
                    }}
                    title="Filter Outages by Custom Dates / Days"
                  >
                    <Calendar size={11} />
                    <span>Date Filter</span>
                  </button>
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

      {/* Site-Level Date Range & Timeline Filter Modal */}
      {timelineModalSite && (
        <div className="modal-backdrop" onClick={() => setTimelineModalSite(null)}>
          <div className="site-timeline-modal" onClick={(e) => e.stopPropagation()}>
            <div className="site-modal-header">
              <div className="modal-site-title">
                <div className="modal-code-row">
                  <span className="modal-code">{timelineModalSite.siteCode}</span>
                  <span className="modal-mbu-badge">{timelineModalSite.mbu}</span>
                </div>
                <h3>{timelineModalSite.siteName}</h3>
                <span className="timeline-modal-hint">Custom Timeline & Daily Outage Filter</span>
              </div>
              <button className="close-modal-btn" onClick={() => setTimelineModalSite(null)}>
                <X size={18} />
              </button>
            </div>

            {/* Date Pickers */}
            <div className="date-range-picker-row">
              <div className="date-input-group">
                <label>From Date:</label>
                <input
                  type="date"
                  className="corp-date-input"
                  value={filterStartDate}
                  onChange={(e) => {
                    setFilterStartDate(e.target.value);
                    setSelectedSingleDay(null);
                  }}
                />
              </div>

              <div className="date-input-group">
                <label>To Date:</label>
                <input
                  type="date"
                  className="corp-date-input"
                  value={filterEndDate}
                  onChange={(e) => {
                    setFilterEndDate(e.target.value);
                    setSelectedSingleDay(null);
                  }}
                />
              </div>
            </div>

            {/* Quick Day-by-Day Selector Buttons */}
            <div className="quick-days-selector-bar">
              <span className="quick-days-lbl">Or Select Single Day:</span>
              <div className="quick-days-scroll">
                <button
                  className={`day-pill ${selectedSingleDay === null ? 'active' : ''}`}
                  onClick={() => setSelectedSingleDay(null)}
                >
                  Date Range
                </button>
                {timelineModalSite.dailyTimeline?.map((d) => {
                  const dayNum = parseInt(d.date.split('-')[2] || '1', 10);
                  const isDaySelected = selectedSingleDay === d.date;
                  return (
                    <button
                      key={d.date}
                      className={`day-pill ${isDaySelected ? 'active' : ''} ${d.hours > 5 ? 'day-heavy' : ''}`}
                      onClick={() => {
                        soundFX.playClick();
                        setSelectedSingleDay(d.date);
                      }}
                    >
                      Day {dayNum} ({d.hours}h)
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filtered Range Result Card */}
            {(() => {
              const filteredStats = getSiteFilteredStats(timelineModalSite);
              return (
                <div className="filtered-range-card">
                  <div className="range-score-row">
                    <div>
                      <span className="range-sub-lbl">
                        {selectedSingleDay ? `Downtime on ${selectedSingleDay}` : `Downtime (${filterStartDate} to ${filterEndDate})`}
                      </span>
                      <div className="range-dt-large">{filteredStats.downtimeHours} hrs Down</div>
                    </div>
                    <div className="range-avail-badge">
                      <span>{filteredStats.availability}% Avail</span>
                    </div>
                  </div>

                  {/* Daily Outage Bar Breakdown */}
                  <div className="daily-bars-container">
                    <span className="daily-bars-title">Daily Outage Breakdown:</span>
                    <div className="daily-bars-list">
                      {filteredStats.dailyBars.map((b) => {
                        const dayNum = parseInt(b.date.split('-')[2] || '1', 10);
                        const barWidth = Math.min(100, Math.max(8, (b.hours / 24) * 100));
                        return (
                          <div key={b.date} className="daily-bar-row">
                            <span className="bar-day-lbl">Aug {dayNum}</span>
                            <div className="bar-track">
                              <div
                                className={`bar-fill ${b.hours > 8 ? 'bar-crit' : 'bar-warn'}`}
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                            <span className="bar-hr-val">{b.hours}h</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="site-modal-footer">
              <button className="close-action-btn" onClick={() => setTimelineModalSite(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-Depth Site Intelligence Diagnostic Modal */}
      {selectedSite && (
        <div className="modal-backdrop" onClick={() => setSelectedSite(null)}>
          <div className="site-detail-modal" onClick={(e) => e.stopPropagation()}>
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
