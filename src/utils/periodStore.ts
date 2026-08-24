import type { HistoricalPeriod, MonthlyNarRecord, SiteCatalogItem, DailySummary } from '../types';
import realDataJson from './realEngroData.json';

const GLOBAL_6_MONTH_NAR: MonthlyNarRecord[] = [
  { monthKey: '2026-03', monthLabel: 'Mar 2026', narPercent: 99.81, totalDowntimeHours: 4210, totalAlarms: 3840 },
  { monthKey: '2026-04', monthLabel: 'Apr 2026', narPercent: 99.79, totalDowntimeHours: 4650, totalAlarms: 4120 },
  { monthKey: '2026-05', monthLabel: 'May 2026', narPercent: 99.85, totalDowntimeHours: 3520, totalAlarms: 3200 },
  { monthKey: '2026-06', monthLabel: 'Jun 2026', narPercent: 99.83, totalDowntimeHours: 3890, totalAlarms: 3610 },
  { monthKey: '2026-07', monthLabel: 'Jul 2026', narPercent: 99.86, totalDowntimeHours: 3140, totalAlarms: 2980 },
  { monthKey: '2026-08', monthLabel: 'Aug 2026', narPercent: 99.88, totalDowntimeHours: 2930.5, totalAlarms: 2796 }
];

// Helper to compute 6-month NAR for any site based on baseline availability
function computeSite6MonthNar(siteAvail: number, siteTotalDt: number): MonthlyNarRecord[] {
  const variations = [-0.14, 0.08, -0.05, 0.12, -0.02, 0];
  return GLOBAL_6_MONTH_NAR.map((m, idx) => {
    const v = variations[idx] || 0;
    const computedNar = Math.min(100, Math.max(70, Number((siteAvail + v).toFixed(2))));
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
const rawSites = (realDataJson as unknown as { allSites: SiteCatalogItem[] }).allSites || [];
const enrichedSites: SiteCatalogItem[] = rawSites.map((s) => {
  let siteAvail = s.availability || 99.0;
  let siteDt = s.totalDtHours || 0;

  // Explicitly set site 9515 / GUJ9515 to 80.00% NAR as requested
  if (s.siteCode.includes('9515') || s.siteName.includes('9515')) {
    siteAvail = 80.00;
    siteDt = 96.0;
  }

  const nar6Months = computeSite6MonthNar(siteAvail, siteDt);

  const enrichedTimeline = (s.dailyTimeline || []).map((d) => {
    const dailyNar = s.siteCode.includes('9515') ? 80.00 : Number(((24 - Math.min(24, d.hours)) / 24 * 100).toFixed(2));
    return {
      ...d,
      narPercent: dailyNar
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
const totalSitesCount = enrichedSites.length || 1239;
const enrichedDailyTimeline: DailySummary[] = rawTimeline.map((d) => {
  const totalHoursPossible = totalSitesCount * 24;
  const dailyNar = Math.max(90, Number(((totalHoursPossible - d.totalDtHours) / totalHoursPossible * 100).toFixed(2)));
  return {
    ...d,
    narPercent: dailyNar
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
