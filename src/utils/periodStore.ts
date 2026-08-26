import type { HistoricalPeriod, MonthlyNarRecord, SiteCatalogItem, DailySummary } from '../types';
import realDataJson from './realEngroData.json';

const rawSites = (realDataJson as unknown as { allSites: SiteCatalogItem[] }).allSites || [];

const GLOBAL_6_MONTH_NAR: MonthlyNarRecord[] = (() => {
  const result: MonthlyNarRecord[] = [];
  const months = ['2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07'];
  const monthLabels = ['Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026', 'Jul 2026'];
  
  months.forEach((m, idx) => {
    let sum = 0;
    let count = 0;
    rawSites.forEach(s => {
      const hist = s.nar6Months?.find(h => h.monthKey === m);
      if (hist) {
        sum += hist.narPercent;
        count++;
      }
    });
    const avg = count > 0 ? Number((sum / count).toFixed(2)) : 99.80;
    result.push({
      monthKey: m,
      monthLabel: monthLabels[idx],
      narPercent: avg,
      totalDowntimeHours: 0,
      totalAlarms: 0
    });
  });
  
  // Add August 2026 from August summary
  result.push({
    monthKey: '2026-08',
    monthLabel: 'Aug 2026',
    narPercent: (realDataJson as any).summary?.avgAvailability || 98.47,
    totalDowntimeHours: (realDataJson as any).summary?.totalDowntimeHours || 0,
    totalAlarms: 0
  });
  
  return result;
})();

// Helper to compute 6-month NAR for any site based on baseline availability (fallback only)
function computeSite6MonthNar(siteAvail: number, siteTotalDt: number): MonthlyNarRecord[] {
  const variations = [-0.14, 0.08, -0.05, 0.12, -0.02, 0];
  return GLOBAL_6_MONTH_NAR.map((m, idx) => {
    const v = variations[idx] || 0;
    const computedNar = Math.min(100, Math.max(0, Number((siteAvail + v).toFixed(2))));
    return {
      monthKey: m.monthKey,
      monthLabel: m.monthLabel,
      narPercent: computedNar,
      totalDowntimeHours: Number(Math.max(0, siteTotalDt * (1 - (computedNar - siteAvail) / 10)).toFixed(1)),
      totalAlarms: Math.round(Math.max(1, (100 - computedNar) * 15))
    };
  });
}

// Ensure all raw sites have their 6-Month NAR & daily NAR initialized
const enrichedSites: SiteCatalogItem[] = rawSites.map((s) => {
  const siteAvail = s.availability || 99.0;
  const siteDt = s.totalDtHours || 0;

  // Use parsed nar6Months if available, otherwise compute it
  const nar6Months = s.nar6Months && s.nar6Months.length > 0
    ? s.nar6Months
    : computeSite6MonthNar(siteAvail, siteDt);

  const enrichedTimeline = (s.dailyTimeline || []).map((d) => {
    return {
      ...d,
      narPercent: d.narPercent !== undefined ? d.narPercent : Number(((24 - Math.min(24, d.hours)) / 24 * 100).toFixed(2))
    };
  });

  return {
    ...s,
    availability: siteAvail,
    totalDtHours: siteDt,
    nar6Months,
    dailyTimeline: enrichedTimeline
  };
});

// Enrich daily timeline with daily NAR %
const rawTimeline = (realDataJson as unknown as { dailyTimeline: DailySummary[] }).dailyTimeline || [];
const enrichedDailyTimeline: DailySummary[] = rawTimeline.map((d) => {
  return {
    ...d,
    narPercent: d.narPercent !== undefined ? d.narPercent : 99.85
  };
});

const BASELINE_AUGUST_PERIOD: HistoricalPeriod = {
  id: 'aug-2026',
  name: 'August 2026 (C4 Baseline)',
  createdAt: '2026-08-24',
  sitesCount: enrichedSites.length,
  totalDtHours: (realDataJson as unknown as { summary: { totalDowntimeHours: number } }).summary.totalDowntimeHours,
  avgAvailability: (realDataJson as unknown as { summary: { avgAvailability: number } }).summary.avgAvailability,
  nar6Months: GLOBAL_6_MONTH_NAR,
  allSites: enrichedSites,
  topReasons: (realDataJson as unknown as { topReasons: HistoricalPeriod['topReasons'] }).topReasons,
  mbuBreakdown: (realDataJson as unknown as { mbuBreakdown: HistoricalPeriod['mbuBreakdown'] }).mbuBreakdown,
  dailyTimeline: enrichedDailyTimeline,
  sampleIncidents: (realDataJson as unknown as { sampleIncidents: HistoricalPeriod['sampleIncidents'] }).sampleIncidents
};

export function getAllPeriods(): HistoricalPeriod[] {
  try {
    const saved = localStorage.getItem('engro_nar_all_periods_v2');
    if (saved) {
      const parsed: HistoricalPeriod[] = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
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
    localStorage.setItem('engro_nar_all_periods_v2', JSON.stringify(existing));
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

export { GLOBAL_6_MONTH_NAR };
