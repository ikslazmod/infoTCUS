const googleClient = require('./googleClient');
const config = require('../config');

function toRFC3339(date, time) {
  const [h, m] = String(time).split(':').map((x) => parseInt(x, 10));
  const [day, month, year] = String(date).split(/[.\-/]/).map((x) => parseInt(x, 10));
  const start = new Date(Date.UTC(year, month - 1, day, h, m));
  return { start: start.toISOString(), end: new Date(start.getTime() + 2 * 60 * 60 * 1000).toISOString() };
}

async function createCalendarEvent(event) {
  const times = toRFC3339(event.date, event.startTime || '12:00');
  const body = {
    summary: event.title,
    description: [
      event.description || '',
      '',
      `Dla kogo: ${event.audience || 'wszyscy'}`,
      `Miejsce: ${event.location || ''}`,
      `Zapisy: ${config.baseUrl}/#wydarzenie/${event.id}`
    ].join('\n'),
    location: event.location || undefined,
    start: { dateTime: times.start, timeZone: 'Europe/Warsaw' },
    end: { dateTime: times.end, timeZone: 'Europe/Warsaw' },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 },
        { method: 'popup', minutes: 120 }
      ]
    }
  };
  const res = await googleClient.calendar.events.insert({ calendarId: config.google.calendarId, requestBody: body });
  return res.data.id;
}

async function updateCalendarEvent(calendarEventId, event) {
  const times = toRFC3339(event.date, event.startTime || '12:00');
  await googleClient.calendar.events.update({
    calendarId: config.google.calendarId,
    eventId: calendarEventId,
    requestBody: {
      summary: event.title,
      description: event.description || '',
      location: event.location || undefined,
      start: { dateTime: times.start, timeZone: 'Europe/Warsaw' },
      end: { dateTime: times.end, timeZone: 'Europe/Warsaw' }
    }
  });
}

async function deleteCalendarEvent(calendarEventId) {
  await googleClient.calendar.events.delete({ calendarId: config.google.calendarId, eventId: calendarEventId });
}

module.exports = { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, toRFC3339 };
