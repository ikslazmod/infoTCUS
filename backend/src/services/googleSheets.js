const googleClient = require('./googleClient');
const config = require('../config');

const GUESTS_HEADER = [
  'ID zapisu', 'ID wydarzenia', 'Wydarzenie', 'Data', 'Imie i nazwisko', 'Email',
  'Telefon', 'Liczba osob', 'Status', 'Zrodlo zapisu', 'Data zapisu', 'Uwagi'
];

const EVENTS_HEADER = [
  'ID', 'Tytul', 'Data', 'Godzina', 'Miejsce', 'Dla kogo', 'Opis', 'Limit miejsc',
  'Kalendarz event ID', 'Status'
];

function rangeFor(sheetName, range = 'A1:Z10000') {
  return `'${sheetName}'!${range}`;
}

async function ensureSheet(title, header) {
  const meta = await googleClient.sheets.spreadsheets.get({ spreadsheetId: config.google.sheetsId });
  const exists = meta.data.sheets.some((s) => s.properties.title === title);
  if (!exists) {
    await googleClient.sheets.spreadsheets.batchUpdate({
      spreadsheetId: config.google.sheetsId,
      requestBody: { requests: [{ addSheet: { properties: { title } } }] }
    });
    await googleClient.sheets.spreadsheets.values.update({
      spreadsheetId: config.google.sheetsId,
      range: rangeFor(title, 'A1'),
      valueInputOption: 'RAW',
      requestBody: { values: [header] }
    });
  }
}

async function ensureAllSheets() {
  await ensureSheet(config.google.guestsSheetName, GUESTS_HEADER);
  await ensureSheet(config.google.reserveSheetName, GUESTS_HEADER);
  await ensureSheet(config.google.eventsSheetName, EVENTS_HEADER);
}

async function readRows(sheetName) {
  const res = await googleClient.sheets.spreadsheets.values.get({
    spreadsheetId: config.google.sheetsId,
    range: rangeFor(sheetName)
  });
  const rows = res.data.values || [];
  if (rows.length === 0) return [];
  const header = rows[0];
  return rows.slice(1).map((row) => {
    const obj = {};
    header.forEach((key, i) => { obj[key] = row[i] || ''; });
    return obj;
  });
}

async function appendRow(sheetName, values) {
  await googleClient.sheets.spreadsheets.values.append({
    spreadsheetId: config.google.sheetsId,
    range: rangeFor(sheetName, 'A1'),
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [values] }
  });
}

async function findRowNumberById(sheetName, registrationId) {
  const res = await googleClient.sheets.spreadsheets.values.get({
    spreadsheetId: config.google.sheetsId,
    range: rangeFor(sheetName)
  });
  const rows = res.data.values || [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === registrationId) return i + 1;
  }
  return null;
}

async function updateRowCell(sheetName, rowNumber, columnLetter, value) {
  await googleClient.sheets.spreadsheets.values.update({
    spreadsheetId: config.google.sheetsId,
    range: `'${sheetName}'!${columnLetter}${rowNumber}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[value]] }
  });
}

async function getSheetId(title) {
  const meta = await googleClient.sheets.spreadsheets.get({ spreadsheetId: config.google.sheetsId });
  const found = meta.data.sheets.find((s) => s.properties.title === title);
  if (!found) throw new Error(`Nie ma arkusza: ${title}`);
  return found.properties.sheetId;
}

async function deleteRow(sheetName, rowNumber) {
  await googleClient.sheets.spreadsheets.batchUpdate({
    spreadsheetId: config.google.sheetsId,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: { sheetId: await getSheetId(sheetName), dimension: 'ROWS', startIndex: rowNumber - 1, endIndex: rowNumber }
        }
      }]
    }
  });
}

function guestRow(reg) {
  return [
    reg.id, reg.eventId, reg.eventTitle, reg.eventDate, reg.name, reg.email,
    reg.phone || '', reg.seats || 1, reg.status, reg.source || 'aplikacja',
    reg.createdAt, reg.notes || ''
  ];
}

module.exports = {
  ensureAllSheets,
  readRows,
  appendRow,
  findRowNumberById,
  updateRowCell,
  deleteRow,
  guestRow,
  guestsSheetName: config.google.guestsSheetName,
  reserveSheetName: config.google.reserveSheetName,
  eventsSheetName: config.google.eventsSheetName
};
