const fs = require('fs');
const path = require('path');

// Robust custom CSV parser supporting commas and newlines inside quotes
function parseCSV(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf8');
  
  const rows = [];
  let currentField = '';
  let inQuotes = false;
  let currentRow = [];
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n
      }
      currentRow.push(currentField.trim());
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }
  
  if (rows.length === 0) return [];
  
  // Header is the first row, clean BOM
  const rawHeaders = rows[0];
  const headers = rawHeaders.map(h => h.replace(/^\ufeff/, '').trim());
  
  const records = [];
  for (let i = 1; i < rows.length; i++) {
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = rows[i][idx] !== undefined ? rows[i][idx] : '';
    });
    records.push(row);
  }
  return records;
}

// Load sheets from CSV files
console.log('Loading CSV files from `./csv files data/`...');
const rslRows = parseCSV('./csv files data/Consolidated RSL Aug-26.csv');
const siteWiseRows = parseCSV('./csv files data/SiteWiseDT.csv');
const narDayRows = parseCSV('./csv files data/Site NAR-Day.csv');
const dateWiseRows = parseCSV('./csv files data/DateWiseDT.csv');

console.log('Loaded RSL Rows:', rslRows.length);
console.log('Loaded SiteWiseDT Rows:', siteWiseRows.length);
console.log('Loaded Site NAR-Day Rows:', narDayRows.length);
console.log('Loaded DateWiseDT Rows:', dateWiseRows.length);

// Helper for date extraction
function normalizeDateStr(dateStr) {
  if (!dateStr) return '2026-08-01';
  return dateStr.split(' ')[0];
}

// Helper to look up daily column in CSV rows
function getDailyValue(row, dateStr) {
  const key1 = `${dateStr} 00:00:00`;
  const key2 = dateStr;
  if (row[key1] !== undefined && row[key1] !== '') return parseFloat(row[key1]);
  if (row[key2] !== undefined && row[key2] !== '') return parseFloat(row[key2]);
  return undefined;
}

// 1. Identify the Deodar sites from RSL sheet
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

// Map Site Code to its SiteWiseDT and Site NAR-Day rows
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

// Map Date to DateWiseDT row
const dateWiseMap = {};
dateWiseRows.forEach(row => {
  const mbuVal = row['MBU'];
  if (mbuVal) {
    const dateStr = normalizeDateStr(mbuVal);
    dateWiseMap[dateStr] = row;
  }
});

const siteMap = {};
const reasonMap = {};
const mbuMap = {};
const dailyTimelineMap = {};

const allIncidents = [];

deodarRslRows.forEach((row, i) => {
  const siteCodeRaw = String(row['SiteCode'] || row['Code'] || 'UNKNOWN').trim();
  const siteCode = siteCodeRaw.toLowerCase();
  const rawSiteName = String(row['Site'] || siteCodeRaw);
  const siteName = rawSiteName.replace(/^[A-Z0-9]+__S_/, '').replace(/^[A-Z0-9]+_H_/, '').replace(/_/g, ' ');
  const mbu = String(row['MBU#'] || row['Region'] || 'C4-GUJ-01').trim();
  
  // DT in RSL is in minutes, convert to hours
  const dtRaw = parseFloat(row['DT']) || 0;
  const dtHours = dtRaw / 60;
  
  const reason = String(row['Reasons'] || row['Reason Category'] || 'Commercial Power Grid').trim();
  const category = String(row['Reason Category'] || row['General'] || 'Grid Power').trim();
  const dateStr = normalizeDateStr(row['Occurring']);
  const vendor = String(row['Vendor'] || 'Huawei');
  const siteType = String(row['SiteType'] || 'Macro');
  const priority = String(row['Priority'] || 'General');

  // Build site map
  if (!siteMap[siteCode]) {
    const swRow = siteWiseMap[siteCode] || {};
    const excelAvail = swRow['Total NAR'] !== undefined && swRow['Total NAR'] !== '' ? parseFloat(swRow['Total NAR']) * 100 : 99.0;
    const excelDtHours = swRow['TDT'] !== undefined && swRow['TDT'] !== '' ? parseFloat(swRow['TDT']) / 60 : 0;

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

  // MBU Map
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
    const excelAvail = swRow['Total NAR'] !== undefined && swRow['Total NAR'] !== '' ? parseFloat(swRow['Total NAR']) * 100 : 99.0;
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
    const excelDailyNarVal = getDailyValue(ndRow, d);
    const excelDailyNar = excelDailyNarVal !== undefined ? excelDailyNarVal * 100 : 100;
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
  const dwRow = dateWiseMap[d.date] || {};
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

// Write output
fs.writeFileSync('./src/utils/realEngroData.json', JSON.stringify(exportData, null, 2));
console.log(`Successfully compiled Deodar-only catalog for ${allSitesCatalog.length} sites into realEngroData.json from CSV files!`);
