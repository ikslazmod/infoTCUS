const fs = require('fs');
const { google } = require('googleapis');
const config = require('../config');

let cached = null;

function getClient() {
  if (cached) return cached;
  let privateKey;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON) {
    privateKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON).private_key;
  } else {
    privateKey = JSON.parse(fs.readFileSync(config.google.serviceAccountKeyPath, 'utf8')).private_key;
  }
  const auth = new google.auth.JWT({
    email: config.google.serviceAccountEmail,
    key: privateKey,
    scopes: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive'
    ]
  });
  cached = {
    auth,
    calendar: google.calendar({ version: 'v3', auth }),
    sheets: google.sheets({ version: 'v4', auth }),
    drive: google.drive({ version: 'v3', auth })
  };
  return cached;
}

module.exports = {
  get calendar() { return getClient().calendar; },
  get sheets() { return getClient().sheets; },
  get drive() { return getClient().drive; }
};
