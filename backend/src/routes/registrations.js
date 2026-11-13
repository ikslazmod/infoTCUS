const express = require('express');
const store = require('../store');
const sheets = require('../services/googleSheets');
const mailer = require('../services/mailer');

const router = express.Router();

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '');
}

function activeRegs(regs, eventId) {
  return regs.filter((r) => r.eventId === eventId && r.status !== 'cancelled');
}

function seatsTaken(regs, eventId) {
  return activeRegs(regs, eventId)
    .filter((r) => r.status === 'confirmed')
    .reduce((sum, r) => sum + (r.seats || 1), 0);
}

async function promoteFromReserve(eventId) {
  const events = store.loadEvents();
  const event = events.find((e) => e.id === eventId);
  if (!event) return null;
  const regs = store.loadRegistrations();
  const candidate = regs
    .filter((r) => r.eventId === eventId && r.status === 'reserve')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  if (!candidate) return null;
  if (seatsTaken(regs, eventId) + (candidate.seats || 1) > event.capacity) return null;

  candidate.status = 'confirmed';
  store.saveRegistrations(regs);

  try {
    const row = await sheets.findRowNumberById(sheets.reserveSheetName, candidate.id);
    if (row) {
      await sheets.deleteRow(sheets.reserveSheetName, row);
      await sheets.appendRow(sheets.guestsSheetName, sheets.guestRow(candidate));
    }
  } catch (err) {
    console.error('Google Sheets promote error:', err.message);
  }

  if (candidate.email) {
    try {
      await mailer.sendPromotion(candidate, event);
    } catch (err) {
      console.error('Promotion mail error:', err.message);
    }
  }
  return candidate;
}

router.post('/:eventId/register', async (req, res) => {
  const { name, email, phone, seats, notes } = req.body || {};
  if (!name || !validEmail(email)) {
    return res.status(400).json({ error: 'Podaj imię i nazwisko oraz poprawny adres e-mail.' });
  }
  const seatCount = Math.max(1, parseInt(seats || '1', 10) || 1);
  if (seatCount > 6) {
    return res.status(400).json({ error: 'Maksymalna liczba osób na jeden zapis to 6.' });
  }

  const events = store.loadEvents();
  const event = events.find((e) => e.id === req.params.eventId);
  if (!event) return res.status(404).json({ error: 'Nie znaleziono wydarzenia' });
  if (event.registrationOpen === false) {
    return res.status(400).json({ error: 'Zapisy na to wydarzenie są zamknięte.' });
  }

  const regs = store.loadRegistrations();
  const duplicate = regs.find(
    (r) => r.eventId === event.id && r.status !== 'cancelled' &&
      r.email.toLowerCase() === String(email).toLowerCase()
  );
  if (duplicate) {
    return res.status(409).json({ error: 'Ten adres e-mail jest już zapisany na to wydarzenie.', registrationId: duplicate.id });
  }

  const free = event.capacity - seatsTaken(regs, event.id);
  const status = free >= seatCount ? 'confirmed' : 'reserve';

  const reg = {
    id: store.nextId('ZAP'),
    eventId: event.id,
    eventTitle: event.title,
    eventDate: event.date,
    name: String(name).trim(),
    email: String(email).trim(),
    phone: phone ? String(phone).trim() : '',
    seats: seatCount,
    status,
    source: 'aplikacja',
    createdAt: new Date().toISOString(),
    notes: notes ? String(notes).trim() : ''
  };
  regs.push(reg);
  store.saveRegistrations(regs);

  try {
    await sheets.appendRow(status === 'confirmed' ? sheets.guestsSheetName : sheets.reserveSheetName, sheets.guestRow(reg));
  } catch (err) {
    console.error('Google Sheets append error:', err.message);
  }

  try {
    await mailer.sendConfirmation(reg, event);
  } catch (err) {
    console.error('Confirmation mail error:', err.message);
  }

  res.status(201).json({
    registrationId: reg.id,
    status,
    message: status === 'confirmed'
      ? 'Zapis potwierdzony – miejsce zagwarantowane. Potwierdzenie wysłaliśmy na e-mail.'
      : 'Brak wolnych miejsc – dopisaliśmy Cię na listę rezerwową i wysłaliśmy potwierdzenie na e-mail.'
  });
});

router.get('/lookup', async (req, res) => {
  const { email, eventId } = req.query;
  if (!validEmail(email)) return res.status(400).json({ error: 'Podaj poprawny adres e-mail.' });
  const regs = store.loadRegistrations().filter(
    (r) => r.email.toLowerCase() === String(email).toLowerCase() && (!eventId || r.eventId === eventId)
  );
  res.json({ registrations: regs });
});

router.post('/:registrationId/cancel', async (req, res) => {
  const regs = store.loadRegistrations();
  const idx = regs.findIndex((r) => r.id === req.params.registrationId);
  if (idx === -1) return res.status(404).json({ error: 'Nie znaleziono zapisu' });
  const reg = regs[idx];
  if (reg.status === 'cancelled') return res.status(400).json({ error: 'Ten zapis został już anulowany.' });

  const previousStatus = reg.status;
  reg.status = 'cancelled';
  reg.cancelledAt = new Date().toISOString();
  store.saveRegistrations(regs);

  try {
    const sheetName = previousStatus === 'reserve' ? sheets.reserveSheetName : sheets.guestsSheetName;
    const row = await sheets.findRowNumberById(sheetName, reg.id);
    if (row) await sheets.deleteRow(sheetName, row);
  } catch (err) {
    console.error('Google Sheets cancel error:', err.message);
  }

  const events = store.loadEvents();
  const event = events.find((e) => e.id === reg.eventId);

  if (reg.email && event) {
    try {
      await mailer.sendCancellation(reg, event);
    } catch (err) {
      console.error('Cancellation mail error:', err.message);
    }
  }

  let promoted = null;
  if (event) {
    promoted = await promoteFromReserve(event.id);
  }

  res.json({
    ok: true,
    message: 'Rezygnacja zapisana, miejsce zostało zwolnione.',
    promoted: promoted ? { id: promoted.id, email: promoted.email, seats: promoted.seats } : null
  });
});

module.exports = router;
