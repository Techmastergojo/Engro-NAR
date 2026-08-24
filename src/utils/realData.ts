import realDataJson from './realEngroData.json';
import type {
  OutageRecord,
  SiteCatalogItem,
  MbuSummary,
  ReasonSummary,
  DailySummary
} from '../types';

export interface EngroRealDataset {
  summary: {
    totalRawRecords: number;
    totalDowntimeHours: number;
    totalSites: number;
    avgAvailability: number;
  };
  allSites: SiteCatalogItem[];
  topReasons: ReasonSummary[];
  mbuBreakdown: MbuSummary[];
  dailyTimeline: DailySummary[];
  sampleIncidents: OutageRecord[];
}

export const REAL_ENGRO_DATA: EngroRealDataset = realDataJson as unknown as EngroRealDataset;

export const MBU_NAMES: Record<string, string> = {
  admin: 'Executive HQ (All C4 MBUs)',
  'C4-GUJ-01': 'C4-GUJ-01 (Gujranwala 1)',
  'C4-GUJ-02': 'C4-GUJ-02 (Gujranwala 2)',
  'C4-SKT-03': 'C4-SKT-03 (Sialkot)',
  'C4-GRT-04': 'C4-GRT-04 (Gujrat)',
  'C4-NRW-05': 'C4-NRW-05 (Narowal)',
  'C4-HFZ-06': 'C4-HFZ-06 (Hafizabad)',
  'C4-WZD-07': 'C4-WZD-07 (Wazirabad)',
  'C4-MBD-08': 'C4-MBD-08 (Mandi Bahauddin)'
};
