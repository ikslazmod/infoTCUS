const nodemailer = require('nodemailer');
const config = require('../config');

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.secure,
  auth: { user: config.smtp.user, pass: config.smtp.pass }
});

function fmtDate(date, time) {
  return `${date}${time ? `, godz. ${time}` : ''}`;
}

async function sendConfirmation(reg, event) {
  await transporter.sendMail({
    from: config.smtp.from,
    to: reg.email,
    subject: `Potwierdzenie zapisu: ${event.title}`,
    text: [
      `Dzien dobry,`,
      ``,
      `potwierdzamy zapis na wydarzenie Torunskiego Centrum Uslug Spolecznych:`,
      ``,
      `${event.title}`,
      `Kiedy: ${fmtDate(event.date, event.time)}`,
      `Gdzie: ${event.location}`,
      `Liczba osob: ${reg.seats}`,
      `Numer zapisu: ${reg.id}`,
      ``,
      `Status: ${reg.status === 'confirmed' ? 'POTWIERDZONY - miejsce zagwarantowane' : 'LISTA REZERWOWA - poinformujemy, gdy zwolni sie miejsce'}`,
      ``,
      `Jesli nie mozesz przyjsc, zrezygnuj w aplikacji, aby zwolnic miejsce dla kolejnej osoby:`,
      `${config.baseUrl}/#moje-zapisy`,
      ``,
      `Pozdrawiamy,`,
      `Torunskie Centrum Uslug Spolecznych`,
      `ul. Konopnickiej 13/1, Torun`
    ].join('\n')
  });
}

async function sendCancellation(reg, event) {
  await transporter.sendMail({
    from: config.smtp.from,
    to: reg.email,
    subject: `Rezygnacja potwierdzona: ${event.title}`,
    text: [
      `Dzien dobry,`,
      ``,
      `Twoj zapis na wydarzenie "${event.title}" (${fmtDate(event.date, event.time)}) zostal anulowany, a miejsce zwolnione.`,
      ``,
      `Zapraszamy do zapisu na inne wydarzenia: ${config.baseUrl}`,
      ``,
      `Pozdrawiamy,`,
      `Torunskie Centrum Uslug Spolecznych`
    ].join('\n')
  });
}

async function sendPromotion(reg, event) {
  await transporter.sendMail({
    from: config.smtp.from,
    to: reg.email,
    subject: `Miejsce zwolnione - przenosimy Cie z listy rezerwowej: ${event.title}`,
    text: [
      `Dzien dobry,`,
      ``,
      `dobra wiadomosc! Z listy rezerwowej przechodzisz na liste uczestnikow wydarzenia:`,
      ``,
      `${event.title}`,
      `Kiedy: ${fmtDate(event.date, event.time)}`,
      `Gdzie: ${event.location}`,
      `Liczba osob: ${reg.seats}`,
      ``,
      `Twoje miejsce jest teraz zagwarantowane. Jesli nie mozesz przyjsc, zrezygnuj w aplikacji: ${config.baseUrl}/#moje-zapisy`,
      ``,
      `Pozdrawiamy,`,
      `Torunskie Centrum Uslug Spolecznych`
    ].join('\n')
  });
}

async function sendNewEventAnnouncement(recipients, event) {
  if (recipients.length === 0) return;
  await transporter.sendMail({
    from: config.smtp.from,
    bcc: recipients,
    subject: `Nowe wydarzenie TCUS: ${event.title}`,
    text: [
      `Dzien dobry,`,
      ``,
      `Torunskie Centrum Uslug Spolecznych zaprasza na nowe wydarzenie:`,
      ``,
      `${event.title}`,
      `Kiedy: ${fmtDate(event.date, event.time)}`,
      `Gdzie: ${event.location}`,
      `Dla kogo: ${event.audience || 'wszyscy'}`,
      ``,
      `Zapisy w aplikacji: ${config.baseUrl}/#wydarzenie/${event.id}`,
      ``,
      `Pozdrawiamy,`,
      `Torunskie Centrum Uslug Spolecznych`
    ].join('\n')
  });
}

async function sendReminder(reg, event) {
  await transporter.sendMail({
    from: config.smtp.from,
    to: reg.email,
    subject: `Przypomnienie: jutro "${event.title}"`,
    text: [
      `Dzien dobry,`,
      ``,
      `przypominamy o zapisie na wydarzenie:`,
      ``,
      `${event.title}`,
      `Kiedy: ${fmtDate(event.date, event.time)}`,
      `Gdzie: ${event.location}`,
      `Liczba osob: ${reg.seats}`,
      ``,
      `Do zobaczenia!`,
      `Torunskie Centrum Uslug Spolecznych`
    ].join('\n')
  });
}

module.exports = { sendConfirmation, sendCancellation, sendPromotion, sendNewEventAnnouncement, sendReminder, transporter };
