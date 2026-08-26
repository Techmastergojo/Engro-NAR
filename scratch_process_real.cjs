const fs = require('fs');
const XLSX = require('xlsx');

console.log('Loading Excel workbook...');
const workbook = XLSX.readFile('C4 Overall Performance Aug-2026.xlsx');

const rslRows = XLSX.utils.sheet_to_json(workbook.Sheets['Consolidated RSL Aug-26'], { defval: '' });
const siteWiseRows = XLSX.utils.sheet_to_json(workbook.Sheets['SiteWiseDT'], { defval: '' });
const narDayRows = XLSX.utils.sheet_to_json(workbook.Sheets['Site NAR-Day'], { defval: '' });
const dateWiseRows = XLSX.utils.sheet_to_json(workbook.Sheets['DateWiseDT'], { defval: '' });
const hist2gRows = XLSX.utils.sheet_to_json(workbook.Sheets['2G Site Month Wise History'], { defval: '' });

console.log('Loaded RSL:', rslRows.length, 'SiteWiseDT:', siteWiseRows.length,
  'NARDay:', narDayRows.length, 'DateWiseDT:', dateWiseRows.length, '2G History:', hist2gRows.length);

// --- Helpers ---

// Convert Excel serial date to YYYY-MM-DD
function excelDateToDateStr(val) {
  if (val === undefined || val === null || val === '') return '2026-08-01';
  if (typeof val === 'number') {
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  }
  const str = String(val).trim();
  if (str.includes(' ')) return str.split(' ')[0];
  const num = parseFloat(str);
  if (!isNaN(num) && num > 40000 && num < 50000) return excelDateToDateStr(num);
  return str;
}

// Get day number from YYYY-MM-DD string
function dayFromDateStr(dateStr) {
  return parseInt(dateStr.split('-')[2], 10);
}

// Build the key like "1-Aug", "15-Aug" from a date string
function dateStrToAugKey(dateStr) {
  const day = dayFromDateStr(dateStr);
  return `${day}-Aug`;
}

// Look up NAR value from Site NAR-Day row using "1-Aug" style keys
function getNarDayValue(narDayRow, dateStr) {
  const key = dateStrToAugKey(dateStr);
  const val = narDayRow[key];
  if (val !== undefined && val !== '' && !isNaN(val)) {
    return parseFloat(val);
  }
  return undefined;
}

// Look up DT value from SiteWiseDT row using "1-Aug" style keys
function getSiteWiseDtValue(swRow, dateStr) {
  const key = dateStrToAugKey(dateStr);
  const val = swRow[key];
  if (val !== undefined && val !== '' && !isNaN(val)) {
    return parseFloat(val);
  }
  return 0;
}

function cleanSiteName(rawName, siteCode) {
  let name = rawName.trim();
  
  // Remove site code prefix, e.g. GJR1058__
  const codeRegex = new RegExp('^' + siteCode + '[_ ]*', 'i');
  name = name.replace(codeRegex, '');
  
  // Strip common sub-prefixes like S_, H_, T_, D_ or double underscores
  name = name.replace(/^([S|H|T|D]__?|__?)/i, '');

  // Convert underscores to spaces first to avoid word boundary issues with \b
  name = name.replace(/_/g, ' ');

  // Remove parenthesized operator/generic ids, e.g. (Zong5218), (Telenor_LWR-001)
  name = name.replace(/\((zong|telenor|ufone|cmpak|djuice)[_ ]?[a-z0-9-]+\)/ig, '');
  name = name.replace(/\([a-z]{2,4}[_-]?\d+\)/ig, '');
  
  // Remove non-parenthesized operator ids, e.g. CMPak4330, Ufone1362
  name = name.replace(/\b(zong|telenor|ufone|cmpak|djuice)[_ ]?[a-z0-9-]+\b/ig, '');
  
  // Match any leftover uppercase patterns of letters followed by numbers, e.g., GJ4165, MDSK4280, MDIK4147
  name = name.replace(/\b[A-Z]{2,4}[_-]?\d+\b/g, '');

  // Clean spaces and trailing separators
  name = name.replace(/\s+/g, ' ');
  name = name.replace(/[-\s_]+$/, '');
  name = name.trim();
  
  return name || siteCode;
}

// Extract 6-month NAR history from 2G Site Month Wise History
function extract6MonthNar(histRow) {
  if (!histRow) return [];
  
  // Map of month keys -> { monthKey, monthLabel }
  // We want the most recent 6 months ending at July 2026
  const monthMappings = [
    { narKey: 'Feb NAR',        monthKey: '2026-02', label: 'Feb 2026' },
    { narKey: 'Mar NAR',        monthKey: '2026-03', label: 'Mar 2026' },
    { narKey: 'April NAR_1',    monthKey: '2026-04', label: 'Apr 2026' },
    { narKey: 'May NAR_1',      monthKey: '2026-05', label: 'May 2026' },
    { narKey: 'June NAR 2026',  monthKey: '2026-06', label: 'Jun 2026' },
    { narKey: 'Jul NAR 2026',   monthKey: '2026-07', label: 'Jul 2026' },
  ];

  const results = [];
  for (const m of monthMappings) {
    const val = histRow[m.narKey];
    if (val !== undefined && val !== '' && !isNaN(val)) {
      const narPercent = parseFloat(val) * 100;
      results.push({
        monthKey: m.monthKey,
        monthLabel: m.label,
        narPercent: Number(narPercent.toFixed(2)),
        totalDowntimeHours: 0,
        totalAlarms: 0
      });
    }
  }
  return results;
}

// --- Build lookup maps ---

// SiteWiseDT map: site code -> row
const siteWiseMap = {};
siteWiseRows.forEach(row => {
  const code = String(row['Site Code'] || '').trim().toLowerCase();
  if (code) siteWiseMap[code] = row;
});

// Site NAR-Day map: site code -> row
const narDayMap = {};
narDayRows.forEach(row => {
  const code = String(row['Site Code'] || '').trim().toLowerCase();
  if (code) narDayMap[code] = row;
});

// 2G History map: site code -> row
const hist2gMap = {};
hist2gRows.forEach(row => {
  const code = String(row['Site Code'] || '').trim().toLowerCase();
  if (code) hist2gMap[code] = row;
});

// DateWiseDT map: date string -> row
const dateWiseMap = {};
dateWiseRows.forEach(row => {
  const mbuVal = row['MBU'];
  if (mbuVal) {
    const dateStr = excelDateToDateStr(mbuVal);
    dateWiseMap[dateStr] = row;
  }
});

// --- Identify Deodar sites ---
const deodarSiteCodes = new Set();
rslRows.forEach(row => {
  if (String(row['Deodar/NonDeodar'] || '').toLowerCase().trim() === 'deodar') {
    const code = String(row['SiteCode'] || row['Code'] || '').trim().toLowerCase();
    if (code) deodarSiteCodes.add(code);
  }
});
console.log('Unique Deodar site codes:', deodarSiteCodes.size);

const deodarRslRows = rslRows.filter(row => {
  const code = String(row['SiteCode'] || row['Code'] || '').trim().toLowerCase();
  return deodarSiteCodes.has(code);
});
console.log('Filtered Deodar RSL incidents:', deodarRslRows.length);

// --- Determine all active dates in the dataset ---
// Find max date from RSL occurring dates
const allDatesSet = new Set();
deodarRslRows.forEach(row => {
  const dateStr = excelDateToDateStr(row['Occurring']);
  if (dateStr.startsWith('2026-08')) allDatesSet.add(dateStr);
});
const allDates = Array.from(allDatesSet).sort();
const maxDate = allDates[allDates.length - 1] || '2026-08-24';
console.log('Date range:', allDates[0], 'to', maxDate, `(${allDates.length} unique days)`);

// Generate full date range from Aug 01 to maxDate
const fullDateRange = [];
for (let d = 1; d <= dayFromDateStr(maxDate); d++) {
  fullDateRange.push(`2026-08-${String(d).padStart(2, '0')}`);
}
console.log('Full date range covers', fullDateRange.length, 'days');

// --- Build site map from RSL incidents ---
const siteMap = {};
const reasonMap = {};
const mbuMap = {};
const dailyTimelineMap = {};
const allIncidents = [];

deodarRslRows.forEach((row, i) => {
  const siteCodeRaw = String(row['SiteCode'] || row['Code'] || 'UNKNOWN').trim();
  const siteCode = siteCodeRaw.toLowerCase();
  const rawSiteName = String(row['Site'] || siteCodeRaw);
  const siteName = cleanSiteName(rawSiteName, siteCodeRaw);
  const mbu = String(row['MBU#'] || row['Region'] || 'C4-GUJ-01').trim();
  
  const dtRaw = parseFloat(row['DT']) || 0; // DT in minutes
  const dtHours = dtRaw / 60;
  
  const reason = String(row['Reasons'] || row['Reason Category'] || 'Commercial Power Grid').trim();
  const category = String(row['Reason Category'] || row['General'] || 'Grid Power').trim();
  const dateStr = excelDateToDateStr(row['Occurring']);
  const vendor = String(row['Vendor'] || 'Huawei');
  const siteType = String(row['SiteType'] || 'Macro');
  const priority = String(row['Priority'] || 'General');

  if (!siteMap[siteCode]) {
    const swRow = siteWiseMap[siteCode] || {};
    const ndRow = narDayMap[siteCode] || {};
    // NAR from Site NAR-Day 'Average NAR' column (primary), fallback to SiteWiseDT 'Total NAR'
    let totalNar = 99.0;
    if (ndRow['Average NAR'] !== undefined && ndRow['Average NAR'] !== '' && !isNaN(ndRow['Average NAR'])) {
      totalNar = parseFloat(ndRow['Average NAR']) * 100;
    } else if (swRow['Total NAR'] !== undefined && swRow['Total NAR'] !== '' && !isNaN(swRow['Total NAR'])) {
      totalNar = parseFloat(swRow['Total NAR']) * 100;
    }
    const totalDtMinutes = swRow['TDT'] !== undefined && swRow['TDT'] !== '' 
      ? parseFloat(swRow['TDT']) : 0;

    siteMap[siteCode] = {
      siteCode: siteCodeRaw,
      siteName,
      mbu,
      vendor,
      siteType,
      priority,
      totalDtHours: Number((totalDtMinutes / 60).toFixed(1)),
      incidentCount: 0,
      availability: Number(totalNar.toFixed(2)),
      reasons: {},
      dailyDtMinutes: {} // accumulate DT per day in minutes
    };
  }
  siteMap[siteCode].incidentCount += 1;
  siteMap[siteCode].reasons[reason] = (siteMap[siteCode].reasons[reason] || 0) + dtHours;
  siteMap[siteCode].dailyDtMinutes[dateStr] = (siteMap[siteCode].dailyDtMinutes[dateStr] || 0) + dtRaw;

  // Reason Map
  if (!reasonMap[reason]) {
    reasonMap[reason] = { reason, category, totalDtHours: 0, incidentCount: 0 };
  }
  reasonMap[reason].totalDtHours += dtHours;
  reasonMap[reason].incidentCount += 1;

  // MBU Map
  if (!mbuMap[mbu]) {
    mbuMap[mbu] = { mbu, totalDtHours: 0, incidentCount: 0, siteCount: new Set(), availSum: 0 };
  }
  mbuMap[mbu].totalDtHours += dtHours;
  mbuMap[mbu].incidentCount += 1;
  mbuMap[mbu].siteCount.add(siteCode);

  // Daily global map
  if (!dailyTimelineMap[dateStr]) {
    dailyTimelineMap[dateStr] = { date: dateStr, totalDtHours: 0, incidentCount: 0, mbus: {} };
  }
  dailyTimelineMap[dateStr].totalDtHours += dtHours;
  dailyTimelineMap[dateStr].incidentCount += 1;
  dailyTimelineMap[dateStr].mbus[mbu] = (dailyTimelineMap[dateStr].mbus[mbu] || 0) + dtHours;

  if (i < 3000) {
    allIncidents.push({
      id: `RSL-${i + 1}`,
      siteId: siteCodeRaw,
      siteName,
      region: mbu,
      downtimeHours: Number(dtHours.toFixed(2)),
      availability: siteMap[siteCode].availability,
      timestamp: dateStr,
      category,
      status: dtHours > 8 ? 'Active' : 'Resolved',
      slaTarget: 99.90,
      rootCause: reason,
      mttrMinutes: Math.round(dtRaw)
    });
  }
});

// --- Build complete site catalog with FULL daily timelines ---
const allSitesCatalog = Object.values(siteMap).map(s => {
  const topReasonsList = Object.entries(s.reasons)
    .map(([r, h]) => ({ reason: r, hours: Number(h.toFixed(1)) }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 3);

  const ndRow = narDayMap[s.siteCode.toLowerCase()] || {};
  const swRow = siteWiseMap[s.siteCode.toLowerCase()] || {};

  // Build FULL daily timeline for every day in the range
  const dailyTimeline = fullDateRange.map(dateStr => {
    // Get actual NAR from Site NAR-Day sheet (decimal -> %)
    const narVal = getNarDayValue(ndRow, dateStr);
    const narPercent = narVal !== undefined ? Number((narVal * 100).toFixed(2)) : 100;

    // Get DT from SiteWiseDT (in minutes)
    const dtMinutes = getSiteWiseDtValue(swRow, dateStr);
    const hours = Number((dtMinutes / 60).toFixed(1));

    return { date: dateStr, hours, narPercent };
  });

  // Get 6-month history from 2G sheet
  const histRow = hist2gMap[s.siteCode.toLowerCase()];
  const nar6Months = extract6MonthNar(histRow);

  return {
    siteCode: s.siteCode,
    siteName: s.siteName,
    mbu: s.mbu,
    vendor: s.vendor,
    siteType: s.siteType,
    priority: s.priority,
    totalDtHours: s.totalDtHours,
    incidentCount: s.incidentCount,
    availability: s.availability,
    nar6Months,
    topReasons: topReasonsList,
    dailyTimeline
  };
}).sort((a, b) => b.totalDtHours - a.totalDtHours);

// MBU availability
allSitesCatalog.forEach(s => {
  if (mbuMap[s.mbu]) mbuMap[s.mbu].availSum += s.availability;
});

const mbuFormatted = Object.entries(mbuMap).map(([mbu, data]) => {
  const avgAvail = data.siteCount.size > 0 ? (data.availSum / data.siteCount.size) : 100;
  return {
    mbu,
    totalDtHours: Number(data.totalDtHours.toFixed(1)),
    incidentCount: data.incidentCount,
    siteCount: data.siteCount.size,
    avgAvailability: Number(avgAvail.toFixed(2))
  };
}).sort((a, b) => b.totalDtHours - a.totalDtHours);

const reasonsFormatted = Object.values(reasonMap).map(r => ({
  reason: r.reason,
  category: r.category,
  totalDtHours: Number(r.totalDtHours.toFixed(1)),
  incidentCount: r.incidentCount
})).sort((a, b) => b.totalDtHours - a.totalDtHours);

// Build FULL daily timeline globally (fill missing days with 0)
const dailyFormatted = fullDateRange.map(dateStr => {
  const existing = dailyTimelineMap[dateStr];
  const dwRow = dateWiseMap[dateStr] || {};
  
  // Calculate NAR from DateWiseDT MBU columns
  let narPercent = 99.85;
  const mbuAvails = [];
  Object.keys(dwRow).forEach(k => {
    if (k.startsWith('C4-')) {
      const val = parseFloat(dwRow[k]);
      if (!isNaN(val)) mbuAvails.push(val * 100);
    }
  });
  if (mbuAvails.length > 0) {
    narPercent = mbuAvails.reduce((sum, v) => sum + v, 0) / mbuAvails.length;
  }

  return {
    date: dateStr,
    totalDtHours: existing ? Number(existing.totalDtHours.toFixed(1)) : 0,
    incidentCount: existing ? existing.incidentCount : 0,
    narPercent: Number(narPercent.toFixed(2)),
    mbus: existing ? existing.mbus : {}
  };
});

// Summary
const sumAvail = allSitesCatalog.reduce((sum, s) => sum + s.availability, 0);
const avgAvail = allSitesCatalog.length > 0 ? (sumAvail / allSitesCatalog.length) : 100;
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
console.log(`\nDone! ${allSitesCatalog.length} sites compiled.`);
console.log(`Sample site: ${allSitesCatalog[0].siteCode} "${allSitesCatalog[0].siteName}" NAR=${allSitesCatalog[0].availability}%`);
console.log(`  Daily timeline entries: ${allSitesCatalog[0].dailyTimeline.length}`);
console.log(`  Sample day NAR: ${allSitesCatalog[0].dailyTimeline[0].date} => ${allSitesCatalog[0].dailyTimeline[0].narPercent}%`);
console.log(`  6-month history: ${allSitesCatalog[0].nar6Months.length} months`);
if (allSitesCatalog[0].nar6Months.length > 0) {
  console.log(`  Sample month: ${allSitesCatalog[0].nar6Months[0].monthLabel} => ${allSitesCatalog[0].nar6Months[0].narPercent}%`);
}
