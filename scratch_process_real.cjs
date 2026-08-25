const XLSX = require('./node_modules/xlsx');
const fs = require('fs');

const wb = XLSX.readFile('./C4 Overall Performance Aug-2026 (1).xlsx');

// Load sheets
const rslSheet = wb.Sheets['Consolidated RSL Aug-26'];
const siteWiseSheet = wb.Sheets['SiteWiseDT'];
const narDaySheet = wb.Sheets['Site NAR-Day'];
const dateWiseSheet = wb.Sheets['DateWiseDT'];

const rslRows = XLSX.utils.sheet_to_json(rslSheet);
const siteWiseRows = XLSX.utils.sheet_to_json(siteWiseSheet);
const narDayRows = XLSX.utils.sheet_to_json(narDaySheet);
const dateWiseRows = XLSX.utils.sheet_to_json(dateWiseSheet);

console.log('Total raw RSL rows:', rslRows.length);
console.log('SiteWiseDT rows:', siteWiseRows.length);
console.log('Site NAR-Day rows:', narDayRows.length);
console.log('DateWiseDT rows:', dateWiseRows.length);

// Helper for excel date conversion
function excelDateToDateStr(excelDate) {
  if (!excelDate) return '2026-08-01';
  const num = typeof excelDate === 'number' ? excelDate : parseFloat(excelDate);
  if (isNaN(num)) return '2026-08-01';
  const jsDate = new Date((num - 25569) * 86400 * 1000);
  const y = jsDate.getUTCFullYear();
  const m = String(jsDate.getUTCMonth() + 1).padStart(2, '0');
  const d = String(jsDate.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 1. Identify the Deodar sites from RSL sheet
// A site is a Deodar site if it has at least one row with Deodar/NonDeodar as 'Deodar'
const deodarSiteCodes = new Set();
rslRows.forEach(row => {
  const isDeodar = String(row['Deodar/NonDeodar'] || '').toLowerCase().trim() === 'deodar';
  if (isDeodar) {
    const siteCode = String(row['SiteCode'] || row['Code'] || '').trim().toLowerCase();
    if (siteCode) deodarSiteCodes.add(siteCode);
  }
});
console.log('Unique Deodar site codes:', deodarSiteCodes.size);

// 2. Filter RSL rows to keep only Deodar rows
const deodarRslRows = rslRows.filter(row => {
  const siteCode = String(row['SiteCode'] || row['Code'] || '').trim().toLowerCase();
  return deodarSiteCodes.has(siteCode);
});
console.log('Filtered RSL Deodar rows:', deodarRslRows.length);

// Map Site Code to its SiteWiseDT and Site NAR-Day info
const siteWiseMap = {};
siteWiseRows.forEach(row => {
  const code = String(row['Site Code'] || '').trim().toLowerCase();
  if (code) {
    siteWiseMap[code] = row;
  }
});

const narDayMap = {};
narDayRows.forEach(row => {
  const code = String(row['Site Code'] || '').trim().toLowerCase();
  if (code) {
    narDayMap[code] = row;
  }
});

// Map Excel Date to DateWiseDT row
const dateWiseMap = {};
dateWiseRows.forEach(row => {
  const mbuVal = row['MBU'];
  if (mbuVal) {
    const dateStr = excelDateToDateStr(mbuVal);
    dateWiseMap[dateStr] = row;
  }
});

const siteMap = {};
const reasonMap = {};
const mbuMap = {};
const dailyTimelineMap = {};
let totalDowntimeHours = 0;

const allIncidents = [];

deodarRslRows.forEach((row, i) => {
  const siteCodeRaw = String(row['SiteCode'] || row['Code'] || 'UNKNOWN').trim();
  const siteCode = siteCodeRaw.toLowerCase();
  const rawSiteName = String(row['Site'] || siteCodeRaw);
  const siteName = rawSiteName.replace(/^[A-Z0-9]+__S_/, '').replace(/^[A-Z0-9]+_H_/, '').replace(/_/g, ' ');
  const mbu = String(row['MBU#'] || row['Region'] || 'C4-GUJ-01').trim();
  
  // DT is in minutes, convert to hours!
  const dtRaw = parseFloat(row['DT']) || 0;
  const dtHours = dtRaw / 60;
  
  const reason = String(row['Reasons'] || row['Reason Category'] || 'Commercial Power Grid').trim();
  const category = String(row['Reason Category'] || row['General'] || 'Grid Power').trim();
  const dateStr = excelDateToDateStr(row['Occurring']);
  const vendor = String(row['Vendor'] || 'Huawei');
  const siteType = String(row['SiteType'] || 'Macro');
  const priority = String(row['Priority'] || 'General');

  // Build site map
  if (!siteMap[siteCode]) {
    // Get pre-calculated values if they exist
    const swRow = siteWiseMap[siteCode] || {};
    const ndRow = narDayMap[siteCode] || {};
    
    // Fallback computed availability if not in SiteWiseDT
    const cells = parseInt(row['NoofCells'] || row['Cells'] || 3);
    const fallbackAvail = 99.0;
    
    const excelAvail = swRow['Total NAR'] !== undefined ? parseFloat(swRow['Total NAR']) * 100 : fallbackAvail;
    const excelDtHours = swRow['TDT'] !== undefined ? parseFloat(swRow['TDT']) / 60 : 0;

    siteMap[siteCode] = {
      siteCode: siteCodeRaw,
      siteName,
      mbu,
      vendor,
      siteType,
      priority,
      totalDtHours: excelDtHours,
      incidentCount: 0,
      availability: Number(excelAvail.toFixed(2)),
      reasons: {},
      dailyDt: {}
    };
  }
  siteMap[siteCode].incidentCount += 1;
  siteMap[siteCode].reasons[reason] = (siteMap[siteCode].reasons[reason] || 0) + dtHours;
  siteMap[siteCode].dailyDt[dateStr] = (siteMap[siteCode].dailyDt[dateStr] || 0) + dtHours;

  // Reason Map
  if (!reasonMap[reason]) {
    reasonMap[reason] = { reason, category, totalDtHours: 0, incidentCount: 0 };
  }
  reasonMap[reason].totalDtHours += dtHours;
  reasonMap[reason].incidentCount += 1;

  // MBU Map (temp holder, we will compute final metrics later)
  if (!mbuMap[mbu]) {
    mbuMap[mbu] = { mbu, totalDtHours: 0, incidentCount: 0, siteCount: new Set(), availSum: 0 };
  }
  mbuMap[mbu].totalDtHours += dtHours;
  mbuMap[mbu].incidentCount += 1;
  mbuMap[mbu].siteCount.add(siteCode);

  // Daily map
  if (!dailyTimelineMap[dateStr]) {
    dailyTimelineMap[dateStr] = { date: dateStr, totalDtHours: 0, incidentCount: 0, mbus: {} };
  }
  dailyTimelineMap[dateStr].totalDtHours += dtHours;
  dailyTimelineMap[dateStr].incidentCount += 1;
  dailyTimelineMap[dateStr].mbus[mbu] = (dailyTimelineMap[dateStr].mbus[mbu] || 0) + dtHours;

  if (i < 3000) {
    const swRow = siteWiseMap[siteCode] || {};
    const excelAvail = swRow['Total NAR'] !== undefined ? parseFloat(swRow['Total NAR']) * 100 : 99.0;
    allIncidents.push({
      id: `RSL-${i + 1}`,
      siteId: siteCodeRaw,
      siteName: siteName,
      region: mbu,
      downtimeHours: Number(dtHours.toFixed(2)),
      availability: Number(excelAvail.toFixed(2)),
      timestamp: dateStr,
      category: category,
      status: dtHours > 8 ? 'Active' : 'Resolved',
      slaTarget: 99.90,
      rootCause: reason,
      mttrMinutes: Math.round(dtRaw)
    });
  }
});

// Format Sites catalog
const allSitesCatalog = Object.values(siteMap).map(s => {
  const topReasonsList = Object.entries(s.reasons)
    .map(([r, h]) => ({ reason: r, hours: Number(h.toFixed(1)) }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 3);
  
  // Construct daily timeline with real NAR from Site NAR-Day
  const ndRow = narDayMap[s.siteCode.toLowerCase()] || {};
  const dailyTimeline = Object.entries(s.dailyDt).map(([d, h]) => {
    const dayNum = parseInt(d.split('-')[2] || '1', 10);
    const dayKey = `${dayNum}-Aug`;
    const excelDailyNar = ndRow[dayKey] !== undefined ? parseFloat(ndRow[dayKey]) * 100 : 100;
    return {
      date: d,
      hours: Number(h.toFixed(1)),
      narPercent: Number(excelDailyNar.toFixed(2))
    };
  });

  return {
    siteCode: s.siteCode,
    siteName: s.siteName,
    mbu: s.mbu,
    vendor: s.vendor,
    siteType: s.siteType,
    priority: s.priority,
    totalDtHours: Number(s.totalDtHours.toFixed(1)),
    incidentCount: s.incidentCount,
    availability: s.availability,
    topReasons: topReasonsList,
    dailyTimeline: dailyTimeline.sort((a, b) => a.date.localeCompare(b.date))
  };
}).sort((a, b) => b.totalDtHours - a.totalDtHours);

// Calculate MBU average availability from site availabilities
allSitesCatalog.forEach(s => {
  if (mbuMap[s.mbu]) {
    mbuMap[s.mbu].availSum += s.availability;
  }
});

const mbuFormatted = Object.entries(mbuMap).map(([mbu, data]) => {
  const avgAvail = data.siteCount.size > 0 ? (data.availSum / data.siteCount.size) : 100;
  return {
    mbu,
    totalDtHours: Number((data.totalDtHours).toFixed(1)),
    incidentCount: data.incidentCount,
    siteCount: data.siteCount.size,
    avgAvailability: Number(avgAvail.toFixed(2))
  };
}).sort((a, b) => b.totalDtHours - a.totalDtHours);

// Format Top Reasons
const reasonsFormatted = Object.values(reasonMap).map(r => ({
  reason: r.reason,
  category: r.category,
  totalDtHours: Number(r.totalDtHours.toFixed(1)),
  incidentCount: r.incidentCount
})).sort((a, b) => b.totalDtHours - a.totalDtHours);

// Format Daily Timeline with MBU NAR or default
const dailyFormatted = Object.values(dailyTimelineMap).map(d => {
  // Try to find NAR from DateWiseDT
  const dwRow = dateWiseMap[d.date] || {};
  
  // Calculate average daily NAR across all MBUs in DateWiseDT
  let narPercent = 99.85;
  const mbuAvails = [];
  Object.keys(dwRow).forEach(k => {
    if (k.startsWith('C4-')) {
      const val = parseFloat(dwRow[k]);
      if (!isNaN(val)) {
        mbuAvails.push(val * 100);
      }
    }
  });
  if (mbuAvails.length > 0) {
    narPercent = mbuAvails.reduce((sum, v) => sum + v, 0) / mbuAvails.length;
  }

  return {
    date: d.date,
    totalDtHours: Number(d.totalDtHours.toFixed(1)),
    incidentCount: d.incidentCount,
    narPercent: Number(narPercent.toFixed(2)),
    mbus: d.mbus
  };
}).sort((a, b) => a.date.localeCompare(b.date));

// Calculate Overall Summary Availability as the average of Deodar sites
const sumAvail = allSitesCatalog.reduce((sum, s) => sum + s.availability, 0);
const avgAvail = allSitesCatalog.length > 0 ? (sumAvail / allSitesCatalog.length) : 100;

// Total downtime hours is the sum of site downtimes
const totalSitesDowntimeHours = allSitesCatalog.reduce((sum, s) => sum + s.totalDtHours, 0);

const exportData = {
  summary: {
    totalRawRecords: deodarRslRows.length,
    totalDowntimeHours: Number(totalSitesDowntimeHours.toFixed(1)),
    totalSites: allSitesCatalog.length,
    avgAvailability: Number(avgAvail.toFixed(2))
  },
  allSites: allSitesCatalog,
  topReasons: reasonsFormatted,
  mbuBreakdown: mbuFormatted,
  dailyTimeline: dailyFormatted,
  sampleIncidents: allIncidents
};

fs.writeFileSync('./src/utils/realEngroData.json', JSON.stringify(exportData, null, 2));
console.log(`Successfully compiled Deodar-only catalog for ${allSitesCatalog.length} sites into realEngroData.json!`);
