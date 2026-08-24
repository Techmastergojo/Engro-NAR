import realDataJson from './realEngroData.json';
import { OutageRecord } from '../types';

export interface EngroRealDataset {
  summary: {
    totalRawRecords: number;
    totalDowntimeHours: number;
    totalSites: number;
    avgAvailability: number;
  };
  topSites: {
    siteCode: string;
    siteName: string;
    mbu: string;
    totalDtHours: number;
    incidentCount: number;
    reasons: Record<string, number>;
  }[];
  topReasons: {
    reason: string;
    category: string;
    totalDtHours: number;
    incidentCount: number;
  }[];
  mbuBreakdown: {
    mbu: string;
    totalDtHours: number;
    incidentCount: number;
  }[];
  dailyTimeline: {
    date: string;
    totalDtHours: number;
    incidentCount: number;
  }[];
  sampleIncidents: OutageRecord[];
}

export const REAL_ENGRO_DATA: EngroRealDataset = realDataJson as EngroRealDataset;
