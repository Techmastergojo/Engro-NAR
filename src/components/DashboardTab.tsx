import React, { useState, useMemo } from 'react';
import type { OutageRecord, TelecomStats, TimelineFilter } from '../types';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import {
  Activity,
  Radio,
  Zap,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  Flame,
  Calendar,
  Layers
} from 'lucide-react';
import { soundFX } from '../utils/soundEffects';

interface DashboardTabProps {
  records: OutageRecord[];
  stats: TelecomStats;
  onNavigateToOutages: () => void;
  onNavigateToImport: () => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  records,
  stats,
  onNavigateToOutages,
  onNavigateToImport
}) => {
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>('all');
  const [selectedMbu, setSelectedMbu] = useState<string>('all');

  // Filter records by timeline and MBU
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // MBU filter
      if (selectedMbu !== 'all' && r.region !== selectedMbu) {
        return false;
      }

      // Timeline filter
      if (timelineFilter === 'all') return true;
      const day = parseInt(r.timestamp.split('-')[2] || '1', 10);
      if (timelineFilter === 'w1') return day >= 1 && day <= 5;
      if (timelineFilter === 'w2') return day >= 6 && day <= 10;
      if (timelineFilter === 'w3') return day >= 11 && day <= 15;
      if (timelineFilter === 'w4') return day >= 16 && day <= 20;
      if (timelineFilter === 'today') return day === 20 || day === 1;
      return true;
    });
  }, [records, timelineFilter, selectedMbu]);

  // Aggregate Daily Trend Chart
  const dailyTrendData = useMemo(() => {
    const dayMap: Record<string, { date: string; downtime: number; count: number; dayNum: number }> = {};
    filteredRecords.forEach((r) => {
      const d = r.timestamp;
      const dayNum = parseInt(d.split('-')[2] || '1', 10);
      if (!dayMap[d]) {
        dayMap[d] = { date: `Aug ${dayNum}`, downtime: 0, count: 0, dayNum };
      }
      dayMap[d].downtime += Number(r.downtimeHours) || 0;
      dayMap[d].count += 1;
    });
    return Object.values(dayMap)
      .sort((a, b) => a.dayNum - b.dayNum)
      .map(item => ({
        name: item.date,
        hours: Number(item.downtime.toFixed(1)),
        incidents: item.count
      }));
  }, [filteredRecords]);

  // Aggregate Top Reasons Breakdown
  const categoryData = useMemo(() => {
    const catMap: Record<string, number> = {};
    filteredRecords.forEach((r) => {
      const c = r.category || 'Power Grid';
      catMap[c] = (catMap[c] || 0) + (Number(r.downtimeHours) || 0);
    });
    return Object.entries(catMap)
      .map(([name, hours]) => ({ name, hours: Number(hours.toFixed(1)) }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 5);
  }, [filteredRecords]);

  const colors = ['#00F0FF', '#00FF9D', '#FF9900', '#FF3366', '#8B5CF6'];

  // Top Sites Leaderboard aggregated
  const topSitesLeaderboard = useMemo(() => {
    const siteMap: Record<string, { siteId: string; siteName: string; region: string; totalDt: number; count: number; avail: number; category: string; rootCause?: string }> = {};
    filteredRecords.forEach(r => {
      if (!siteMap[r.siteId]) {
        siteMap[r.siteId] = {
          siteId: r.siteId,
          siteName: r.siteName,
          region: r.region,
          totalDt: 0,
          count: 0,
          avail: r.availability,
          category: r.category,
          rootCause: r.rootCause
        };
      }
      siteMap[r.siteId].totalDt += Number(r.downtimeHours) || 0;
      siteMap[r.siteId].count += 1;
    });
    return Object.values(siteMap)
      .sort((a, b) => b.totalDt - a.totalDt)
      .slice(0, 5);
  }, [filteredRecords]);

  // Unique MBUs
  const mbuList = useMemo(() => {
    const set = new Set(records.map(r => r.region).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [records]);

  // SLA Gauge angle
  const availValue = Math.min(100, Math.max(90, stats.overallAvailability));
  const percentageScore = ((availValue - 90) / 10) * 100;
  const strokeDashoffset = 283 - (283 * percentageScore) / 100;

  return (
    <div className="tab-content dashboard-tab">
      {/* Interactive Timeline Filter Row */}
      <div className="timeline-filter-bar glass-panel">
        <div className="filter-header-title">
          <Calendar size={14} className="text-cyan" />
          <span>TIMELINE RANGE</span>
        </div>
        <div className="timeline-pills-row">
          {[
            { id: 'all', label: 'All Aug-26' },
            { id: 'w1', label: 'Aug 1-5' },
            { id: 'w2', label: 'Aug 6-10' },
            { id: 'w3', label: 'Aug 11-15' },
            { id: 'w4', label: 'Aug 16-20' },
            { id: 'today', label: 'Recent' }
          ].map((t) => (
            <button
              key={t.id}
              className={`timeline-pill ${timelineFilter === t.id ? 'active' : ''}`}
              onClick={() => {
                soundFX.playClick();
                setTimelineFilter(t.id as TimelineFilter);
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* MBU Filter Bar */}
      <div className="mbu-filter-bar glass-panel">
        <div className="filter-header-title">
          <Layers size={14} className="text-emerald" />
          <span>MBU REGION</span>
        </div>
        <div className="mbu-pills-row">
          {mbuList.map((mbu) => (
            <button
              key={mbu}
              className={`mbu-pill ${selectedMbu === mbu ? 'active' : ''}`}
              onClick={() => {
                soundFX.playClick();
                setSelectedMbu(mbu);
              }}
            >
              {mbu === 'all' ? 'All MBUs' : mbu}
            </button>
          ))}
        </div>
      </div>

      {/* SLA Master Circular Sweep Gauge */}
      <div className="sla-gauge-card glass-panel">
        <div className="gauge-header">
          <div className="badge-live-pulse">
            <span className="dot" />
            <span>C4 TELEMETRY ENGINE</span>
          </div>
          <span className="sla-target-label">Target: 99.90% SLA</span>
        </div>

        <div className="gauge-center-wrapper">
          <svg className="circular-gauge-svg" viewBox="0 0 120 120">
            <defs>
              <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00E5FF" />
                <stop offset="50%" stopColor="#00FF9D" />
                <stop offset="100%" stopColor="#FF9900" />
              </linearGradient>
            </defs>

            <circle
              className="gauge-bg-circle"
              cx="60"
              cy="60"
              r="45"
              strokeWidth="9"
              fill="none"
            />

            <circle
              className="gauge-val-circle"
              cx="60"
              cy="60"
              r="45"
              strokeWidth="9"
              stroke="url(#gaugeGradient)"
              strokeDasharray="283"
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="none"
            />
          </svg>

          <div className="gauge-text-overlay">
            <span className="gauge-number">{stats.overallAvailability}%</span>
            <span className="gauge-sub">ENGRO C4 NAR</span>
            <div className="compliance-pill">
              <ShieldCheck size={13} />
              <span>{stats.slaComplianceRate}% Sites Compliant</span>
            </div>
          </div>
        </div>

        <div className="gauge-footer-stats">
          <div className="g-stat">
            <span className="g-stat-title">Avg per Site</span>
            <span className="g-stat-value">{stats.avgDowntimePerSite} hrs</span>
          </div>
          <div className="g-stat-divider" />
          <div className="g-stat">
            <span className="g-stat-title">Total Downtime</span>
            <span className="g-stat-value">{stats.totalDowntimeHours} hrs</span>
          </div>
          <div className="g-stat-divider" />
          <div className="g-stat">
            <span className="g-stat-title">Monitored Towers</span>
            <span className="g-stat-value">{stats.totalSites} Sites</span>
          </div>
        </div>
      </div>

      {/* Grid of Key Telemetry Cards */}
      <div className="kpi-grid">
        <div className="kpi-card glass-panel glow-cyan">
          <div className="kpi-icon-box cyan">
            <Activity size={18} />
          </div>
          <div className="kpi-info">
            <span className="kpi-title">Active Alarms</span>
            <span className="kpi-num">{stats.activeIncidents}</span>
          </div>
          <span className="kpi-subtext">Open NOC tickets</span>
        </div>

        <div className="kpi-card glass-panel glow-coral">
          <div className="kpi-icon-box coral">
            <Flame size={18} />
          </div>
          <div className="kpi-info">
            <span className="kpi-title">Top Outage Driver</span>
            <span className="kpi-num text-xs">{stats.topCategory}</span>
          </div>
          <span className="kpi-subtext">Highest downtime cause</span>
        </div>

        <div className="kpi-card glass-panel glow-emerald">
          <div className="kpi-icon-box emerald">
            <Radio size={18} />
          </div>
          <div className="kpi-info">
            <span className="kpi-title">In-View Outages</span>
            <span className="kpi-num">{filteredRecords.length}</span>
          </div>
          <span className="kpi-subtext">Incident logs in timeline</span>
        </div>

        <div className="kpi-card glass-panel glow-amber">
          <div className="kpi-icon-box amber">
            <Zap size={18} />
          </div>
          <div className="kpi-info">
            <span className="kpi-title">Total DT in View</span>
            <span className="kpi-num">
              {filteredRecords.reduce((s, r) => s + r.downtimeHours, 0).toFixed(0)}h
            </span>
          </div>
          <span className="kpi-subtext">Filtered downtime</span>
        </div>
      </div>

      {/* Timeline Outage Curve Chart */}
      <div className="chart-card glass-panel">
        <div className="chart-header">
          <div className="chart-title-group">
            <TrendingUp size={16} className="text-cyan" />
            <h3>Outage Hours Over Timeline</h3>
          </div>
          <span className="chart-badge">Daily Curve</span>
        </div>

        <div className="chart-container" style={{ width: '100%', height: 190 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="availAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00F0FF" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#00F0FF" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="#64748B" fontSize={10} tickLine={false} />
              <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F172A',
                  borderColor: '#00F0FF',
                  borderRadius: '8px',
                  color: '#F8FAFC',
                  fontSize: '12px'
                }}
              />
              <Area
                type="monotone"
                dataKey="hours"
                stroke="#00F0FF"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#availAreaGrad)"
                name="Downtime (Hours)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Reasons Breakdown Bar Chart */}
      <div className="chart-card glass-panel">
        <div className="chart-header">
          <div className="chart-title-group">
            <Zap size={16} className="text-emerald" />
            <h3>Top Outage Reasons Breakdown</h3>
          </div>
          <span className="chart-badge">Cumulative Hours</span>
        </div>

        <div className="chart-container" style={{ width: '100%', height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} layout="horizontal">
              <XAxis dataKey="name" stroke="#64748B" fontSize={8.5} tickLine={false} interval={0} />
              <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F172A',
                  borderColor: '#00FF9D',
                  borderRadius: '8px',
                  color: '#F8FAFC',
                  fontSize: '12px'
                }}
              />
              <Bar dataKey="hours" name="Downtime (Hours)" radius={[6, 6, 0, 0]}>
                {categoryData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Real Top Outage Sites Leaderboard */}
      <div className="leaderboard-card glass-panel">
        <div className="leaderboard-header">
          <h3>🚨 Worst Outage Sites (Leaderboard)</h3>
          <button
            className="link-action-btn"
            onClick={() => {
              soundFX.playClick();
              onNavigateToOutages();
            }}
          >
            <span>View All Logs</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="bottleneck-list">
          {topSitesLeaderboard.map((site, index) => (
            <div key={site.siteId} className="bottleneck-item">
              <div className="bottleneck-rank">#{index + 1}</div>
              <div className="bottleneck-details">
                <div className="b-name-row">
                  <span className="b-name">{site.siteId}</span>
                  <span className="b-region">{site.region}</span>
                </div>
                <div className="b-cause">{site.siteName}</div>
                <div className="b-reason-tag">{site.category} ({site.count} hits)</div>
              </div>
              <div className="bottleneck-stats">
                <span className="b-hours">{site.totalDt.toFixed(1)}h</span>
                <span className="b-avail">Down</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Excel Hub banner */}
      <div className="prompt-excel-banner glass-panel">
        <div className="banner-content">
          <h4>Loaded: C4 Overall Performance Aug-2026</h4>
          <p>You can upload any other monthly sheet directly into the Excel Hub.</p>
        </div>
        <button
          className="glow-cta-btn"
          onClick={() => {
            soundFX.playClick();
            onNavigateToImport();
          }}
        >
          Open Excel Hub
        </button>
      </div>
    </div>
  );
};
