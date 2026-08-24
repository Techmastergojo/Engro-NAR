import React, { useMemo } from 'react';
import type { UserRole, SiteCatalogItem, HistoricalPeriod, GlobalTimelineFilter } from '../types';
import { MBU_NAMES } from '../utils/realData';
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
  SlidersHorizontal
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
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

  // Filter sites according to role
  const roleScopedSites: SiteCatalogItem[] = useMemo(() => {
    if (isAdmin) {
      return activePeriod.allSites;
    }
    return activePeriod.allSites.filter((s) => s.mbu === currentRole);
  }, [currentRole, isAdmin, activePeriod]);

  // Recalculate site downtime & daily stats strictly within the selected From-To timeline
  const timelineScopedSites = useMemo(() => {
    return roleScopedSites.map((site) => {
      if (!site.dailyTimeline || site.dailyTimeline.length === 0) {
        return site;
      }

      // Filter daily items between startDate and endDate
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
  const avgAvailability = timelineScopedSites.length > 0
    ? Number((timelineScopedSites.reduce((sum, s) => sum + s.availability, 0) / timelineScopedSites.length).toFixed(2))
    : 99.0;
  const compliantSitesCount = timelineScopedSites.filter((s) => s.availability >= 99.0).length;
  const compliancePercent = timelineScopedSites.length > 0
    ? Number(((compliantSitesCount / timelineScopedSites.length) * 100).toFixed(1))
    : 100;
  const avgDtPerSite = timelineScopedSites.length > 0
    ? Number((totalDt / timelineScopedSites.length).toFixed(1))
    : 0;

  // Filter daily curve chart between From and To date
  const filteredDailyChartData = useMemo(() => {
    return activePeriod.dailyTimeline
      .filter((d) => {
        if (timelineFilter.mode === 'single' && timelineFilter.singleDate) {
          return d.date === timelineFilter.singleDate;
        }
        return d.date >= timelineFilter.startDate && d.date <= timelineFilter.endDate;
      })
      .map((d) => {
        const day = parseInt(d.date.split('-')[2] || '1', 10);
        return {
          name: `Aug ${day}`,
          hours: d.totalDtHours,
          incidents: d.incidentCount
        };
      });
  }, [activePeriod, timelineFilter]);

  // Worst 5 sites in scope for this exact From-To timeline
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
            <span className="scope-sub">{activePeriod.name} &bull; Live Telemetry</span>
          </div>
        </div>
      </div>

      {/* Prominent Advanced Timeline Filter Bar (From Date ➔ To Date) */}
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

      {/* Executive Master SLA Card (Scoped to chosen timeline) */}
      <div className="corp-card master-sla-card">
        <div className="sla-card-header">
          <span className="sla-badge-title">NETWORK AVAILABILITY (NAR)</span>
          <span className="sla-target-text">Filtered: {timelineLabel}</span>
        </div>

        <div className="sla-main-row">
          <div className="sla-big-num">
            {avgAvailability}
            <span className="percent-symbol">%</span>
          </div>

          <div className="sla-compliance-badge">
            <ShieldCheck size={16} />
            <span>{compliancePercent}% SLA Compliant</span>
          </div>
        </div>

        <div className="sla-metrics-grid">
          <div className="sla-metric-col">
            <span className="metric-lbl">Total Downtime in Range</span>
            <span className="metric-val">{totalDt.toLocaleString()} hrs</span>
          </div>
          <div className="sla-metric-divider" />
          <div className="sla-metric-col">
            <span className="metric-lbl">Monitored Towers</span>
            <span className="metric-val">{timelineScopedSites.length} Sites</span>
          </div>
          <div className="sla-metric-divider" />
          <div className="sla-metric-col">
            <span className="metric-lbl">Avg DT / Tower</span>
            <span className="metric-val">{avgDtPerSite} hrs</span>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="corp-kpi-grid">
        <div className="corp-card kpi-item">
          <div className="kpi-icon blue">
            <Activity size={16} />
          </div>
          <div className="kpi-text-block">
            <span className="kpi-lbl">Outage Events in Period</span>
            <span className="kpi-val">{totalIncidents.toLocaleString()}</span>
          </div>
        </div>

        <div className="corp-card kpi-item">
          <div className="kpi-icon amber">
            <Clock size={16} />
          </div>
          <div className="kpi-text-block">
            <span className="kpi-lbl">Days in Filter</span>
            <span className="kpi-val">{filteredDailyChartData.length} Days</span>
          </div>
        </div>
      </div>

      {/* Daily Outage Curve Chart (Filtered to Timeline) */}
      {filteredDailyChartData.length > 0 && (
        <div className="corp-card chart-main-card">
          <div className="card-header-row">
            <div className="header-title-group">
              <Activity size={16} className="text-engro-green" />
              <h4>Downtime Trend ({timelineLabel})</h4>
            </div>
            <span className="badge-meta">{filteredDailyChartData.length} Reporting Days</span>
          </div>

          <div className="chart-wrapper" style={{ width: '100%', height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredDailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashGreenGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00A859" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#00A859" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#64748B" fontSize={9.5} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={9.5} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#00A859',
                    borderRadius: '6px',
                    color: '#F8FAFC',
                    fontSize: '11.5px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="hours"
                  stroke="#00A859"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#dashGreenGrad)"
                  name="Downtime (Hours)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* MBU Benchmarking Comparison (Visible to Admin) */}
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
              <span>View Graphs</span>
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
                    {m.avgAvailability}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top 5 Problematic Sites in Filtered Timeline */}
      <div className="corp-card leaderboard-card">
        <div className="card-header-row">
          <div className="header-title-group">
            <TrendingDown size={16} className="text-coral" />
            <h4>Top 5 Outage Sites ({timelineLabel})</h4>
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
                <span className="incidents-sub">{site.availability}% in range</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
