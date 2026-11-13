const cron = require('node-cron');
const store = require('../store');
const driveSvc = require('../services/googleDrive');
const mailer = require('../services/mailer');

function parseEventDate(event) {
  const [d, m, y] = String(event.date).split('/').map(Number);
  const [h, min] = String(event.time || '12:00').split(':').map(Number);
  return new Date(y, m - 1, d, h || 0, min || 0);
}

function startReminders() {
  cron.schedule('0 9 * * *', async () => {
    try {
      const events = store.loadEvents();
      const regs = store.loadRegistrations();
      const now = Date.now();
      const in36h = now + 36 * 60 * 60 * 1000;

      for (const event of events) {
        const when = parseEventDate(event).getTime();
        if (when < now || when > in36h) continue;
        const reminded = new Set();
        for (const reg of regs) {
          if (reg.eventId !== event.id || reg.status !== 'confirmed' || reg.reminderSentAt) continue;
          if (reg.email) {
            try {
              await mailer.sendReminder(reg, event);
              reminded.add(reg.id);
            } catch (err) {
              console.error('Reminder mail error:', err.message);
            }
          }
          reg.reminderSentAt = new Date().toISOString();
        }
        if (reminded.size > 0) {
          store.saveRegistrations(regs);
          console.log(`Wysłano ${reminded.size} przypomnień dla: ${event.title}`);
        }
      }
    } catch (err) {
      console.error('Reminder job error:', err.message);
    }
  });

  cron.schedule(require('../config').dailyBackupCron, async () => {
    try {
      const backup = await driveSvc.backupSheetsToDrive();
      await driveSvc.backupEventsJson(JSON.stringify(store.loadEvents(), null, 2));
      console.log(`Kopia zapasowa zapisana na Dysku Google: ${backup.name}`);
    } catch (err) {
      console.error('Backup job error:', err.message);
    }
  });
}

module.exports = { startReminders, parseEventDate };
