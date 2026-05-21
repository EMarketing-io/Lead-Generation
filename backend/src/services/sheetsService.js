const { google } = require('googleapis');
const path = require('path');

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = 'Sheet1';
const SHEET_GID = 0;

// Column order: A=Timestamp, B=Keyword, C=Business Name, D=Phone, E=Website, F=Email, G=Address, H=Status
const HEADERS = ['Timestamp', 'Keyword', 'Business Name', 'Phone', 'Website', 'Email', 'Address', 'Status'];

function getAuth() {
  return new google.auth.GoogleAuth({
    keyFile: path.resolve(process.env.SERVICE_ACCOUNT_PATH || './service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

async function getSheetsClient() {
  const auth = getAuth();
  const client = await auth.getClient();
  return google.sheets({ version: 'v4', auth: client });
}

async function ensureHeaders() {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A1:H1`,
  });

  const existing = response.data.values?.[0] || [];
  const correct = HEADERS.every((h, i) => existing[i] === h);

  if (!correct) {
    // Overwrite header row with correct column layout
    // NOTE: if you have existing data in the old format (without Keyword column),
    // clear all rows below row 1 in the sheet and re-generate.
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1:H1`,
      valueInputOption: 'RAW',
      requestBody: { values: [HEADERS] },
    });
  }
}

function dedupeKey(lead) {
  return `${(lead.businessName || '').toLowerCase().trim()}|${(lead.address || '').toLowerCase().trim()}`;
}

async function appendLeads(leads) {
  await ensureHeaders();

  // Fetch existing leads once and build a dedup set — skip anything already in the sheet
  const existing = await getAllLeads();
  const existingKeys = new Set(existing.map(dedupeKey));

  const fresh = leads.filter(lead => !existingKeys.has(dedupeKey(lead)));
  const skipped = leads.length - fresh.length;

  if (fresh.length === 0) return { saved: 0, skipped };

  const sheets = await getSheetsClient();
  const rows = fresh.map(lead => [
    lead.timestamp,
    lead.keyword || '',
    lead.businessName,
    lead.phone,
    lead.website,
    lead.email,
    lead.address,
    '',
  ]);

  const CHUNK = 50;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:H`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: rows.slice(i, i + CHUNK) },
    });
    if (i + CHUNK < rows.length) await sleep(1100);
  }

  return { saved: fresh.length, skipped };
}

async function getAllLeads() {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:H`,
  });

  const rows = response.data.values || [];
  if (rows.length <= 1) return [];

  const [, ...dataRows] = rows;
  return dataRows.map((row, i) => ({
    rowIndex: i + 2,
    timestamp:    row[0] || '',
    keyword:      row[1] || '',
    businessName: row[2] || '',
    phone:        row[3] || '',
    website:      row[4] || '',
    email:        row[5] || '',
    address:      row[6] || '',
    status:       row[7] || '',
  }));
}

// Status is now column H
async function updateLeadStatuses(rowIndices, status) {
  const sheets = await getSheetsClient();
  const data = rowIndices.map(rowIndex => ({
    range: `${SHEET_NAME}!H${rowIndex}`,
    values: [[status]],
  }));
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { valueInputOption: 'RAW', data },
  });
}

async function deleteLeads(rowIndices) {
  const sheets = await getSheetsClient();
  const sorted = [...rowIndices].sort((a, b) => b - a);
  const requests = sorted.map(rowIndex => ({
    deleteDimension: {
      range: { sheetId: SHEET_GID, dimension: 'ROWS', startIndex: rowIndex - 1, endIndex: rowIndex },
    },
  }));
  await sheets.spreadsheets.batchUpdate({ spreadsheetId: SPREADSHEET_ID, requestBody: { requests } });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = { appendLeads, getAllLeads, updateLeadStatuses, deleteLeads };
