import React, { useState, useMemo } from 'react';
import type { UserRole, SiteCatalogItem, HistoricalPeriod, GlobalTimelineFilter } from '../types';
import { MBU_NAMES } from '../utils/realData';
import { ArrowDown, ArrowUp, Building2, Radio } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

interface DashboardTabProps {
  currentRole: UserRole;
  activePeriod: HistoricalPeriod;
  timelineFilter: GlobalTimelineFilter;
  setTimelineFilter: React.Dispatch<React.SetStateAction<GlobalTimelineFilter>>;
  onNavigateToSites: (searchQuery?: string) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  currentRole,
  activePeriod,
  timelineFilter,
  setTimelineFilter,
  onNavigateToSites
}) => {
  const isAdmin = currentRole === 'admin';

  // State for MBU leaderboards dropdown (default: if admin, 'C4-GUJ-01', else lock to currentRole)
  const [selectedMbuLeaderboard, setSelectedMbuLeaderboard] = useState<string>(
    isAdmin ? 'C4-GUJ-01' : currentRole
  );

  // Toggle states for Worst vs Best
  const [overallSortMode, setOverallSortMode] = useState<'worst' | 'best'>('worst');
  const [mbuSortMode, setMbuSortMode] = useState<'worst' | 'best'>('worst');

  // Available MBUs for Leaderboard dropdown
  const mbuList = useMemo(() => {
    return ['C4-GUJ-01', 'C4-GUJ-02', 'C4-SKT-03', 'C4-GRT-04', 'C4-NRW-05', 'C4-HFZ-06', 'C4-WZD-07', 'C4-MBD-08'];
  }, []);

  // Filter sites scoped by role
  const roleScopedSites = useMemo(() => {
    if (isAdmin) {
      return activePeriod.allSites;
    }
    return activePeriod.allSites.filter((s) => s.mbu === currentRole);
  }, [currentRole, isAdmin, activePeriod]);

  // Recalculate site stats based on date range
  const calculateTimelineSites = (sites: SiteCatalogItem[]) => {
    return sites.map((site) => {
      if (!site.dailyTimeline || site.dailyTimeline.length === 0) {
        return { ...site, totalDtHours: 0, availability: 100 };
      }

      // Filter days based on current range
      const filteredDays = site.dailyTimeline.filter((d) => {
        return d.date >= timelineFilter.startDate && d.date <= timelineFilter.endDate;
      });

      const totalDt = filteredDays.reduce((sum, d) => sum + d.hours, 0);
      const totalHours = Math.max(1, filteredDays.length) * 24;
      const avail = Math.max(0, Number(((totalHours - totalDt) / totalHours * 100).toFixed(2)));

      return {
        ...site,
        totalDtHours: Number(totalDt.toFixed(1)),
        availability: avail
      };
    });
  };

  // Recalculated sites for leaderboards
  const recalculatedAllSites = useMemo(() => {
    return calculateTimelineSites(activePeriod.allSites);
  }, [activePeriod.allSites, timelineFilter]);

  const recalculatedScopedSites = useMemo(() => {
    return calculateTimelineSites(roleScopedSites);
  }, [roleScopedSites, timelineFilter]);

  // Scoped MBU overall stats calculation
  const totalDtInScope = recalculatedScopedSites.reduce((sum, s) => sum + s.totalDtHours, 0);
  const averageNarOfMbu = useMemo(() => {
    if (timelineFilter.mode === 'six_months') {
      let sumNar = 0;
      let count = 0;
      roleScopedSites.forEach(site => {
        const avg = site.nar6Months?.reduce((sum, m) => sum + m.narPercent, 0) || 0;
        sumNar += site.nar6Months && site.nar6Months.length > 0 ? avg / site.nar6Months.length : site.availability;
        count++;
      });
      return count > 0 ? Number((sumNar / count).toFixed(2)) : 99.84;
    } else {
      if (recalculatedScopedSites.length === 0) return 100;
      const sumAvail = recalculatedScopedSites.reduce((sum, s) => sum + s.availability, 0);
      return Number((sumAvail / recalculatedScopedSites.length).toFixed(2));
    }
  }, [timelineFilter.mode, recalculatedScopedSites, roleScopedSites]);

  // Handler for presets
  const handleApplyPreset = (days: number | '6m') => {
    if (days === '6m') {
      setTimelineFilter({
        mode: 'six_months',
        startDate: '2026-08-01', // backup
        endDate: '2026-08-20'
      });
    } else {
      const end = new Date('2026-08-20');
      const start = new Date(end);
      start.setDate(end.getDate() - (days - 1));
      
      const pad = (num: number) => String(num).padStart(2, '0');
      const startStr = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
      const endStr = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`;

      setTimelineFilter({
        mode: 'custom',
        startDate: startStr,
        endDate: endStr
      });
    }
  };

  // Daily Trend calculation for chart
  const dailyChartData = useMemo(() => {
    const dates = activePeriod.dailyTimeline
      .map((d) => d.date)
      .filter((date) => date >= timelineFilter.startDate && date <= timelineFilter.endDate)
      .sort();

    return dates.map((date) => {
      let totalDt = 0;
      let siteCount = 0;
      roleScopedSites.forEach((site) => {
        const day = site.dailyTimeline?.find((d) => d.date === date);
        if (day) {
          totalDt += day.hours;
          siteCount++;
        }
      });
      const possibleHours = Math.max(1, siteCount) * 24;
      const nar = Number(((possibleHours - totalDt) / possibleHours * 100).toFixed(2));
      const dayNum = parseInt(date.split('-')[2] || '1', 10);
      return {
        date,
        dayLabel: `Aug ${dayNum}`,
        narPercent: Math.max(0, Math.min(100, nar)),
        downtimeHours: Number(totalDt.toFixed(1))
      };
    });
  }, [roleScopedSites, timelineFilter, activePeriod]);

  // 6-Month Trend calculation for chart
  const sixMonthChartData = useMemo(() => {
    const months = ['2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08'];
    const monthLabels = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];

    return months.map((mKey, idx) => {
      let sumNar = 0;
      let count = 0;
      roleScopedSites.forEach((site) => {
        const mRec = site.nar6Months?.find((m) => m.monthKey === mKey);
        if (mRec) {
          sumNar += mRec.narPercent;
          count++;
        }
      });
      const avgNar = count > 0 ? Number((sumNar / count).toFixed(2)) : 99.8;
      return {
        monthKey: mKey,
        monthLabel: monthLabels[idx],
        narPercent: avgNar
      };
    });
  }, [roleScopedSites]);

  // Overall Leaderboards
  const sortedOverallSites = useMemo(() => {
    const sorted = [...recalculatedAllSites];
    if (overallSortMode === 'worst') {
      return sorted.sort((a, b) => a.availability - b.availability).slice(0, 20);
    } else {
      return sorted.sort((a, b) => b.availability - a.availability).slice(0, 20);
    }
  }, [recalculatedAllSites, overallSortMode]);

  // MBU Specific Leaderboards
  const sortedMbuSites = useMemo(() => {
    const mbuSites = recalculatedAllSites.filter((s) => s.mbu === selectedMbuLeaderboard);
    if (mbuSortMode === 'worst') {
      return mbuSites.sort((a, b) => a.availability - b.availability).slice(0, 20);
    } else {
      return mbuSites.sort((a, b) => b.availability - a.availability).slice(0, 20);
    }
  }, [recalculatedAllSites, selectedMbuLeaderboard, mbuSortMode]);

  const activeChartData = timelineFilter.mode === 'six_months' ? sixMonthChartData : dailyChartData;

  return (
    <div className="tab-content dashboard-content">
      {/* 1. Sleek Timeline Control Panel */}
      <div className="corp-card timeline-control-bar">
        <div className="timeline-search-row">
          <div className="timeline-input-group">
            <label className="timeline-input-label">From</label>
            <input
              type="date"
              className="styled-date-input"
              value={timelineFilter.mode === 'six_months' ? '2026-08-01' : timelineFilter.startDate}
              disabled={timelineFilter.mode === 'six_months'}
              onChange={(e) =>
                setTimelineFilter({
                  ...timelineFilter,
                  mode: 'custom',
                  startDate: e.target.value
                })
              }
            />
          </div>
          <div className="timeline-input-group">
            <label className="timeline-input-label">To</label>
            <input
              type="date"
              className="styled-date-input"
              value={timelineFilter.mode === 'six_months' ? '2026-08-20' : timelineFilter.endDate}
              disabled={timelineFilter.mode === 'six_months'}
              onChange={(e) =>
                setTimelineFilter({
                  ...timelineFilter,
                  mode: 'custom',
                  endDate: e.target.value
                })
              }
            />
          </div>
        </div>

        {/* Premade Range Presets */}
        <div className="timeline-presets-row">
          <button
            className={`preset-btn ${timelineFilter.mode !== 'six_months' && timelineFilter.startDate === '2026-08-18' ? 'active' : ''}`}
            onClick={() => handleApplyPreset(3)}
          >
            3 Days
          </button>
          <button
            className={`preset-btn ${timelineFilter.mode !== 'six_months' && timelineFilter.startDate === '2026-08-14' ? 'active' : ''}`}
            onClick={() => handleApplyPreset(7)}
          >
            7 Days
          </button>
          <button
            className={`preset-btn ${timelineFilter.mode !== 'six_months' && timelineFilter.startDate === '2026-08-06' ? 'active' : ''}`}
            onClick={() => handleApplyPreset(15)}
          >
            15 Days
          </button>
          <button
            className={`preset-btn ${timelineFilter.mode !== 'six_months' && timelineFilter.startDate === '2026-08-01' ? 'active' : ''}`}
            onClick={() => handleApplyPreset(20)}
          >
            1 Month
          </button>
          <button
            className={`preset-btn ${timelineFilter.mode === 'six_months' ? 'active' : ''}`}
            onClick={() => handleApplyPreset('6m')}
          >
            6 Months
          </button>
        </div>
      </div>

      {/* 2. Total Average NAR Metric Card */}
      <div className="corp-card nar-metric-hero">
        <div className="hero-top">
          <div className="hero-scope">
            {isAdmin ? <Building2 size={16} /> : <Radio size={16} />}
            <span>{MBU_NAMES[currentRole] || currentRole}</span>
          </div>
          <span className="hero-lbl">
            {timelineFilter.mode === 'six_months' ? '6-MONTH AVERAGE NAR' : 'AVERAGE NAR IN SCOPE'}
          </span>
        </div>

        <div className="hero-score-row">
          <div className="hero-score-value">
            {averageNarOfMbu}%
          </div>
          <div className="hero-target-status">
            {averageNarOfMbu >= 99.90 ? (
              <span className="target-pill pass">SLA Compliant</span>
            ) : (
              <span className="target-pill fail">SLA Target Delta: {Number((averageNarOfMbu - 99.90).toFixed(2))}%</span>
            )}
          </div>
        </div>

        <div className="hero-substats">
          <div className="substat">
            <span className="label">Total Scope Downtime</span>
            <span className="val text-coral">{totalDtInScope.toLocaleString()} hrs</span>
          </div>
          <div className="substat">
            <span className="label">Sites Monitored</span>
            <span className="val">{recalculatedScopedSites.length} Towers</span>
          </div>
        </div>
      </div>

      {/* 3. Sleek NAR Graph */}
      <div className="corp-card chart-hero-card">
        <div className="chart-header">
          <span>NAR Trend Graph ({timelineFilter.mode === 'six_months' ? '6 Months' : 'Active Range'})</span>
        </div>
        <div className="chart-wrapper" style={{ width: '100%', height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={activeChartData as any[]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="narEmerald" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis dataKey={timelineFilter.mode === 'six_months' ? 'monthLabel' : 'dayLabel'} stroke="#71717a" fontSize={9.5} tickLine={false} />
              <YAxis domain={[95, 100]} stroke="#71717a" fontSize={9.5} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  borderColor: '#27272a',
                  borderRadius: '4px',
                  color: '#fafafa',
                  fontSize: '11px'
                }}
                formatter={(val) => [`${val}% NAR`, 'Availability']}
              />
              <ReferenceLine y={99.90} stroke="#f97316" strokeDasharray="3 3" label={{ value: 'SLA Target (99.9%)', fill: '#f97316', fontSize: 8.5, position: 'insideBottomRight' }} />
              <Area
                type="monotone"
                dataKey="narPercent"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#narEmerald)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Overall Leaderboards (All MBUs) */}
      <div className="corp-card leaderboard-section-card">
        <div className="card-header-row">
          <div className="header-title-group">
            <h4>Overall Leaderboards (All MBUs)</h4>
          </div>
          <div className="sort-toggles">
            <button
              className={`sort-toggle-btn ${overallSortMode === 'worst' ? 'active' : ''}`}
              onClick={() => setOverallSortMode('worst')}
            >
              <ArrowDown size={12} />
              <span>Worst 20</span>
            </button>
            <button
              className={`sort-toggle-btn ${overallSortMode === 'best' ? 'active' : ''}`}
              onClick={() => setOverallSortMode('best')}
            >
              <ArrowUp size={12} />
              <span>Best 20</span>
            </button>
          </div>
        </div>

        <div className="leaderboard-table">
          <div className="table-header">
            <span>Site Code</span>
            <span>MBU</span>
            <span className="text-right">Downtime</span>
            <span className="text-right">NAR %</span>
          </div>
          <div className="table-body">
            {sortedOverallSites.map((site, index) => (
              <div
                key={site.siteCode}
                className="table-row cursor-pointer"
                onClick={() => onNavigateToSites(site.siteCode)}
              >
                <span className="site-name-col">
                  <span className="rank-index">#{index + 1}</span>
                  <strong>{site.siteCode}</strong>
                </span>
                <span className="mbu-col">{site.mbu}</span>
                <span className="downtime-col text-right text-coral">{site.totalDtHours}h</span>
                <span className={`nar-col text-right ${site.availability >= 99.90 ? 'text-green' : 'text-amber'}`}>
                  {site.availability}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Per-Single MBU Wise Leaderboards */}
      <div className="corp-card leaderboard-section-card">
        <div className="card-header-row flex-column gap-8">
          <div className="header-top-line">
            <h4>MBU-Specific Leaderboards</h4>
            {isAdmin ? (
              <select
                className="leaderboard-mbu-select"
                value={selectedMbuLeaderboard}
                onChange={(e) => setSelectedMbuLeaderboard(e.target.value)}
              >
                {mbuList.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            ) : (
              <span className="locked-mbu-badge">{selectedMbuLeaderboard}</span>
            )}
          </div>

          <div className="sort-toggles width-100">
            <button
              className={`sort-toggle-btn flex-1 ${mbuSortMode === 'worst' ? 'active' : ''}`}
              onClick={() => setMbuSortMode('worst')}
            >
              <ArrowDown size={12} />
              <span>Worst 20</span>
            </button>
            <button
              className={`sort-toggle-btn flex-1 ${mbuSortMode === 'best' ? 'active' : ''}`}
              onClick={() => setMbuSortMode('best')}
            >
              <ArrowUp size={12} />
              <span>Best 20</span>
            </button>
          </div>
        </div>

        <div className="leaderboard-table">
          <div className="table-header">
            <span>Site Code</span>
            <span>Type</span>
            <span className="text-right">Downtime</span>
            <span className="text-right">NAR %</span>
          </div>
          <div className="table-body">
            {sortedMbuSites.map((site, index) => (
              <div
                key={site.siteCode}
                className="table-row cursor-pointer"
                onClick={() => onNavigateToSites(site.siteCode)}
              >
                <span className="site-name-col">
                  <span className="rank-index">#{index + 1}</span>
                  <strong>{site.siteCode}</strong>
                </span>
                <span className="mbu-col">{site.siteType}</span>
                <span className="downtime-col text-right text-coral">{site.totalDtHours}h</span>
                <span className={`nar-col text-right ${site.availability >= 99.90 ? 'text-green' : 'text-amber'}`}>
                  {site.availability}%
                </span>
              </div>
            ))}
            {sortedMbuSites.length === 0 && (
              <div className="empty-row">No sites found for this MBU.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

