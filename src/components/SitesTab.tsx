import React, { useState, useMemo } from 'react';
import type { UserRole, SiteCatalogItem, HistoricalPeriod, GlobalTimelineFilter } from '../types';
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
  Calendar,
  SlidersHorizontal,
  Clock
} from 'lucide-react';
import { soundFX } from '../utils/soundEffects';

interface SitesTabProps {
  currentRole: UserRole;
  activePeriod: HistoricalPeriod;
  timelineFilter: GlobalTimelineFilter;
  onOpenTimelineModal: () => void;
  initialQuery?: string;
}

export const SitesTab: React.FC<SitesTabProps> = ({
  currentRole,
  activePeriod,
  timelineFilter,
  onOpenTimelineModal,
  initialQuery = ''
}) => {
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [selectedMbu, setSelectedMbu] = useState<string>(currentRole === 'admin' ? 'all' : currentRole);
  const [selectedSite, setSelectedSite] = useState<SiteCatalogItem | null>(null);
  const [pageLimit, setPageLimit] = useState<number>(25);

  // Site-specific internal Date Range Filter modal
  const [siteModalFromDate, setSiteModalFromDate] = useState<string>(timelineFilter.startDate);
  const [siteModalToDate, setSiteModalToDate] = useState<string>(timelineFilter.endDate);
  const [siteModalSingleDay, setSiteModalSingleDay] = useState<string | null>(
    timelineFilter.mode === 'single' ? timelineFilter.singleDate || null : null
  );

  const mbuList = useMemo(() => {
    const set = new Set(activePeriod.allSites.map((s) => s.mbu).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [activePeriod]);

  // Recalculate site stats based on the global timeline filter
  const timelineAdjustedSites = useMemo(() => {
    return activePeriod.allSites.map((site) => {
      if (!site.dailyTimeline || site.dailyTimeline.length === 0) {
        return site;
      }

      const filteredDays = site.dailyTimeline.filter((d) => {
        if (timelineFilter.mode === 'single' && timelineFilter.singleDate) {
          return d.date === timelineFilter.singleDate;
        }
        return d.date >= timelineFilter.startDate && d.date <= timelineFilter.endDate;
      });

      const rangeDtHours = filteredDays.reduce((sum, d) => sum + d.hours, 0);
      const totalPossibleHours = Math.max(1, filteredDays.length) * 24;
      const rangeAvail = Math.max(70, Number(((totalPossibleHours - rangeDtHours) / totalPossibleHours * 100).toFixed(2)));

      return {
        ...site,
        totalDtHours: Number(rangeDtHours.toFixed(1)),
        availability: rangeAvail,
        rangeDaysCount: filteredDays.length
      };
    });
  }, [activePeriod, timelineFilter]);

  // Filter sites by search and MBU
  const filteredSites = useMemo(() => {
    return timelineAdjustedSites.filter((s) => {
      const matchesSearch =
        s.siteCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.siteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.vendor.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesMbu = selectedMbu === 'all' || s.mbu === selectedMbu;

      return matchesSearch && matchesMbu;
    });
  }, [searchTerm, selectedMbu, timelineAdjustedSites]);

  const displayedSites = filteredSites.slice(0, pageLimit);

  // Compute stats for the diagnostic modal for custom chosen dates
  const getModalSiteStats = (site: SiteCatalogItem) => {
    if (!site.dailyTimeline || site.dailyTimeline.length === 0) {
      return {
        downtimeHours: site.totalDtHours,
        daysCount: 20,
        availability: site.availability,
        dailyBars: []
      };
    }

    const filteredDays = site.dailyTimeline.filter((d) => {
      if (siteModalSingleDay) {
        return d.date === siteModalSingleDay;
      }
      return d.date >= siteModalFromDate && d.date <= siteModalToDate;
    });

    const rangeDt = filteredDays.reduce((sum, d) => sum + d.hours, 0);
    const rangeDays = siteModalSingleDay ? 1 : Math.max(1, filteredDays.length);
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

  const timelineLabel = timelineFilter.mode === 'single'
    ? `Single Day: ${timelineFilter.singleDate}`
    : timelineFilter.mode === 'all'
    ? `Full Month (Aug 1 - Aug 20)`
    : `From ${timelineFilter.startDate} To ${timelineFilter.endDate}`;

  return (
    <div className="tab-content sites-content">
      {/* Prominent Timeline Filter Bar */}
      <div className="corp-card timeline-control-bar" onClick={onOpenTimelineModal}>
        <div className="timeline-control-left">
          <div className="timeline-icon-box">
            <Calendar size={18} className="text-engro-green" />
          </div>
          <div className="timeline-text-group">
            <div className="timeline-micro-tag">
              <span>TIMELINE SCOPE:</span>
              <span className="timeline-status-active">APPLIED</span>
            </div>
            <strong className="timeline-range-text">{timelineLabel}</strong>
          </div>
        </div>

        <button className="open-timeline-modal-btn">
          <SlidersHorizontal size={14} />
          <span>Change Dates</span>
        </button>
      </div>

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
          Showing <strong>{displayedSites.length}</strong> of {filteredSites.length} Towers ({timelineLabel})
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
                  setSiteModalFromDate(timelineFilter.startDate);
                  setSiteModalToDate(timelineFilter.endDate);
                  setSiteModalSingleDay(timelineFilter.mode === 'single' ? timelineFilter.singleDate || null : null);
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
                  
                  <span className="site-timeline-indicator">
                    <Calendar size={10} />
                    <span>{timelineLabel}</span>
                  </span>
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

      {/* In-Depth Site Intelligence Diagnostic Modal with From-To Date Filters inside */}
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

            {/* In-Modal From-To Date Range Controls */}
            <div className="site-modal-date-picker-bar">
              <div className="modal-date-row">
                <div className="modal-date-box">
                  <label className="modal-date-lbl">
                    <Clock size={11} className="text-engro-green" />
                    <span>FROM:</span>
                  </label>
                  <input
                    type="date"
                    className="modal-date-input"
                    value={siteModalSingleDay || siteModalFromDate}
                    disabled={siteModalSingleDay !== null}
                    onChange={(e) => {
                      setSiteModalFromDate(e.target.value);
                      setSiteModalSingleDay(null);
                    }}
                  />
                </div>

                <div className="modal-date-arrow">➔</div>

                <div className="modal-date-box">
                  <label className="modal-date-lbl">
                    <Clock size={11} className="text-engro-green" />
                    <span>TO:</span>
                  </label>
                  <input
                    type="date"
                    className="modal-date-input"
                    value={siteModalSingleDay || siteModalToDate}
                    disabled={siteModalSingleDay !== null}
                    onChange={(e) => {
                      setSiteModalToDate(e.target.value);
                      setSiteModalSingleDay(null);
                    }}
                  />
                </div>
              </div>

              {/* Single Day Buttons inside site modal */}
              <div className="site-modal-days-scroll">
                <button
                  className={`modal-day-pill ${siteModalSingleDay === null ? 'active' : ''}`}
                  onClick={() => setSiteModalSingleDay(null)}
                >
                  Date Range
                </button>
                {selectedSite.dailyTimeline?.map((d) => {
                  const dayNum = parseInt(d.date.split('-')[2] || '1', 10);
                  const isSelected = siteModalSingleDay === d.date;
                  return (
                    <button
                      key={d.date}
                      className={`modal-day-pill ${isSelected ? 'active' : ''}`}
                      onClick={() => {
                        soundFX.playClick();
                        setSiteModalSingleDay(d.date);
                      }}
                    >
                      Day {dayNum} ({d.hours}h)
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Computed Diagnostic Stats for chosen date range */}
            {(() => {
              const modalStats = getModalSiteStats(selectedSite);
              const isPassing = modalStats.availability >= 99.0;
              return (
                <>
                  {/* SLA Score & Status Card */}
                  <div className="site-sla-highlight-card">
                    <div className="sla-score-left">
                      <span className="sla-micro-lbl">AVAILABILITY IN TIMELINE</span>
                      <span className={`sla-large-score ${isPassing ? 'text-engro-green' : 'text-coral'}`}>
                        {modalStats.availability}%
                      </span>
                    </div>
                    <div className="sla-grade-right">
                      {isPassing ? (
                        <div className="grade-pill grade-pass">
                          <ShieldCheck size={14} />
                          <span>SLA Met in Range</span>
                        </div>
                      ) : (
                        <div className="grade-pill grade-fail">
                          <AlertTriangle size={14} />
                          <span>Outage in Range</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Site Telemetry Stats Grid */}
                  <div className="site-modal-metrics-grid">
                    <div className="modal-stat-box">
                      <span className="stat-lbl">Downtime in Range</span>
                      <span className="stat-val text-coral">{modalStats.downtimeHours} hrs</span>
                    </div>

                    <div className="modal-stat-box">
                      <span className="stat-lbl">Reporting Days</span>
                      <span className="stat-val">{modalStats.daysCount} Days</span>
                    </div>

                    <div className="modal-stat-box">
                      <span className="stat-lbl">Alarms Logged</span>
                      <span className="stat-val">{selectedSite.incidentCount}</span>
                    </div>
                  </div>

                  {/* Daily Outage Bars for this site */}
                  {modalStats.dailyBars.length > 0 && (
                    <div className="site-daily-breakdown-section">
                      <span className="breakdown-title">Day-by-Day Outage Hours:</span>
                      <div className="site-bars-list">
                        {modalStats.dailyBars.map((b) => {
                          const dayNum = parseInt(b.date.split('-')[2] || '1', 10);
                          const barWidth = Math.min(100, Math.max(8, (b.hours / 24) * 100));
                          return (
                            <div key={b.date} className="site-bar-row">
                              <span className="s-day">Aug {dayNum}</span>
                              <div className="s-track">
                                <div
                                  className={`s-fill ${b.hours > 8 ? 'crit' : 'warn'}`}
                                  style={{ width: `${barWidth}%` }}
                                />
                              </div>
                              <span className="s-hrs">{b.hours}h</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

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

            {/* Top Root Causes for this Site */}
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
