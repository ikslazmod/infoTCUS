const express = require('express');
const path = require('path');
const config = require('./config');
const sheetsSvc = require('./services/googleSheets');
const { startReminders } = require('./services/reminders');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', '..', 'frontend')));

app.use('/api/events', require('./routes/events'));
app.use('/api/registrations', require('./routes/registrations'));
app.use('/api/admin', require('./routes/admin'));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'tcus-wydarzenia', time: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Błąd serwera. Spróbuj ponownie później.' });
});

async function main() {
  try {
    await sheetsSvc.ensureAllSheets();
    console.log('Arkusze Google gotowe (lista gości, lista rezerwowa, wydarzenia).');
  } catch (err) {
    console.warn('Nie udało się zainicjować Arkuszy Google (aplikacja działa, sprawdz konfiguracje):', err.message);
  }
  startReminders();
  app.listen(config.port, () => {
    console.log(`TCUS Wydarzenia działa na porcie ${config.port}`);
  });
}

main();
