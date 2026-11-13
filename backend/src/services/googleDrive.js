const googleClient = require('./googleClient');
const config = require('../config');

async function backupSheetsToDrive() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const exportMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const res = await googleClient.drive.files.export(
    { fileId: config.google.sheetsId, mimeType: exportMime },
    { responseType: 'arraybuffer' }
  );
  const upload = await googleClient.drive.files.create({
    requestBody: {
      name: `TCUS-rejestr-backup-${timestamp}.xlsx`,
      parents: [config.google.driveBackupFolderId]
    },
    media: { mimeType: exportMime, body: Buffer.from(res.data) },
    fields: 'id, name, webViewLink'
  });
  return upload.data;
}

async function backupEventsJson(jsonString) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const buffer = Buffer.from(jsonString, 'utf8');
  const upload = await googleClient.drive.files.create({
    requestBody: {
      name: `TCUS-wydarzenia-${timestamp}.json`,
      parents: [config.google.driveBackupFolderId]
    },
    media: { mimeType: 'application/json', body: buffer },
    fields: 'id, name, webViewLink'
  });
  return upload.data;
}

async function listBackups(limit = 20) {
  const res = await googleClient.drive.files.list({
    q: `'${config.google.driveBackupFolderId}' in parents and trashed = false`,
    orderBy: 'createdTime desc',
    pageSize: limit,
    fields: 'files(id, name, createdTime, webViewLink)'
  });
  return res.data.files;
}

async function exportSheetCsv(sheetName) {
  const res = await googleClient.sheets.spreadsheets.values.get({
    spreadsheetId: config.google.sheetsId,
    range: `'${sheetName}'!A1:Z10000`
  });
  const rows = res.data.values || [];
  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
}

module.exports = { backupSheetsToDrive, backupEventsJson, listBackups, exportSheetCsv };
