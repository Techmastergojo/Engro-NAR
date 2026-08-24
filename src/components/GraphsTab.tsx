import React, { useState } from 'react';
import type { UserRole } from '../types';
import { REAL_ENGRO_DATA } from '../utils/realData';
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
import { TrendingUp, BarChart2, PieChart, Layers } from 'lucide-react';
import { soundFX } from '../utils/soundEffects';

interface GraphsTabProps {
  currentRole?: UserRole;
}

export const GraphsTab: React.FC<GraphsTabProps> = () => {

  const [activeChart, setActiveChart] = useState<'timeline' | 'reasons' | 'mbus'>('timeline');

  // Timeline chart data
  const timelineData = REAL_ENGRO_DATA.dailyTimeline.map((d) => {
    const day = parseInt(d.date.split('-')[2] || '1', 10);
    return {
      name: `Aug ${day}`,
      hours: d.totalDtHours,
      incidents: d.incidentCount
    };
  });

  // Reasons chart data
  const reasonsData = REAL_ENGRO_DATA.topReasons.slice(0, 6).map((r) => ({
    name: r.reason.length > 14 ? `${r.reason.substring(0, 14)}...` : r.reason,
    fullName: r.reason,
    hours: r.totalDtHours,
    incidents: r.incidentCount
  }));

  // MBU chart data
  const mbuData = REAL_ENGRO_DATA.mbuBreakdown.map((m) => ({
    name: m.mbu.replace('C4-', ''),
    mbu: m.mbu,
    hours: m.totalDtHours,
    sites: m.siteCount
  }));

  const chartColors = ['#00A859', '#0066CC', '#F7941D', '#E63946', '#8B5CF6', '#06D6A0'];

  return (
    <div className="tab-content graphs-content">
      {/* Chart Selector Pills */}
      <div className="corp-card chart-switcher-bar">
        <div className="switcher-row">
          <button
            className={`switch-tab-btn ${activeChart === 'timeline' ? 'active' : ''}`}
            onClick={() => {
              soundFX.playClick();
              setActiveChart('timeline');
            }}
          >
            <TrendingUp size={14} />
            <span>Daily Curve</span>
          </button>

          <button
            className={`switch-tab-btn ${activeChart === 'reasons' ? 'active' : ''}`}
            onClick={() => {
              soundFX.playClick();
              setActiveChart('reasons');
            }}
          >
            <PieChart size={14} />
            <span>Root Causes</span>
          </button>

          <button
            className={`switch-tab-btn ${activeChart === 'mbus' ? 'active' : ''}`}
            onClick={() => {
              soundFX.playClick();
              setActiveChart('mbus');
            }}
          >
            <Layers size={14} />
            <span>MBU Clusters</span>
          </button>
        </div>
      </div>

      {/* Daily Outage Curve Chart */}
      {activeChart === 'timeline' && (
        <div className="corp-card chart-main-card">
          <div className="card-header-row">
            <div className="header-title-group">
              <TrendingUp size={16} className="text-engro-green" />
              <h4>Daily Downtime Curve (Aug 1 - Aug 20)</h4>
            </div>
            <span className="badge-meta">20 Reporting Days</span>
          </div>

          <div className="chart-wrapper" style={{ width: '100%', height: 210 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="corpGreenGrad" x1="0" y1="0" x2="0" y2="1">
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
                  fill="url(#corpGreenGrad)"
                  name="Downtime (Hours)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Root Cause Distribution Chart */}
      {activeChart === 'reasons' && (
        <div className="corp-card chart-main-card">
          <div className="card-header-row">
            <div className="header-title-group">
              <BarChart2 size={16} className="text-engro-blue" />
              <h4>Major Root Causes (Total Hours)</h4>
            </div>
            <span className="badge-meta">Top Drivers</span>
          </div>

          <div className="chart-wrapper" style={{ width: '100%', height: 210 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reasonsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#64748B" fontSize={9} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={9.5} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#0066CC',
                    borderRadius: '6px',
                    color: '#F8FAFC',
                    fontSize: '11.5px'
                  }}
                />
                <Bar dataKey="hours" name="Downtime Hours" radius={[4, 4, 0, 0]}>
                  {reasonsData.map((_e, i) => (
                    <Cell key={`cell-${i}`} fill={chartColors[i % chartColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* MBU Distribution Chart */}
      {activeChart === 'mbus' && (
        <div className="corp-card chart-main-card">
          <div className="card-header-row">
            <div className="header-title-group">
              <Layers size={16} className="text-amber" />
              <h4>Cumulative Downtime by MBU</h4>
            </div>
            <span className="badge-meta">8 Clusters</span>
          </div>

          <div className="chart-wrapper" style={{ width: '100%', height: 210 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mbuData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#64748B" fontSize={9} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={9.5} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#F7941D',
                    borderRadius: '6px',
                    color: '#F8FAFC',
                    fontSize: '11.5px'
                  }}
                />
                <Bar dataKey="hours" name="Downtime Hours" radius={[4, 4, 0, 0]}>
                  {mbuData.map((_e, i) => (
                    <Cell key={`cell-${i}`} fill={chartColors[i % chartColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Comprehensive Root-Cause Impact Table */}
      <div className="corp-card root-cause-breakdown-card">
        <div className="card-header-row">
          <h4>Detailed Root Cause Summary</h4>
          <span className="table-count-tag">{REAL_ENGRO_DATA.topReasons.length} Categories</span>
        </div>

        <div className="reasons-list-container">
          {REAL_ENGRO_DATA.topReasons.map((r, index) => {
            const sharePercent = ((r.totalDtHours / REAL_ENGRO_DATA.summary.totalDowntimeHours) * 100).toFixed(1);
            return (
              <div key={r.reason} className="reason-row-item">
                <div className="reason-rank">#{index + 1}</div>
                <div className="reason-details">
                  <span className="reason-name">{r.reason}</span>
                  <span className="reason-sub">{r.category}</span>
                </div>
                <div className="reason-stats">
                  <span className="reason-hours">{r.totalDtHours.toLocaleString()}h</span>
                  <span className="reason-share">{sharePercent}% of total</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
