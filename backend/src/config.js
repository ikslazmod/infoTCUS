require('dotenv').config();

function required(name, fallback) {
  const value = process.env[name] || fallback;
  if (!value) {
    throw new Error(`Brak zmiennej srodowiskowej: ${name}`);
  }
  return value;
}

module.exports = {
  port: parseInt(process.env.PORT || '3000', 10),
  baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
  google: {
    serviceAccountEmail: required('GOOGLE_SERVICE_ACCOUNT_EMAIL'),
    serviceAccountKeyPath: required('GOOGLE_SERVICE_ACCOUNT_KEY_PATH'),
    calendarId: required('GOOGLE_CALENDAR_ID'),
    sheetsId: required('GOOGLE_SHEETS_ID'),
    guestsSheetName: process.env.GUESTS_SHEET_NAME || 'Lista gosci',
    reserveSheetName: process.env.RESERVE_SHEET_NAME || 'Lista rezerwowa',
    eventsSheetName: process.env.EVENTS_SHEET_NAME || 'Wydarzenia',
    driveBackupFolderId: required('GOOGLE_DRIVE_BACKUP_FOLDER_ID')
  },
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: process.env.SMTP_SECURE !== 'false',
    user: required('SMTP_USER'),
    pass: required('SMTP_PASS'),
    from: process.env.MAIL_FROM || `TCUS Wydarzenia <${process.env.SMTP_USER}>`
  },
  organizerSecret: required('ORGANIZER_SECRET'),
  dailyBackupCron: process.env.DAILY_BACKUP_CRON || '0 23 * * *',
  dataDir: process.env.DATA_DIR || require('path').join(__dirname, '..', 'data')
};
