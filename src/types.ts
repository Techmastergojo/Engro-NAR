export type UserRole =
  | 'admin'
  | 'C4-GUJ-01'
  | 'C4-GUJ-02'
  | 'C4-SKT-03'
  | 'C4-GRT-04'
  | 'C4-NRW-05'
  | 'C4-HFZ-06'
  | 'C4-WZD-07'
  | 'C4-MBD-08';

export interface MonthlyNarRecord {
  monthKey: string; // e.g. '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08'
  monthLabel: string; // e.g. 'Mar 2026', 'Apr 2026', 'Aug 2026'
  narPercent: number; // e.g. 99.84
  totalDowntimeHours: number;
  totalAlarms: number;
}

export interface SiteCatalogItem {
  siteCode: string;
  siteName: string;
  mbu: string;
  vendor: string;
  siteType: string;
  priority: string;
  totalDtHours: number;
  incidentCount: number;
  availability: number; // Current NAR %
  nar6Months: MonthlyNarRecord[]; // 6-Month NAR history for this site
  topReasons: { reason: string; hours: number }[];
  dailyTimeline: { date: string; hours: number; narPercent?: number }[];
}

export interface OutageRecord {
  id: string;
  siteId: string;
  siteName: string;
  region: string;
  downtimeHours: number;
  availability: number;
  timestamp: string; // YYYY-MM-DD
  category: string;
  status: 'Active' | 'Resolved' | 'Investigating';
  slaTarget: number;
  rootCause?: string;
  mttrMinutes?: number;
}

export interface TelecomStats {
  totalSites: number;
  overallAvailability: number;
  totalDowntimeHours: number;
  activeIncidents: number;
  mttrAverageHours: number;
  slaComplianceRate: number;
  topCategory: string;
  topWorstSite: { name: string; downtime: number; avail: number; siteCode: string } | null;
  avgDowntimePerSite: number;
}

export interface AnomalyFact {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'positive';
  title: string;
  description: string;
  metricImpact: string;
  recommendation: string;
}

export interface MbuSummary {
  mbu: string;
  totalDtHours: number;
  incidentCount: number;
  siteCount: number;
  avgAvailability: number;
}

export interface ReasonSummary {
  reason: string;
  category: string;
  totalDtHours: number;
  incidentCount: number;
}

export interface DailySummary {
  date: string;
  totalDtHours: number;
  incidentCount: number;
  narPercent: number; // Daily NAR %
  mbus: Record<string, number>;
}

export interface HistoricalPeriod {
  id: string;
  name: string;
  createdAt: string;
  sitesCount: number;
  totalDtHours: number;
  avgAvailability: number;
  nar6Months?: MonthlyNarRecord[]; // Global 6-Month NAR series
  allSites: SiteCatalogItem[];
  topReasons: ReasonSummary[];
  mbuBreakdown: MbuSummary[];
  dailyTimeline: DailySummary[];
  sampleIncidents: OutageRecord[];
}

export interface GlobalTimelineFilter {
  mode: 'all' | 'custom' | 'single';
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  singleDate?: string;
}

export type TabType = 'dashboard' | 'graphs' | 'sites' | 'import';
