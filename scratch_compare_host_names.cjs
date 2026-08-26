const XLSX = require('xlsx');

console.log('Loading workbook...');
const wb = XLSX.readFile('C4 Overall Performance Aug-2026.xlsx');

const ndSheet = wb.Sheets['Site NAR-Day'];
const ndRows = XLSX.utils.sheet_to_json(ndSheet);

const cbSheet = wb.Sheets['4G CounterBased Site Wise'];
const cbRows = XLSX.utils.sheet_to_json(cbSheet);

const cbMap = {};
cbRows.forEach(row => {
  const code = String(row['SiteCode'] || '').trim().toLowerCase();
  if (code) cbMap[code] = row;
});

// Print OMO Host Name from Site NAR-Day vs 4G sheet for first 20 sites
console.log('Site Code | Site NAR-Day OMO Host Name | 4G Sheet OMO Host Name | 4G Sheet OMO Colocation | 4G Category');
console.log('------------------------------------------------------------------------------------------------------');
ndRows.slice(0, 30).forEach(row => {
  const code = String(row['Site Code'] || '').trim().toLowerCase();
  const cbRow = cbMap[code] || {};
  console.log(`${row['Site Code'].padEnd(10)} | ${(row['OMO Host Name'] || 'blank').padEnd(26)} | ${(cbRow['OMO host name '] || 'blank').padEnd(22)} | ${(cbRow['OMO Colocation'] || 'blank').padEnd(22)} | ${cbRow['Category'] || 'blank'}`);
});
