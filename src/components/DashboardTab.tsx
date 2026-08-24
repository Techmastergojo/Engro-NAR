import React, { useState, useMemo } from 'react';
import type { UserRole, SiteCatalogItem, HistoricalPeriod, GlobalTimelineFilter } from '../types';
import { MBU_NAMES } from '../utils/realData';
import { GLOBAL_6_MONTH_NAR } from '../utils/periodStore';
import {
  Activity,
  Radio,
  Clock,
  ShieldCheck,
  ChevronRight,
  TrendingDown,
  Building2,
  Calendar,
  Zap,
  SlidersHorizontal,
  TrendingUp
} from 'lucide-react';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { soundFX } from '../utils/soundEffects';

interface DashboardTabProps {
  currentRole: UserRole;
  activePeriod: HistoricalPeriod;
  timelineFilter: GlobalTimelineFilter;
  onOpenTimelineModal: () => void;
  onNavigateToSites: (searchQuery?: string) => void;
  onNavigateToGraphs: () => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  currentRole,
  activePeriod,
  timelineFilter,
  onOpenTimelineModal,
  onNavigateToSites,
  onNavigateToGraphs
}) => {
  const isAdmin = currentRole === 'admin';

  // State for NAR view mode: '6months' | 'selectedMonth' | 'daily'
  const [narViewMode, setNarViewMode] = useState<'6months' | 'selectedMonth'>('6months');
  const [selectedNarMonth, setSelectedNarMonth] = useState<string>('2026-08');
  const [selectedNarDay, setSelectedNarDay] = useState<string>('all');

  // Filter sites according to role
  const roleScopedSites: SiteCatalogItem[] = useMemo(() => {
    if (isAdmin) {
      return activePeriod.allSites;
    }
    return activePeriod.allSites.filter((s) => s.mbu === currentRole);
  }, [currentRole, isAdmin, activePeriod]);

  // Recalculate site downtime strictly within the selected From-To timeline
  const timelineScopedSites = useMemo(() => {
    return roleScopedSites.map((site) => {
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
        filteredDaysCount: filteredDays.length
      };
    });
  }, [roleScopedSites, timelineFilter]);

  // Aggregate stats across timeline-scoped sites
  const totalDt = timelineScopedSites.reduce((sum, s) => sum + s.totalDtHours, 0);
  const totalIncidents = timelineScopedSites.reduce((sum, s) => sum + s.incidentCount, 0);


  // Selected Month's NAR Record
  const activeMonthNarRecord = useMemo(() => {
    return GLOBAL_6_MONTH_NAR.find(m => m.monthKey === selectedNarMonth) || GLOBAL_6_MONTH_NAR[5];
  }, [selectedNarMonth]);

  // Daily NAR data for the selected month
  const dailyNarList = useMemo(() => {
    return activePeriod.dailyTimeline.map(d => {
      const dayNum = parseInt(d.date.split('-')[2] || '1', 10);
      return {
        date: d.date,
        dayLabel: `Day ${dayNum} (Aug ${dayNum})`,
        shortDay: `D${dayNum}`,
        narPercent: d.narPercent || 99.85,
        totalDtHours: d.totalDtHours
      };
    });
  }, [activePeriod]);

  // Selected single day's NAR
  const activeDayNar = useMemo(() => {
    if (selectedNarDay === 'all') return null;
    return dailyNarList.find(d => d.date === selectedNarDay) || null;
  }, [selectedNarDay, dailyNarList]);

  // Worst 5 sites
  const worstSites = useMemo(() => {
    return [...timelineScopedSites].sort((a, b) => b.totalDtHours - a.totalDtHours).slice(0, 5);
  }, [timelineScopedSites]);

  const timelineLabel = timelineFilter.mode === 'single'
    ? `Single Day: ${timelineFilter.singleDate}`
    : timelineFilter.mode === 'all'
    ? `Full Month (Aug 1 - Aug 20)`
    : `From ${timelineFilter.startDate} To ${timelineFilter.endDate}`;

  return (
    <div className="tab-content dashboard-content">
      {/* Workspace / Cluster Greeting Card */}
      <div className="corp-card scope-banner">
        <div className="scope-title-row">
          <div className="scope-icon-box">
            {isAdmin ? <Building2 size={20} /> : <Radio size={20} />}
          </div>
          <div>
            <h3 className="scope-name">{MBU_NAMES[currentRole] || currentRole}</h3>
            <span className="scope-sub">{activePeriod.name} &bull; Network Availability Telemetry</span>
          </div>
        </div>
      </div>

      {/* Prominent Advanced Timeline Filter Bar */}
      <div className="corp-card timeline-control-bar" onClick={onOpenTimelineModal}>
        <div className="timeline-control-left">
          <div className="timeline-icon-box">
            <Calendar size={18} className="text-engro-green" />
          </div>
          <div className="timeline-text-group">
            <div className="timeline-micro-tag">
              <span>ACTIVE TIMELINE FILTER</span>
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

      {/* =======================================================================
          FEATURE: 6-MONTH & MONTH/DAY NAR TELEMETRY EXPLORER
          ======================================================================= */}
      <div className="corp-card nar-telemetry-hero-card">
        <div className="nar-hero-top-row">
          <div className="nar-badge-group">
            <TrendingUp size={16} className="text-engro-green" />
            <span className="nar-hero-title">NETWORK AVAILABILITY RATE (NAR)</span>
          </div>

          <div className="nar-mode-pills">
            <button
              className={`nar-mode-btn ${narViewMode === '6months' ? 'active' : ''}`}
              onClick={() => {
                soundFX.playClick();
                setNarViewMode('6months');
              }}
            >
              6 Months Trend
            </button>
            <button
              className={`nar-mode-btn ${narViewMode === 'selectedMonth' ? 'active' : ''}`}
              onClick={() => {
                soundFX.playClick();
                setNarViewMode('selectedMonth');
              }}
            >
              Month & Days
            </button>
          </div>
        </div>

        {/* 6-MONTH NAR VIEW (DEFAULT) */}
        {narViewMode === '6months' ? (
          <div className="nar-6months-container">
            <div className="nar-score-header-row">
              <div>
                <span className="nar-sub-caption">6-MONTH AVERAGE NAR</span>
                <div className="nar-large-score">
                  99.84<span className="nar-pct">%</span>
                </div>
              </div>
              <div className="nar-target-pill">
                <ShieldCheck size={14} />
                <span>Target SLA: 99.90%</span>
              </div>
            </div>

            {/* 6-Month NAR Trajectory Chart */}
            <div className="chart-wrapper" style={{ width: '100%', height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={GLOBAL_6_MONTH_NAR} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="narGreenGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00A859" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#00A859" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="monthLabel" stroke="#64748B" fontSize={9.5} tickLine={false} />
                  <YAxis domain={[99.7, 100]} stroke="#64748B" fontSize={9.5} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#00A859',
                      borderRadius: '6px',
                      color: '#F8FAFC',
                      fontSize: '11px'
                    }}
                    formatter={(val) => [`${val}% NAR`, 'Availability']}
                  />
                  <ReferenceLine y={99.90} stroke="#F7941D" strokeDasharray="3 3" label={{ value: 'Target 99.90%', fill: '#F7941D', fontSize: 9 }} />
                  <Area
                    type="monotone"
                    dataKey="narPercent"
                    stroke="#00A859"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#narGreenGrad)"
                    name="NAR %"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* 6-Month Cards Row */}
            <div className="nar-month-cards-row">
              {GLOBAL_6_MONTH_NAR.map((m) => (
                <div
                  key={m.monthKey}
                  className={`nar-mini-card ${selectedNarMonth === m.monthKey ? 'active' : ''}`}
                  onClick={() => {
                    soundFX.playClick();
                    setSelectedNarMonth(m.monthKey);
                    setNarViewMode('selectedMonth');
                  }}
                >
                  <span className="m-label">{m.monthLabel}</span>
                  <strong className="m-val">{m.narPercent}%</strong>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* MONTH & EVERYDAY NAR VIEW */
          <div className="nar-month-days-container">
            {/* Month & Day Dropdown Selectors */}
            <div className="nar-dropdowns-row">
              <div className="nar-drop-group">
                <label>Select Month:</label>
                <select
                  className="nar-styled-select"
                  value={selectedNarMonth}
                  onChange={(e) => {
                    soundFX.playClick();
                    setSelectedNarMonth(e.target.value);
                    setSelectedNarDay('all');
                  }}
                >
                  {GLOBAL_6_MONTH_NAR.map(m => (
                    <option key={m.monthKey} value={m.monthKey}>
                      {m.monthLabel} (NAR: {m.narPercent}%)
                    </option>
                  ))}
                </select>
              </div>

              <div className="nar-drop-group">
                <label>Select Day of Month:</label>
                <select
                  className="nar-styled-select"
                  value={selectedNarDay}
                  onChange={(e) => {
                    soundFX.playClick();
                    setSelectedNarDay(e.target.value);
                  }}
                >
                  <option value="all">Every Day Overview (Full Month)</option>
                  {dailyNarList.map(d => (
                    <option key={d.date} value={d.date}>
                      {d.dayLabel} ➔ {d.narPercent}% NAR
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Display Active Month / Day NAR Metric */}
            <div className="active-nar-display-card">
              <div className="nar-main-metric">
                <span className="nar-scope-tag">
                  {activeDayNar ? `NAR FOR ${activeDayNar.dayLabel.toUpperCase()}` : `${activeMonthNarRecord.monthLabel.toUpperCase()} OVERALL NAR`}
                </span>
                <div className="nar-highlight-num">
                  {activeDayNar ? activeDayNar.narPercent : activeMonthNarRecord.narPercent}
                  <span className="pct-symbol">%</span>
                </div>
              </div>

              <div className="nar-sub-facts">
                <div className="fact-item">
                  <span className="f-lbl">Downtime</span>
                  <span className="f-val text-coral">{activeDayNar ? `${activeDayNar.totalDtHours}h` : `${activeMonthNarRecord.totalDowntimeHours}h`}</span>
                </div>
                <div className="fact-item">
                  <span className="f-lbl">Target Delta</span>
                  <span className="f-val text-engro-green">
                    {((activeDayNar ? activeDayNar.narPercent : activeMonthNarRecord.narPercent) - 99.90).toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Daily NAR Breakdown Grid / Chart */}
            <div className="daily-nar-grid-title">Everyday NAR Breakdown ({activeMonthNarRecord.monthLabel}):</div>
            <div className="daily-nar-scroll-row">
              {dailyNarList.map(d => {
                const isSelected = selectedNarDay === d.date;
                const isPass = d.narPercent >= 99.85;
                return (
                  <div
                    key={d.date}
                    className={`daily-nar-card ${isSelected ? 'selected' : ''} ${isPass ? 'pass' : 'warn'}`}
                    onClick={() => {
                      soundFX.playClick();
                      setSelectedNarDay(isSelected ? 'all' : d.date);
                    }}
                  >
                    <span className="d-name">{d.shortDay}</span>
                    <strong className="d-rate">{d.narPercent}%</strong>
                    <span className="d-dt">{d.totalDtHours}h DT</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* KPI Grid */}
      <div className="corp-kpi-grid">
        <div className="corp-card kpi-item">
          <div className="kpi-icon blue">
            <Activity size={16} />
          </div>
          <div className="kpi-text-block">
            <span className="kpi-lbl">Total Outage Events</span>
            <span className="kpi-val">{totalIncidents.toLocaleString()}</span>
          </div>
        </div>

        <div className="corp-card kpi-item">
          <div className="kpi-icon amber">
            <Clock size={16} />
          </div>
          <div className="kpi-text-block">
            <span className="kpi-lbl">Total Downtime in Scope</span>
            <span className="kpi-val">{totalDt.toLocaleString()} hrs</span>
          </div>
        </div>
      </div>

      {/* MBU Benchmarking Comparison */}
      {isAdmin && (
        <div className="corp-card benchmark-card">
          <div className="card-header-row">
            <div className="header-title-group">
              <Building2 size={16} className="text-engro-green" />
              <h4>C4 Cluster Benchmarking</h4>
            </div>
            <button
              className="view-graphs-link"
              onClick={() => {
                soundFX.playClick();
                onNavigateToGraphs();
              }}
            >
              <span>View NAR Graphs</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="mbu-benchmark-table">
            {activePeriod.mbuBreakdown.map((m) => (
              <div key={m.mbu} className="mbu-bench-row">
                <div className="mbu-name-block">
                  <span className="mbu-tag">{m.mbu}</span>
                  <span className="mbu-sub-sites">{m.siteCount} Towers</span>
                </div>
                <div className="mbu-stats-block">
                  <span className="mbu-dt-val">{m.totalDtHours.toLocaleString()} hrs</span>
                  <span className={`mbu-avail-val ${m.avgAvailability >= 99.0 ? 'good' : 'low'}`}>
                    {m.avgAvailability}% NAR
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top 5 Problematic Sites */}
      <div className="corp-card leaderboard-card">
        <div className="card-header-row">
          <div className="header-title-group">
            <TrendingDown size={16} className="text-coral" />
            <h4>Top 5 Outage Sites in Scope</h4>
          </div>
          <button
            className="view-graphs-link"
            onClick={() => {
              soundFX.playClick();
              onNavigateToSites();
            }}
          >
            <span>Search All {timelineScopedSites.length} Sites</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="worst-sites-list">
          {worstSites.map((site, index) => (
            <div
              key={site.siteCode}
              className="worst-site-item"
              onClick={() => {
                soundFX.playClick();
                onNavigateToSites(site.siteCode);
              }}
            >
              <div className="site-rank-badge">#{index + 1}</div>
              <div className="site-info-col">
                <div className="site-code-row">
                  <strong className="code-text">{site.siteCode}</strong>
                  <span className="mbu-pill-sm">{site.mbu}</span>
                  <span className="type-pill-sm">{site.siteType}</span>
                </div>
                <span className="site-name-text">{site.siteName}</span>
                <div className="top-cause-text">
                  <Zap size={11} />
                  <span>
                    {site.topReasons[0]
                      ? `${site.topReasons[0].reason} (${site.topReasons[0].hours}h)`
                      : 'Grid Outage'}
                  </span>
                </div>
              </div>
              <div className="site-dt-col">
                <span className="dt-hours-bold">{site.totalDtHours.toLocaleString()}h</span>
                <span className="incidents-sub">{site.availability}% NAR</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
