import * as XLSX from 'xlsx';
import type { OutageRecord } from '../types';


interface RawRow {
  [key: string]: unknown;
}

export async function parseExcelFile(file: File): Promise<{
  records: OutageRecord[];
  sheetName: string;
  totalRows: number;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const rawJson: RawRow[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        
        if (!rawJson || rawJson.length === 0) {
          throw new Error('The uploaded file contains no data rows.');
        }

        const records = mapRawRowsToRecords(rawJson);
        resolve({
          records,
          sheetName: firstSheetName,
          totalRows: records.length
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

function mapRawRowsToRecords(rows: RawRow[]): OutageRecord[] {
  return rows.map((row, index) => {
    const keys = Object.keys(row);

    const findVal = (patterns: string[]): unknown => {
      for (const p of patterns) {
        const matchedKey = keys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '').includes(p.toLowerCase().replace(/[^a-z0-9]/g, '')));
        if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== '') {
          return row[matchedKey];
        }
      }
      return undefined;
    };

    // Extract site name / ID
    const siteNameVal = findVal(['sitename', 'site_name', 'node', 'station', 'location', 'siteid', 'site']) || `Tower Node ${index + 1}`;
    const siteIdVal = findVal(['siteid', 'site_id', 'code', 'node_id', 'id']) || `SITE-${1000 + index}`;
    const regionVal = findVal(['region', 'zone', 'circle', 'city', 'province', 'area']) || 'Central Region';

    // Extract downtime hours
    const rawDowntime = findVal(['downtime', 'down_time', 'downtimehours', 'down_hrs', 'duration', 'outage_hours', 'downtimeminutes']);
    let downtimeHours = 0;
    if (typeof rawDowntime === 'number') {
      downtimeHours = rawDowntime;
    } else if (typeof rawDowntime === 'string') {
      const parsed = parseFloat(rawDowntime.replace(/[^0-9.]/g, ''));
      downtimeHours = isNaN(parsed) ? 0 : parsed;
    }

    // Extract availability %
    const rawAvail = findVal(['availability', 'avail', 'uptime', 'sla', 'availability_percentage', 'avail%']);
    let availability = 99.5;
    if (typeof rawAvail === 'number') {
      availability = rawAvail > 1 ? rawAvail : rawAvail * 100; // handle 0.999 vs 99.9
    } else if (typeof rawAvail === 'string') {
      const parsed = parseFloat(rawAvail.replace(/[^0-9.]/g, ''));
      if (!isNaN(parsed)) {
        availability = parsed > 1 ? parsed : parsed * 100;
      }
    } else if (downtimeHours > 0) {
      // derive availability from 720 hours monthly standard
      availability = Math.max(80, Number((((720 - downtimeHours) / 720) * 100).toFixed(2)));
    }

    // Extract category / reason
    const categoryVal = findVal(['category', 'reason', 'cause', 'fault_type', 'rootcause', 'problem_type']) || 'Commercial Grid Outage';
    const rootCauseVal = findVal(['rootcause', 'details', 'remarks', 'description', 'comment', 'notes']) || `${categoryVal} incident`;
    const dateVal = findVal(['date', 'timestamp', 'time', 'incident_date', 'day']) || new Date().toISOString().split('T')[0];
    const statusVal = findVal(['status', 'state']) || (downtimeHours > 5 ? 'Investigating' : 'Resolved');

    return {
      id: `EXCEL-${index + 1}`,
      siteId: String(siteIdVal),
      siteName: String(siteNameVal),
      region: String(regionVal),
      downtimeHours: Number(downtimeHours.toFixed(1)),
      availability: Number(Math.min(100, Math.max(0, availability)).toFixed(2)),
      timestamp: String(dateVal),
      category: String(categoryVal),
      status: String(statusVal).toLowerCase().includes('active') ? 'Active' : (String(statusVal).toLowerCase().includes('investig') ? 'Investigating' : 'Resolved'),
      slaTarget: 99.90,
      rootCause: String(rootCauseVal),
      mttrMinutes: Math.round(downtimeHours * 60)
    };
  });
}
