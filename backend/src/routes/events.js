const express = require('express');
const store = require('../store');

const router = express.Router();

function upcomingFirst(events) {
  const parse = (e) => {
    const [d, m, y] = e.date.split('/').map(Number);
    return new Date(y, m - 1, d).getTime();
  };
  return [...events].sort((a, b) => parse(a) - parse(b));
}

router.get('/', async (req, res) => {
  const events = upcomingFirst(store.loadEvents());
  const regs = store.loadRegistrations();
  const withCounts = events.map((e) => {
    const active = regs.filter((r) => r.eventId === e.id && r.status !== 'cancelled');
    const taken = active.filter((r) => r.status === 'confirmed').reduce((sum, r) => sum + (r.seats || 1), 0);
    const reserve = active.filter((r) => r.status === 'reserve').length;
    return {
      ...e,
      seatsTaken: taken,
      seatsFree: Math.max(0, e.capacity - taken),
      reserveCount: reserve
    };
  });
  res.json({ events: withCounts, updatedAt: new Date().toISOString() });
});

router.get('/:id', async (req, res) => {
  const event = store.loadEvents().find((e) => e.id === req.params.id);
  if (!event) return res.status(404).json({ error: 'Nie znaleziono wydarzenia' });
  const regs = store.loadRegistrations().filter((r) => r.eventId === event.id && r.status !== 'cancelled');
  const taken = regs.filter((r) => r.status === 'confirmed').reduce((sum, r) => sum + (r.seats || 1), 0);
  res.json({ ...event, seatsTaken: taken, seatsFree: Math.max(0, event.capacity - taken), reserveCount: regs.filter((r) => r.status === 'reserve').length });
});

module.exports = router;
