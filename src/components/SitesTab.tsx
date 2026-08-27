import React, { useState, useMemo } from 'react';
import type { UserRole, SiteCatalogItem, HistoricalPeriod, GlobalTimelineFilter } from '../types';
import { Search, Filter, Radio, Zap, X, Wrench } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

interface SitesTabProps {
  currentRole: UserRole;
  activePeriod: HistoricalPeriod;
  timelineFilter: GlobalTimelineFilter;
  initialQuery?: string;
}

export const SitesTab: React.FC<SitesTabProps> = ({
  currentRole,
  activePeriod,
  timelineFilter,
  initialQuery = ''
}) => {
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [selectedMbu, setSelectedMbu] = useState<string>(currentRole === 'admin' ? 'all' : currentRole);
  const [selectedSite, setSelectedSite] = useState<SiteCatalogItem | null>(null);
  const [pageLimit, setPageLimit] = useState<number>(25);

  const [activeModalPreset, setActiveModalPreset] = useState<number | '6m' | null>(null);

  const maxDateStr = useMemo(() => {
    const dates = activePeriod.dailyTimeline.map(d => d.date).sort();
    return dates.length > 0 ? dates[dates.length - 1] : '2026-08-24';
  }, [activePeriod.dailyTimeline]);

  // Modal Timeline State (Local to site detail view)
  const [modalTimelineMode, setModalTimelineMode] = useState<'daily' | 'six_months'>('daily');
  const [modalFromDate, setModalFromDate] = useState<string>(timelineFilter.startDate);
  const [modalToDate, setModalToDate] = useState<string>(timelineFilter.endDate);

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
        return d.date >= timelineFilter.startDate && d.date <= timelineFilter.endDate;
      });

      const rangeDtHours = filteredDays.reduce((sum, d) => sum + d.hours, 0);
      const sumNar = filteredDays.reduce((sum, d) => sum + (d.narPercent ?? 100), 0);
      const rangeNar = Number((sumNar / Math.max(1, filteredDays.length)).toFixed(2));

      return {
        ...site,
        totalDtHours: Number(rangeDtHours.toFixed(1)),
        availability: rangeNar
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

  // Site Modal Stats based on local modal date range / mode
  const modalSiteStats = useMemo(() => {
    if (!selectedSite) return null;

    if (modalTimelineMode === 'six_months') {
      const totalDt = selectedSite.nar6Months?.reduce((sum, m) => sum + m.totalDowntimeHours, 0) || 0;
      const avgNar = selectedSite.nar6Months && selectedSite.nar6Months.length > 0
        ? Number((selectedSite.nar6Months.reduce((sum, m) => sum + m.narPercent, 0) / selectedSite.nar6Months.length).toFixed(2))
        : selectedSite.availability;
      
      const chartData = selectedSite.nar6Months?.map((m) => ({
        label: m.monthLabel.split(' ')[0],
        narPercent: m.narPercent,
        downtimeHours: m.totalDowntimeHours
      })) || [];

      return {
        avgNar,
        totalDtHours: Number(totalDt.toFixed(1)),
        chartData
      };
    } else {
      const filteredDays = selectedSite.dailyTimeline?.filter((d) => {
        return d.date >= modalFromDate && d.date <= modalToDate;
      }) || [];

      const totalDt = filteredDays.reduce((sum, d) => sum + d.hours, 0);
      const sumNar = filteredDays.reduce((sum, d) => sum + (d.narPercent ?? 100), 0);
      const avgNar = Number((sumNar / Math.max(1, filteredDays.length)).toFixed(2));

      const chartData = filteredDays.map((d) => {
        const dayNum = parseInt(d.date.split('-')[2] || '1', 10);
        return {
          label: `Aug ${dayNum}`,
          narPercent: d.narPercent ?? 100,
          downtimeHours: Number(d.hours.toFixed(1))
        };
      });

      return {
        avgNar,
        totalDtHours: Number(totalDt.toFixed(1)),
        chartData
      };
    }
  }, [selectedSite, modalTimelineMode, modalFromDate, modalToDate]);

  const handleApplyModalPreset = (days: number | '6m') => {
    setActiveModalPreset(days);
    if (days === '6m') {
      setModalTimelineMode('six_months');
    } else {
      setModalTimelineMode('daily');
      const localToday = new Date();
      const pad = (num: number) => String(num).padStart(2, '0');
      const todayStr = `${localToday.getFullYear()}-${pad(localToday.getMonth() + 1)}-${pad(localToday.getDate())}`;

      // Cap end date at dataset max date
      const endStr = todayStr > maxDateStr ? maxDateStr : todayStr;
      
      const end = new Date(endStr);
      const start = new Date(end);
      start.setDate(end.getDate() - (days - 1));
      
      let startStr = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
      if (startStr < '2026-08-01') {
        startStr = '2026-08-01';
      }

      setModalFromDate(startStr);
      setModalToDate(endStr);
    }
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

  const timelineLabel = timelineFilter.mode === 'six_months'
    ? '6 Months (Mar - Aug 2026)'
    : `Range: ${timelineFilter.startDate} to ${timelineFilter.endDate}`;

  return (
    <div className="tab-content sites-content">
      {/* Search & Filter Header */}
      <div className="corp-card search-card">
        <div className="search-input-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="styled-search-field"
            placeholder="Search site code or name..."
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
                setSelectedMbu(m);
                setPageLimit(25);
              }}
            >
              {m === 'all' ? 'All C4' : m}
            </button>
          ))}
        </div>
      </div>

      {/* Results Meta Info */}
      <div className="search-meta-bar">
        <span>
          Showing <strong>{displayedSites.length}</strong> of {filteredSites.length} Towers ({timelineLabel})
        </span>
      </div>

      {/* Sites List */}
      <div className="sites-catalog-list">
        {displayedSites.length === 0 ? (
          <div className="corp-card empty-search-card">
            <Radio size={32} className="text-muted" />
            <h4>No Sites Found</h4>
            <p>No telecom sites match your search.</p>
          </div>
        ) : (
          displayedSites.map((site) => {
            const isGood = site.availability >= 99.90;
            return (
              <div
                key={site.siteCode}
                className="corp-card site-card-row cursor-pointer"
                onClick={() => {
                  setSelectedSite(site);
                  setModalTimelineMode('daily');
                  setModalFromDate(timelineFilter.startDate);
                  setModalToDate(timelineFilter.endDate);
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
                  <span className="site-dt-text text-coral">{site.totalDtHours}h DT</span>
                  <span className={`site-avail-badge ${isGood ? 'avail-good' : 'avail-low'}`}>
                    {site.availability}% NAR
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {displayedSites.length < filteredSites.length && (
        <button
          className="load-more-btn"
          onClick={() => setPageLimit((prev) => prev + 25)}
        >
          Load Next 25 Sites ({filteredSites.length - displayedSites.length} remaining)
        </button>
      )}

      {/* In-Depth Site Diagnostic Modal */}
      {selectedSite && modalSiteStats && (
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

            {/* Same timeline control features inside Modal */}
            <div className="corp-card modal-timeline-panel">
              <span className="panel-lbl">Site Search Timeline:</span>
              <div className="timeline-search-row">
                <div className="timeline-input-group">
                  <label className="timeline-input-label">From</label>
                  <input
                    type="date"
                    className="styled-date-input"
                    value={modalTimelineMode === 'six_months' ? '2026-08-01' : modalFromDate}
                    disabled={modalTimelineMode === 'six_months'}
                    onChange={(e) => {
                      setModalTimelineMode('daily');
                      setActiveModalPreset(null);
                      setModalFromDate(e.target.value);
                    }}
                  />
                </div>
                <div className="timeline-input-group">
                  <label className="timeline-input-label">To</label>
                  <input
                    type="date"
                    className="styled-date-input"
                    value={modalTimelineMode === 'six_months' ? maxDateStr : modalToDate}
                    disabled={modalTimelineMode === 'six_months'}
                    onChange={(e) => {
                      setModalTimelineMode('daily');
                      setActiveModalPreset(null);
                      setModalToDate(e.target.value);
                    }}
                  />
                </div>
              </div>

              {/* Premade Range Presets for Modal */}
              <div className="timeline-presets-row">
                <button
                  className={`preset-btn ${modalTimelineMode !== 'six_months' && activeModalPreset === 3 ? 'active' : ''}`}
                  onClick={() => handleApplyModalPreset(3)}
                >
                  3 Days
                </button>
                <button
                  className={`preset-btn ${modalTimelineMode !== 'six_months' && activeModalPreset === 7 ? 'active' : ''}`}
                  onClick={() => handleApplyModalPreset(7)}
                >
                  7 Days
                </button>
                <button
                  className={`preset-btn ${modalTimelineMode !== 'six_months' && activeModalPreset === 15 ? 'active' : ''}`}
                  onClick={() => handleApplyModalPreset(15)}
                >
                  15 Days
                </button>
                <button
                  className={`preset-btn ${modalTimelineMode !== 'six_months' && activeModalPreset === 30 ? 'active' : ''}`}
                  onClick={() => handleApplyModalPreset(30)}
                >
                  1 Month
                </button>
                <button
                  className={`preset-btn ${modalTimelineMode === 'six_months' ? 'active' : ''}`}
                  onClick={() => handleApplyModalPreset('6m')}
                >
                  6 Months
                </button>
              </div>
            </div>

            {/* Calculated Stats & Info */}
            <div className="site-sla-highlight-card">
              <div className="sla-score-left">
                <span className="sla-micro-lbl">
                  {modalTimelineMode === 'six_months' ? '6-MONTH AVG NAR' : 'RANGE AVG NAR'}
                </span>
                <span className={`sla-large-score ${modalSiteStats.avgNar >= 99.90 ? 'text-green' : 'text-coral'}`}>
                  {modalSiteStats.avgNar}%
                </span>
              </div>
              <div className="sla-grade-right">
                <div className="sla-dt-summary">
                  <strong>{modalSiteStats.totalDtHours}h</strong>
                  <span>Downtime Hours</span>
                </div>
              </div>
            </div>

            {/* Sleek Recharts Graph specifically for the site */}
            <div className="modal-chart-card">
              <div className="chart-header">
                <span>NAR Availability Trend</span>
              </div>
              <div className="chart-wrapper" style={{ width: '100%', height: 130 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart key={`${modalTimelineMode}-${modalSiteStats.chartData.length}`} data={modalSiteStats.chartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="siteEmerald" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" stroke="#71717a" fontSize={8.5} tickLine={false} />
                    <YAxis domain={[90, 100]} stroke="#71717a" fontSize={8.5} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#18181b',
                        borderColor: '#27272a',
                        borderRadius: '4px',
                        color: '#fafafa',
                        fontSize: '10px'
                      }}
                      formatter={(val) => [`${val}% NAR`, 'Site Availability']}
                    />
                    <ReferenceLine y={99.90} stroke="#f97316" strokeDasharray="3 3" />
                    <Area
                      type="monotone"
                      dataKey="narPercent"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#siteEmerald)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
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

            {/* Root Causes breakdown (Site Reasons) */}
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

