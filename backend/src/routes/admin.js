const express = require('express');
const store = require('../store');
const config = require('../config');
const calendarSvc = require('../services/googleCalendar');
const sheetsSvc = require('../services/googleSheets');
const driveSvc = require('../services/googleDrive');
const mailer = require('../services/mailer');

const router = express.Router();

function requireSecret(req, res, next) {
  const provided = req.get('X-Organizer-Secret') || (req.body && req.body.secret);
  if (!config.organizerSecret || provided !== config.organizerSecret) {
    return res.status(401).json({ error: 'Nieautoryzowany dostęp' });
  }
  next();
}

router.use(requireSecret);

router.post('/events', async (req, res) => {
  const { title, date, time, location, audience, capacity, description, notifySubscribers } = req.body || {};
  if (!title || !date) return res.status(400).json({ error: 'Podaj tytuł i datę wydarzenia.' });

  const events = store.loadEvents();
  const event = {
    id: store.nextId('WYD'),
    title: String(title).trim(),
    date,
    time: time || '12:00',
    location: location || 'TCUS, ul. Konopnickiej 13/1',
    audience: audience || 'Wszyscy',
    capacity: parseInt(capacity || '20', 10) || 20,
    registrationOpen: true,
    description: description || ''
  };

  try {
    event.calendarEventId = await calendarSvc.createCalendarEvent(event);
  } catch (err) {
    console.error('Calendar create error:', err.message);
  }

  events.push(event);
  store.saveEvents(events);

  try {
    await sheetsSvc.appendRow(sheetsSvc.eventsSheetName, [
      event.id, event.title, event.date, event.time, event.location, event.audience,
      (event.description || '').slice(0, 500), event.capacity, event.calendarEventId || '', 'aktywne'
    ]);
  } catch (err) {
    console.error('Sheets append error:', err.message);
  }

  if (notifySubscribers) {
    try {
      const regs = store.loadRegistrations();
      const recipients = [...new Set(regs.filter((r) => r.email).map((r) => r.email))];
      await mailer.sendNewEventAnnouncement(recipients, event);
    } catch (err) {
      console.error('Announcement mail error:', err.message);
    }
  }

  res.status(201).json({ event });
});

router.put('/events/:id', async (req, res) => {
  const events = store.loadEvents();
  const event = events.find((e) => e.id === req.params.id);
  if (!event) return res.status(404).json({ error: 'Nie znaleziono wydarzenia' });

  const allowed = ['title', 'date', 'time', 'location', 'audience', 'capacity', 'description', 'registrationOpen'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) event[key] = req.body[key];
  }
  store.saveEvents(events);

  if (event.calendarEventId) {
    try {
      await calendarSvc.updateCalendarEvent(event.calendarEventId, event);
    } catch (err) {
      console.error('Calendar update error:', err.message);
    }
  }
  res.json({ event });
});

router.delete('/events/:id', async (req, res) => {
  let events = store.loadEvents();
  const event = events.find((e) => e.id === req.params.id);
  if (!event) return res.status(404).json({ error: 'Nie znaleziono wydarzenia' });
  events = events.filter((e) => e.id !== req.params.id);
  store.saveEvents(events);

  if (event.calendarEventId) {
    try {
      await calendarSvc.deleteCalendarEvent(event.calendarEventId);
    } catch (err) {
      console.error('Calendar delete error:', err.message);
    }
  }
  res.json({ ok: true });
});

router.post('/registrations/manual', async (req, res) => {
  const { eventId, name, email, phone, seats, notes, toReserve } = req.body || {};
  if (!eventId || !name) return res.status(400).json({ error: 'Podaj wydarzenie i imię i nazwisko.' });

  const events = store.loadEvents();
  const event = events.find((e) => e.id === eventId);
  if (!event) return res.status(404).json({ error: 'Nie znaleziono wydarzenia' });

  const regs = store.loadRegistrations();
  const free = event.capacity - regs
    .filter((r) => r.eventId === eventId && r.status === 'confirmed')
    .reduce((sum, r) => sum + (r.seats || 1), 0);
  const seatCount = Math.max(1, parseInt(seats || '1', 10) || 1);
  const status = toReserve === true || free < seatCount ? 'reserve' : 'confirmed';

  const reg = {
    id: store.nextId('ZAP'),
    eventId,
    eventTitle: event.title,
    eventDate: event.date,
    name: String(name).trim(),
    email: email ? String(email).trim() : '',
    phone: phone ? String(phone).trim() : '',
    seats: seatCount,
    status,
    source: 'telefon/sekretariat',
    createdAt: new Date().toISOString(),
    notes: notes ? String(notes).trim() : 'Dopisany ręcznie przez organizatora'
  };
  regs.push(reg);
  store.saveRegistrations(regs);

  try {
    await sheetsSvc.appendRow(status === 'confirmed' ? sheetsSvc.guestsSheetName : sheetsSvc.reserveSheetName, sheetsSvc.guestRow(reg));
  } catch (err) {
    console.error('Sheets append error:', err.message);
  }

  res.status(201).json({ registration: reg });
});

router.get('/registrations', async (req, res) => {
  res.json({ registrations: store.loadRegistrations() });
});

router.get('/sheets/backup', async (req, res) => {
  try {
    const backup = await driveSvc.backupSheetsToDrive();
    res.json({ ok: true, backup });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/sheets/preview/:sheet', async (req, res) => {
  const map = {
    goscie: sheetsSvc.guestsSheetName,
    rezerwowa: sheetsSvc.reserveSheetName,
    wydarzenia: sheetsSvc.eventsSheetName
  };
  const name = map[req.params.sheet];
  if (!name) return res.status(400).json({ error: 'Nieznany arkusz. Użyj: goscie, rezerwowa, wydarzenia.' });
  try {
    const rows = await sheetsSvc.readRows(name);
    res.json({ sheet: name, rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
