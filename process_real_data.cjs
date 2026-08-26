const fs = require('fs');
const XLSX = require('xlsx');

console.log('Loading Excel workbook...');
const workbook = XLSX.readFile('C4 Overall Performance Aug-2026.xlsx');

const rslRows = XLSX.utils.sheet_to_json(workbook.Sheets['Consolidated RSL Aug-26'], { defval: '' });
const siteWiseRows = XLSX.utils.sheet_to_json(workbook.Sheets['SiteWiseDT'], { defval: '' });
const narDayRows = XLSX.utils.sheet_to_json(workbook.Sheets['Site NAR-Day'], { defval: '' });
const dateWiseRows = XLSX.utils.sheet_to_json(workbook.Sheets['DateWiseDT'], { defval: '' });
const hist2gRows = XLSX.utils.sheet_to_json(workbook.Sheets['2G Site Month Wise History'], { defval: '' });
const cbRows = XLSX.utils.sheet_to_json(workbook.Sheets['4G CounterBased Site Wise'], { defval: '' });

console.log('Loaded rows - RSL:', rslRows.length, 'SiteWise:', siteWiseRows.length, 'NAR-Day:', narDayRows.length);

// 1. Identify Deodar Site Codes (Union of 4G sheet and RSL status)
const deodarCodes = new Set();

// From RSL sheet
rslRows.forEach(row => {
  const val = String(row['Deodar/NonDeodar'] || '').trim().toLowerCase();
  if (val === 'deodar' || val === 'force-majure-deodar') {
    const code = String(row['SiteCode'] || row['Code'] || '').trim().toLowerCase();
    if (code) deodarCodes.add(code);
  }
});

// From 4G sheet
cbRows.forEach(row => {
  const omoColoc = String(row['OMO Colocation'] || '').trim().toLowerCase();
  const omoHost = String(row['OMO host name '] || '').trim().toLowerCase();
  const category = String(row['Category'] || '').trim().toLowerCase();
  if (omoColoc === 'deodar' || omoHost === 'deodar' || category === 'deodar cp prime') {
    const code = String(row['SiteCode'] || '').trim().toLowerCase();
    if (code) deodarCodes.add(code);
  }
});

console.log(`Identified ${deodarCodes.size} total Deodar site codes.`);

// 2. Clean Site Name helper
function cleanSiteName(rawName, siteCode) {
  let name = rawName.trim();
  const codeRegex = new RegExp('^' + siteCode + '[_ ]*', 'i');
  name = name.replace(codeRegex, '');
  name = name.replace(/^([S|H|T|D]__?|__?)/i, '');
  name = name.replace(/_/g, ' ');

  name = name.replace(/\((zong|telenor|ufone|cmpak|djuice)[_ ]?[a-z0-9-]+\)/ig, '');
  name = name.replace(/\([a-z]{2,4}[_-]?\d+\)/ig, '');
  name = name.replace(/\b(zong|telenor|ufone|cmpak|djuice)[_ ]?[a-z0-9-]+\b/ig, '');
  name = name.replace(/\b[A-Z]{2,4}[_-]?\d+\b/g, '');

  name = name.replace(/\s+/g, ' ');
  name = name.replace(/[-\s_]+$/, '');
  name = name.trim();
  return name || siteCode;
}

// 3. Date mapping helper
function buildHeaderDateMap(headers) {
  const dateMap = {}; // YYYY-MM-DD -> header key
  headers.forEach(h => {
    if (h === undefined || h === null) return;
    let day = null;
    const str = String(h).trim();
    
    // Check if numeric serial date (e.g. 46235)
    if (!isNaN(str) && parseFloat(str) > 40000 && parseFloat(str) < 50000) {
      const serial = parseFloat(str);
      const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
      day = date.getUTCDate();
    } else {
      // Check if matches e.g. "1-Aug", "17-Aug"
      const m = str.match(/^(\d+)-(Aug|Sep|Oct|Nov|Dec|Jan|Feb|Mar|Apr|May|Jun|Jul)(-\d+)?$/i);
      if (m) {
        day = parseInt(m[1], 10);
      }
    }
    
    if (day !== null && day >= 1 && day <= 31) {
      dateMap[`2026-08-${String(day).padStart(2, '0')}`] = h;
    }
  });
  return dateMap;
}

// Build date maps from keys of first rows
const ndKeys = Object.keys(narDayRows[0] || {});
const swKeys = Object.keys(siteWiseRows[0] || {});
const ndDateMap = buildHeaderDateMap(ndKeys);
const swDateMap = buildHeaderDateMap(swKeys);

console.log('NAR-Day keys mapped:', Object.keys(ndDateMap).length, 'Sample:', Object.entries(ndDateMap).slice(0, 3));
console.log('SiteWiseDT keys mapped:', Object.keys(swDateMap).length, 'Sample:', Object.entries(swDateMap).slice(0, 3));

// Find max occurred date in Consolidated RSL Aug-26 to cap timeline (removing mock dates)
let rslMaxDate = '2026-08-01';
rslRows.forEach(row => {
  if (row['Occurring']) {
    const d = excelSerialToDateStr(parseFloat(row['Occurring']));
    if (d.startsWith('2026-08') && d > rslMaxDate) {
      rslMaxDate = d;
    }
  }
});

// Determine active date range based on columns with data, capped at RSL max date
const activeDates = Object.keys(ndDateMap).filter(d => d <= rslMaxDate).sort();
const maxDate = activeDates[activeDates.length - 1] || rslMaxDate;
const dateRange = [];
const maxDayNum = parseInt(maxDate.split('-')[2], 10);
for (let d = 1; d <= maxDayNum; d++) {
  dateRange.push(`2026-08-${String(d).padStart(2, '0')}`);
}
console.log(`Active date range capped at RSL max date: ${dateRange[0]} to ${maxDate} (${dateRange.length} days)`);

// 4. Build Lookup Maps
const siteWiseMap = {};
siteWiseRows.forEach(row => {
  const code = String(row['Site Code'] || '').trim().toLowerCase();
  if (code) siteWiseMap[code] = row;
});

const hist2gMap = {};
hist2gRows.forEach(row => {
  const code = String(row['Site Code'] || '').trim().toLowerCase();
  if (code) hist2gMap[code] = row;
});

// 5. Filter NAR-Day rows to Deodar sites only
const deodarNarDayRows = narDayRows.filter(row => {
  const code = String(row['Site Code'] || '').trim().toLowerCase();
  return deodarCodes.has(code);
});
console.log(`Filtered ${deodarNarDayRows.length} Deodar sites from Site NAR-Day.`);

// 6. Build the Site Catalog
const allSitesCatalog = deodarNarDayRows.map(row => {
  const siteCode = String(row['Site Code'] || '').trim();
  const siteCodeLower = siteCode.toLowerCase();
  const rawSiteName = String(row['Site Name'] || siteCode);
  const siteName = cleanSiteName(rawSiteName, siteCode);
  
  const mbu = String(row['New MBU'] || 'C4-GUJ-01').trim();
  const vendor = String(row['OMO Host Name'] || 'Huawei').trim();
  const swRow = siteWiseMap[siteCodeLower] || {};
  
  const siteType = String(swRow['Type'] || 'Macro').trim();
  const priority = String(swRow['Priority'] || 'General').trim();
  
  // Total downtime hours
  const tdtMinutes = parseFloat(swRow['TDT']) || 0;
  const totalDtHours = Number((tdtMinutes / 60).toFixed(1));
  
  // Overall NAR availability
  const narVal = parseFloat(row['Average NAR'] || row['avrg']) || 1.0;
  const availability = Number((narVal * 100).toFixed(2));
  
  // Build daily timeline
  const dailyTimeline = dateRange.map(dateStr => {
    const narKey = ndDateMap[dateStr];
    const dtKey = swDateMap[dateStr];
    
    const dayNarVal = row[narKey];
    const narPercent = dayNarVal !== undefined && dayNarVal !== '' 
      ? Number((parseFloat(dayNarVal) * 100).toFixed(2)) : 100;
      
    const dayDtVal = swRow[dtKey];
    const hours = dayDtVal !== undefined && dayDtVal !== ''
      ? Number((parseFloat(dayDtVal) / 60).toFixed(1)) : 0;
      
    return { date: dateStr, hours, narPercent };
  });

  // Extract 6-month history from 2G sheet
  const histRow = hist2gMap[siteCodeLower];
  const nar6Months = [];
  if (histRow) {
    const mappings = [
      { narKey: 'Feb NAR',       monthKey: '2026-02', label: 'Feb 2026' },
      { narKey: 'Mar NAR',       monthKey: '2026-03', label: 'Mar 2026' },
      { narKey: 'April NAR_1',   monthKey: '2026-04', label: 'Apr 2026' },
      { narKey: 'May NAR_1',     monthKey: '2026-05', label: 'May 2026' },
      { narKey: 'June NAR 2026', monthKey: '2026-06', label: 'Jun 2026' },
      { narKey: 'Jul NAR 2026',  monthKey: '2026-07', label: 'Jul 2026' },
    ];
    mappings.forEach(m => {
      const val = histRow[m.narKey];
      if (val !== undefined && val !== '' && !isNaN(val)) {
        nar6Months.push({
          monthKey: m.monthKey,
          monthLabel: m.label,
          narPercent: Number((parseFloat(val) * 100).toFixed(2)),
          totalDowntimeHours: 0,
          totalAlarms: 0
        });
      }
    });
  }

  // Top reasons from RSL sheet for this site
  const siteIncidents = rslRows.filter(r => String(r['SiteCode'] || r['Code'] || '').trim().toLowerCase() === siteCodeLower);
  const reasonsMap = {};
  siteIncidents.forEach(r => {
    const reason = String(r['Reasons'] || r['Reason Category'] || 'Commercial Power Grid').trim();
    const dt = parseFloat(r['DT']) || 0;
    reasonsMap[reason] = (reasonsMap[reason] || 0) + (dt / 60);
  });
  
  const topReasons = Object.entries(reasonsMap)
    .map(([reason, hours]) => ({ reason, hours: Number(hours.toFixed(1)) }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 3);

  return {
    siteCode,
    siteName,
    mbu,
    vendor,
    siteType,
    priority,
    totalDtHours,
    incidentCount: siteIncidents.length,
    availability,
    nar6Months,
    topReasons,
    dailyTimeline
  };
}).sort((a, b) => b.totalDtHours - a.totalDtHours);

// 7. Calculate Global Summaries & timelines
const mbuMap = {};
const dailyTimelineMap = {};
const reasonsMapGlobal = {};
const allIncidents = [];

// Initialize daily map
dateRange.forEach(d => {
  dailyTimelineMap[d] = { date: d, totalDtHours: 0, incidentCount: 0, narPercentSum: 0, siteCount: 0, mbus: {} };
});

// Accumulate site daily timelines into global
allSitesCatalog.forEach(s => {
  // MBU Accumulation
  if (!mbuMap[s.mbu]) {
    mbuMap[s.mbu] = { mbu: s.mbu, totalDtHours: 0, incidentCount: 0, siteCount: 0, availSum: 0 };
  }
  mbuMap[s.mbu].totalDtHours += s.totalDtHours;
  mbuMap[s.mbu].incidentCount += s.incidentCount;
  mbuMap[s.mbu].siteCount++;
  mbuMap[s.mbu].availSum += s.availability;

  // Daily timeline accumulation
  s.dailyTimeline.forEach(day => {
    const globalDay = dailyTimelineMap[day.date];
    if (globalDay) {
      globalDay.totalDtHours += day.hours;
      globalDay.narPercentSum += day.narPercent;
      globalDay.siteCount++;
      globalDay.mbus[s.mbu] = (globalDay.mbus[s.mbu] || 0) + day.hours;
    }
  });

  // Top reasons global accumulation
  s.topReasons.forEach(r => {
    reasonsMapGlobal[r.reason] = (reasonsMapGlobal[r.reason] || 0) + r.hours;
  });
});

// Format MBU breakdowns
const mbuBreakdown = Object.values(mbuMap).map(m => ({
  mbu: m.mbu,
  totalDtHours: Number(m.totalDtHours.toFixed(1)),
  incidentCount: m.incidentCount,
  siteCount: m.siteCount,
  avgAvailability: Number((m.availSum / m.siteCount).toFixed(2))
})).sort((a, b) => b.totalDtHours - a.totalDtHours);

// Format daily timelines
const dailyTimeline = dateRange.map(dateStr => {
  const d = dailyTimelineMap[dateStr];
  return {
    date: dateStr,
    totalDtHours: Number(d.totalDtHours.toFixed(1)),
    incidentCount: d.incidentCount,
    narPercent: Number((d.narPercentSum / d.siteCount).toFixed(2)),
    mbus: d.mbus
  };
});

// Format reasons
const topReasons = Object.entries(reasonsMapGlobal).map(([reason, hours]) => ({
  reason,
  category: reason,
  totalDtHours: Number(hours.toFixed(1)),
  incidentCount: 0 // Will accumulate from RSL below
})).sort((a, b) => b.totalDtHours - a.totalDtHours);

// Format sample incidents for Deodar sites only (limit to 3000 to keep JSON small)
let incidentIdx = 0;
rslRows.forEach(row => {
  const code = String(row['SiteCode'] || row['Code'] || '').trim().toLowerCase();
  if (deodarCodes.has(code) && incidentIdx < 3000) {
    const siteCodeRaw = String(row['SiteCode'] || row['Code'] || 'UNKNOWN').trim();
    const rawSiteName = String(row['Site'] || siteCodeRaw);
    const siteName = cleanSiteName(rawSiteName, siteCodeRaw);
    const mbu = String(row['MBU#'] || row['Region'] || 'C4-GUJ-01').trim();
    const dtRaw = parseFloat(row['DT']) || 0;
    const dtHours = dtRaw / 60;
    const reason = String(row['Reasons'] || row['Reason Category'] || 'Commercial Power Grid').trim();
    const category = String(row['Reason Category'] || row['General'] || 'Grid Power').trim();
    const dateStr = excelSerialToDateStr(parseFloat(row['Occurring']));
    
    // Accumulate incident count in global reasons
    const globalReason = topReasons.find(r => r.reason === reason);
    if (globalReason) globalReason.incidentCount++;

    allIncidents.push({
      id: `RSL-${incidentIdx + 1}`,
      siteId: siteCodeRaw,
      siteName,
      region: mbu,
      downtimeHours: Number(dtHours.toFixed(2)),
      availability: 99.0, // placeholder
      timestamp: dateStr,
      category,
      status: dtHours > 8 ? 'Active' : 'Resolved',
      slaTarget: 99.90,
      rootCause: reason,
      mttrMinutes: Math.round(dtRaw)
    });
    incidentIdx++;
  }
});

// Helper: Excel serial conversion
function excelSerialToDateStr(val) {
  if (isNaN(val)) return '2026-08-01';
  const date = new Date(Math.round((val - 25569) * 86400 * 1000));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

const sumAvail = allSitesCatalog.reduce((sum, s) => sum + s.availability, 0);
const avgAvail = allSitesCatalog.length > 0 ? (sumAvail / allSitesCatalog.length) : 100;
const totalSitesDowntimeHours = allSitesCatalog.reduce((sum, s) => sum + s.totalDtHours, 0);

const exportData = {
  summary: {
    totalRawRecords: allIncidents.length,
    totalDowntimeHours: Number(totalSitesDowntimeHours.toFixed(1)),
    totalSites: allSitesCatalog.length,
    avgAvailability: Number(avgAvail.toFixed(2))
  },
  allSites: allSitesCatalog,
  topReasons,
  mbuBreakdown,
  dailyTimeline,
  sampleIncidents: allIncidents
};

fs.writeFileSync('./src/utils/realEngroData.json', JSON.stringify(exportData, null, 2));

console.log('\n=======================================');
console.log('SUCCESS: JSON compilation complete!');
console.log(`Total Deodar sites compiled: ${allSitesCatalog.length}`);
console.log(`Global Avg Availability: ${avgAvail.toFixed(2)}%`);
console.log(`Global Total Downtime: ${totalSitesDowntimeHours.toFixed(1)} hrs`);
console.log(`Timeline Days: ${dailyTimeline.length}`);
console.log('=======================================');
