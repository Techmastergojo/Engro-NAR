import React, { useState, useMemo } from 'react';
import type { UserRole, TimelineFilter, SiteCatalogItem } from '../types';
import { REAL_ENGRO_DATA, MBU_NAMES } from '../utils/realData';
import {
  Activity,
  Radio,
  Clock,
  ShieldCheck,
  ChevronRight,
  TrendingDown,
  Building2,
  Calendar,
  Zap
} from 'lucide-react';
import { soundFX } from '../utils/soundEffects';

interface DashboardTabProps {
  currentRole: UserRole;
  onNavigateToSites: (searchQuery?: string) => void;
  onNavigateToGraphs: () => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  currentRole,
  onNavigateToSites,
  onNavigateToGraphs
}) => {
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>('all');

  const isAdmin = currentRole === 'admin';

  // Filter sites according to role
  const scopedSites: SiteCatalogItem[] = useMemo(() => {
    if (isAdmin) {
      return REAL_ENGRO_DATA.allSites;
    }
    return REAL_ENGRO_DATA.allSites.filter((s) => s.mbu === currentRole);
  }, [currentRole, isAdmin]);

  // Aggregate stats for scoped sites
  const totalDt = scopedSites.reduce((sum, s) => sum + s.totalDtHours, 0);
  const totalIncidents = scopedSites.reduce((sum, s) => sum + s.incidentCount, 0);
  const avgAvailability = scopedSites.length > 0
    ? Number((scopedSites.reduce((sum, s) => sum + s.availability, 0) / scopedSites.length).toFixed(2))
    : 99.0;
  const compliantSitesCount = scopedSites.filter((s) => s.availability >= 99.0).length;
  const compliancePercent = scopedSites.length > 0
    ? Number(((compliantSitesCount / scopedSites.length) * 100).toFixed(1))
    : 100;
  const avgDtPerSite = scopedSites.length > 0
    ? Number((totalDt / scopedSites.length).toFixed(1))
    : 0;

  // Worst 5 sites in scope
  const worstSites = useMemo(() => {
    return [...scopedSites].sort((a, b) => b.totalDtHours - a.totalDtHours).slice(0, 5);
  }, [scopedSites]);

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
            <span className="scope-sub">Performance Report &bull; August 2026</span>
          </div>
        </div>
      </div>

      {/* Timeline Filter Row */}
      <div className="timeline-filter-container">
        <div className="timeline-filter-label">
          <Calendar size={13} />
          <span>TIMELINE:</span>
        </div>
        <div className="timeline-buttons-row">
          {[
            { id: 'all', label: 'All Aug-26' },
            { id: 'w1', label: 'Aug 1-5' },
            { id: 'w2', label: 'Aug 6-10' },
            { id: 'w3', label: 'Aug 11-15' },
            { id: 'w4', label: 'Aug 16-20' }
          ].map((t) => (
            <button
              key={t.id}
              className={`timeline-btn ${timelineFilter === t.id ? 'active' : ''}`}
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

      {/* Executive Master SLA Card */}
      <div className="corp-card master-sla-card">
        <div className="sla-card-header">
          <span className="sla-badge-title">NETWORK AVAILABILITY (NAR)</span>
          <span className="sla-target-text">Target: 99.90% SLA</span>
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
            <span className="metric-lbl">Total Downtime</span>
            <span className="metric-val">{totalDt.toLocaleString()} hrs</span>
          </div>
          <div className="sla-metric-divider" />
          <div className="sla-metric-col">
            <span className="metric-lbl">Monitored Towers</span>
            <span className="metric-val">{scopedSites.length} Sites</span>
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
            <span className="kpi-lbl">Total Outage Events</span>
            <span className="kpi-val">{totalIncidents.toLocaleString()}</span>
          </div>
        </div>

        <div className="corp-card kpi-item">
          <div className="kpi-icon amber">
            <Clock size={16} />
          </div>
          <div className="kpi-text-block">
            <span className="kpi-lbl">Avg Alarm Duration</span>
            <span className="kpi-val">
              {totalIncidents > 0 ? (totalDt / totalIncidents).toFixed(1) : '0'} hrs
            </span>
          </div>
        </div>
      </div>

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
            {REAL_ENGRO_DATA.mbuBreakdown.map((m) => (
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

      {/* Top 5 Problematic Sites (Leaderboard) */}
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
            <span>Search All {scopedSites.length} Sites</span>
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
                <span className="incidents-sub">{site.incidentCount} alarms</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
