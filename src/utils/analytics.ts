import { OutageRecord, TelecomStats, AnomalyFact } from '../types';

export function calculateTelecomStats(records: OutageRecord[]): TelecomStats {
  if (!records || records.length === 0) {
    return {
      totalSites: 0,
      overallAvailability: 100,
      totalDowntimeHours: 0,
      activeIncidents: 0,
      mttrAverageHours: 0,
      slaComplianceRate: 100,
      topCategory: 'None',
      topWorstSite: null,
      avgDowntimePerSite: 0
    };
  }

  const totalDowntime = records.reduce((sum, r) => sum + (Number(r.downtimeHours) || 0), 0);
  const activeCount = records.filter(r => r.status === 'Active' || r.status === 'Investigating').length;
  
  // Unique sites
  const uniqueSites = new Set(records.map(r => r.siteId));
  const siteCount = uniqueSites.size || records.length;
  
  // Calculate average availability
  const avgAvail = records.reduce((sum, r) => sum + (Number(r.availability) || 100), 0) / records.length;
  
  // MTTR
  const totalMttrMinutes = records.reduce((sum, r) => sum + (Number(r.mttrMinutes) || (Number(r.downtimeHours) * 60)), 0);
  const avgMttrHours = (totalMttrMinutes / records.length) / 60;

  // SLA compliance
  const compliantCount = records.filter(r => r.availability >= (r.slaTarget || 99.9)).length;
  const complianceRate = (compliantCount / records.length) * 100;

  // Category breakdown
  const categoryMap: Record<string, number> = {};
  records.forEach(r => {
    const cat = r.category || 'Grid Power';
    categoryMap[cat] = (categoryMap[cat] || 0) + (Number(r.downtimeHours) || 0);
  });
  let topCat = 'None';
  let maxCatDowntime = -1;
  Object.entries(categoryMap).forEach(([cat, hours]) => {
    if (hours > maxCatDowntime) {
      maxCatDowntime = hours;
      topCat = cat;
    }
  });

  // Group downtime by site ID to find true worst site
  const siteDowntimeMap: Record<string, { name: string; downtime: number; avail: number; siteCode: string }> = {};
  records.forEach(r => {
    if (!siteDowntimeMap[r.siteId]) {
      siteDowntimeMap[r.siteId] = {
        name: r.siteName,
        downtime: 0,
        avail: r.availability,
        siteCode: r.siteId
      };
    }
    siteDowntimeMap[r.siteId].downtime += Number(r.downtimeHours) || 0;
  });

  const sortedSites = Object.values(siteDowntimeMap).sort((a, b) => b.downtime - a.downtime);
  const worst = sortedSites[0] || null;

  return {
    totalSites: siteCount,
    overallAvailability: Number(avgAvail.toFixed(2)),
    totalDowntimeHours: Number(totalDowntime.toFixed(1)),
    activeIncidents: activeCount,
    mttrAverageHours: Number(avgMttrHours.toFixed(1)),
    slaComplianceRate: Number(complianceRate.toFixed(1)),
    topCategory: topCat,
    topWorstSite: worst,
    avgDowntimePerSite: Number((totalDowntime / Math.max(1, siteCount)).toFixed(1))
  };
}

export function generateSmartFacts(records: OutageRecord[]): AnomalyFact[] {
  if (!records || records.length === 0) return [];

  const facts: AnomalyFact[] = [];
  const stats = calculateTelecomStats(records);

  // Anomaly 1: Worst site bottleneck
  if (stats.topWorstSite && stats.totalDowntimeHours > 0) {
    const share = ((stats.topWorstSite.downtime / stats.totalDowntimeHours) * 100).toFixed(1);
    facts.push({
      id: 'fact-bottleneck',
      type: 'critical',
      title: `Top Outage Site: ${stats.topWorstSite.siteCode} (${stats.topWorstSite.name})`,
      description: `${stats.topWorstSite.name} generated ${stats.topWorstSite.downtime.toFixed(1)} cumulative downtime hours (${share}% of period total).`,
      metricImpact: `${stats.topWorstSite.downtime.toFixed(1)} hrs down`,
      recommendation: 'Deploy priority field technician to inspect site rectifier, CP meter, and DG fuel line.'
    });
  }

  // Anomaly 2: Top Root Cause category
  if (stats.topCategory && stats.topCategory !== 'None') {
    facts.push({
      id: 'fact-category',
      type: 'warning',
      title: `Dominant Root Cause: ${stats.topCategory}`,
      description: `${stats.topCategory} represents the highest impact failure mode in monitored C4 MBUs.`,
      metricImpact: `Leading Outage Driver`,
      recommendation: 'Conduct grid quality audit and schedule fuel replenishment cycles before peak load.'
    });
  }

  // Fact 3: SLA Status
  if (stats.overallAvailability >= 99.9) {
    facts.push({
      id: 'fact-sla-pass',
      type: 'positive',
      title: 'Four Nines SLA Target Maintained',
      description: `Overall network availability is performing at ${stats.overallAvailability}%, meeting Enfrashare SLA benchmark.`,
      metricImpact: `${stats.slaComplianceRate}% compliance`,
      recommendation: 'Maintain current proactive NOC monitoring protocol.'
    });
  } else {
    facts.push({
      id: 'fact-sla-breach',
      type: 'critical',
      title: 'SLA Availability Alert',
      description: `Period network availability is ${stats.overallAvailability}%, with average of ${stats.avgDowntimePerSite}h downtime per node.`,
      metricImpact: `-${(99.9 - stats.overallAvailability).toFixed(2)}% below target`,
      recommendation: 'Trigger automated escalation to regional cluster operations leads.'
    });
  }

  // Fact 4: MTTR Speed
  facts.push({
    id: 'fact-mttr',
    type: 'info',
    title: 'Mean Time to Repair (MTTR)',
    description: `Average turnaround time for clearing alarms is ${stats.mttrAverageHours} hours.`,
    metricImpact: `Avg ${Math.round(stats.mttrAverageHours * 60)} mins`,
    recommendation: 'Optimize spare inventory at central warehouses to accelerate critical fiber & DG swaps.'
  });

  return facts;
}

export function simulateWhatIf(records: OutageRecord[], fixedCount: number): {
  simulatedAvailability: number;
  downtimeSaved: number;
  newCompliance: number;
} {
  if (!records || records.length === 0) {
    return { simulatedAvailability: 100, downtimeSaved: 0, newCompliance: 100 };
  }

  // Group by site
  const siteMap: Record<string, number> = {};
  records.forEach(r => {
    siteMap[r.siteId] = (siteMap[r.siteId] || 0) + r.downtimeHours;
  });

  const sortedSites = Object.entries(siteMap).sort((a, b) => b[1] - a[1]);
  const topFixedSiteIds = new Set(sortedSites.slice(0, fixedCount).map(([id]) => id));

  let totalSaved = 0;
  const simulatedRecords = records.map(r => {
    if (topFixedSiteIds.has(r.id) || topFixedSiteIds.has(r.siteId)) {
      totalSaved += r.downtimeHours;
      return {
        ...r,
        downtimeHours: 0,
        availability: 99.99
      };
    }
    return r;
  });

  const newStats = calculateTelecomStats(simulatedRecords);
  return {
    simulatedAvailability: newStats.overallAvailability,
    downtimeSaved: Number(totalSaved.toFixed(1)),
    newCompliance: newStats.slaComplianceRate
  };
}
