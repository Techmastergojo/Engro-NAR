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

export interface SiteCatalogItem {
  siteCode: string;
  siteName: string;
  mbu: string;
  vendor: string;
  siteType: string;
  priority: string;
  totalDtHours: number;
  incidentCount: number;
  availability: number;
  topReasons: { reason: string; hours: number }[];
  dailyTimeline: { date: string; hours: number }[];
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
  mbus: Record<string, number>;
}

export type TabType = 'dashboard' | 'graphs' | 'sites' | 'import';

export type TimelineFilter = 'all' | 'w1' | 'w2' | 'w3' | 'w4';
