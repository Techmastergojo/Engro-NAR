import type { HistoricalPeriod } from '../types';
import realDataJson from './realEngroData.json';

const BASELINE_AUGUST_PERIOD: HistoricalPeriod = {
  id: 'aug-2026',
  name: 'August 2026 (C4 Baseline)',
  createdAt: '2026-08-24',
  sitesCount: (realDataJson as unknown as { allSites: unknown[] }).allSites.length,
  totalDtHours: (realDataJson as unknown as { summary: { totalDowntimeHours: number } }).summary.totalDowntimeHours,
  avgAvailability: (realDataJson as unknown as { summary: { avgAvailability: number } }).summary.avgAvailability,
  allSites: (realDataJson as unknown as { allSites: HistoricalPeriod['allSites'] }).allSites,
  topReasons: (realDataJson as unknown as { topReasons: HistoricalPeriod['topReasons'] }).topReasons,
  mbuBreakdown: (realDataJson as unknown as { mbuBreakdown: HistoricalPeriod['mbuBreakdown'] }).mbuBreakdown,
  dailyTimeline: (realDataJson as unknown as { dailyTimeline: HistoricalPeriod['dailyTimeline'] }).dailyTimeline,
  sampleIncidents: (realDataJson as unknown as { sampleIncidents: HistoricalPeriod['sampleIncidents'] }).sampleIncidents
};

export function getAllPeriods(): HistoricalPeriod[] {
  try {
    const saved = localStorage.getItem('engro_nar_all_periods');
    if (saved) {
      const parsed: HistoricalPeriod[] = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure baseline August is always included
        const hasAug = parsed.some(p => p.id === 'aug-2026');
        if (!hasAug) {
          return [BASELINE_AUGUST_PERIOD, ...parsed];
        }
        return parsed;
      }
    }
  } catch {
    // fallback
  }
  return [BASELINE_AUGUST_PERIOD];
}

export function savePeriod(period: HistoricalPeriod): void {
  const existing = getAllPeriods();
  const index = existing.findIndex(p => p.id === period.id);
  if (index >= 0) {
    existing[index] = period;
  } else {
    existing.push(period);
  }
  try {
    localStorage.setItem('engro_nar_all_periods', JSON.stringify(existing));
  } catch {
    // quota fallback
  }
}

export function getActivePeriodId(): string {
  return localStorage.getItem('engro_nar_active_period_id') || 'aug-2026';
}

export function setActivePeriodId(id: string): void {
  localStorage.setItem('engro_nar_active_period_id', id);
}

export function getActivePeriod(): HistoricalPeriod {
  const activeId = getActivePeriodId();
  const all = getAllPeriods();
  const found = all.find(p => p.id === activeId);
  return found || all[0] || BASELINE_AUGUST_PERIOD;
}
