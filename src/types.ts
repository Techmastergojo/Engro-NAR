export type IncidentSeverity = 'critical' | 'major' | 'minor' | 'normal';

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

export type TabType = 'dashboard' | 'outages' | 'insights' | 'import';

export type TimelineFilter = 'all' | 'w1' | 'w2' | 'w3' | 'w4' | 'today';
