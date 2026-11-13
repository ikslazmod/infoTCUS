const state = {
  events: [],
  profile: JSON.parse(localStorage.getItem('tcus-profile') || 'null')
};

const app = document.getElementById('app');

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function toast(msg, isError = false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast${isError ? ' error' : ''}`;
  setTimeout(() => el.classList.add('hidden'), 4500);
}

function saveProfile(p) {
  state.profile = p;
  localStorage.setItem('tcus-profile', JSON.stringify(p));
}

function fmtDate(d) {
  const [dd, mm, yyyy] = String(d).split('/');
  return `${dd}.${mm}.${yyyy}`;
}

function statusBadge(ev) {
  if (ev.registrationOpen === false) return '<span class="badge red">Zapisy zamknięte</span>';
  if (ev.seatsFree > 0) return `<span class="badge green">Wolne miejsca: ${ev.seatsFree}</span>`;
  return '<span class="badge orange">Lista rezerwowa</span>';
}

async function loadEvents() {
  const data = await API.events();
  state.events = data.events;
}

function viewEvents() {
  const upcoming = state.events;
  if (upcoming.length === 0) {
    app.innerHTML = '<div class="empty">Brak zaplanowanych wydarzeń. Wróć wkrótce!</div>';
    return;
  }
  app.innerHTML = `
    <p class="muted">Aktualne wydarzenia i inicjatywy organizowane oraz finansowane przez TCUS. Zapisz się jednym dotknięciem.</p>
    ${upcoming.map((ev) => `
      <article class="card">
        <h2>${esc(ev.title)}</h2>
        <div class="meta">
          <span class="badge">📅 ${fmtDate(ev.date)}, godz. ${esc(ev.time)}</span>
          <span class="badge">📍 ${esc(ev.location)}</span>
          <span class="badge">👥 ${esc(ev.audience)}</span>
          ${statusBadge(ev)}
        </div>
        <p class="muted">${esc((ev.description || '').split('\n')[0].slice(0, 160))}…</p>
        <button class="btn" data-action="details" data-id="${esc(ev.id)}">Szczegóły i zapis</button>
      </article>
    `).join('')}
  `;
}

async function viewEventDetail(id) {
  app.innerHTML = '<div class="empty">Ładowanie…</div>';
  try {
    const ev = await API.event(id);
    const mine = state.profile;
    app.innerHTML = `
      <button class="back" data-action="back">← Wszystkie wydarzenia</button>
      <article class="card">
        <h2>${esc(ev.title)}</h2>
        <div class="meta">
          <span class="badge">📅 ${fmtDate(ev.date)}, godz. ${esc(ev.time)}</span>
          <span class="badge">📍 ${esc(ev.location)}</span>
          <span class="badge">👥 ${esc(ev.audience)}</span>
          ${statusBadge(ev)}
        </div>
        <div class="progress"><div style="width:${Math.min(100, Math.round((ev.seatsTaken / ev.capacity) * 100))}%"></div></div>
        <p class="muted">Zajęte miejsca: ${ev.seatsTaken} z ${ev.capacity}${ev.reserveCount > 0 ? ` · lista rezerwowa: ${ev.reserveCount}` : ''}</p>
        <p class="desc">${esc(ev.description)}</p>
        <div class="row">
          <button class="btn secondary" data-action="ics" data-id="${esc(ev.id)}">📅 Dodaj do kalendarza</button>
          <button class="btn secondary" data-action="share" data-id="${esc(ev.id)}">🔗 Udostępnij</button>
        </div>
      </article>
      ${ev.registrationOpen === false ? '<div class="card"><p class="muted">Zapisy na to wydarzenie zostały zamknięte. Skontaktuj się z TCUS: 56 611 89 40.</p></div>' : `
      <div class="card" id="reg-form">
        <h2>Zapisz się</h2>
        <p class="muted">Potwierdzenie zapisu otrzymasz e-mailem. Jeśli miejsc zabraknie, trafisz na listę rezerwową i poinformujemy Cię, gdy miejsce się zwolni.</p>
        <form id="register">
          <label for="f-name">Imię i nazwisko *</label>
          <input id="f-name" name="name" required autocomplete="name">
          <label for="f-email">Adres e-mail *</label>
          <input id="f-email" name="email" type="email" required autocomplete="email">
          <label for="f-phone">Telefon (opcjonalnie)</label>
          <input id="f-phone" name="phone" type="tel" autocomplete="tel">
          <label for="f-seats">Liczba osób</label>
          <select id="f-seats" name="seats">
            ${[1, 2, 3, 4, 5, 6].map((n) => `<option value="${n}">${n}</option>`).join('')}
          </select>
          <label for="f-notes">Uwagi (opcjonalnie)</label>
          <textarea id="f-notes" name="notes" rows="2"></textarea>
          <button class="btn block" type="submit" style="margin-top:14px">Zapisz mnie</button>
        </form>
      </div>`}
    `;
    const form = document.getElementById('register');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const btn = form.querySelector('button[type=submit]');
        btn.disabled = true;
        try {
          const result = await API.register(ev.id, {
            name: fd.get('name'),
            email: fd.get('email'),
            phone: fd.get('phone'),
            seats: fd.get('seats'),
            notes: fd.get('notes')
          });
          saveProfile({ email: fd.get('email'), name: fd.get('name') });
          Notify.enable().then((ok) => {
            if (ok) Notify.schedule({ id: ev.id, date: ev.date, time: ev.time, title: ev.title, location: ev.location }, ev);
          });
          toast(result.message);
          localStorage.setItem(`tcus-reg-${result.registrationId}`, JSON.stringify({ eventId: ev.id, title: ev.title, date: ev.date, time: ev.time, location: ev.location, status: result.status }));
          viewEventDetail(id);
        } catch (err) {
          toast(err.message, true);
          btn.disabled = false;
        }
      });
    }
  } catch (err) {
    app.innerHTML = `<div class="empty">${esc(err.message)}</div>`;
  }
}

async function viewMyRegistrations() {
  const profile = state.profile;
  if (!profile || !profile.email) {
    app.innerHTML = `
      <div class="card">
        <h2>Moje zapisy</h2>
        <p class="muted">Podaj adres e-mail, na który dokonałeś(-aś) zapisu, aby zobaczyć swoje rejestracje.</p>
        <form id="lookup">
          <label for="l-email">Adres e-mail *</label>
          <input id="l-email" type="email" required>
          <button class="btn block" type="submit" style="margin-top:14px">Pokaż moje zapisy</button>
        </form>
      </div>`;
    document.getElementById('lookup').addEventListener('submit', async (e) => {
      e.preventDefault();
      saveProfile({ email: document.getElementById('l-email').value.trim() });
      viewMyRegistrations();
    });
    return;
  }

  app.innerHTML = '<div class="empty">Ładowanie…</div>';
  try {
    const { registrations } = await API.lookup(profile.email);
    if (registrations.length === 0) {
      app.innerHTML = `
        <div class="empty">Nie znaleziono zapisów dla adresu ${esc(profile.email)}.</div>
        <button class="btn secondary block" data-action="back">← Przejdź do wydarzeń</button>`;
      return;
    }
    app.innerHTML = `
      <p class="muted">Zapisy dla: <strong>${esc(profile.email)}</strong> · <button class="back" data-action="forget" style="display:inline">zmień adres</button></p>
      ${registrations.map((r) => `
        <article class="card">
          <h2>${esc(r.eventTitle)}</h2>
          <div class="meta">
            <span class="badge">📅 ${fmtDate(r.eventDate)}</span>
            <span class="badge">👥 ${r.seats} os.</span>
            ${r.status === 'cancelled'
              ? '<span class="badge red">Anulowany</span>'
              : r.status === 'reserve'
                ? '<span class="badge orange">Lista rezerwowa</span>'
                : '<span class="badge green">Potwierdzony</span>'}
          </div>
          <p class="muted">Numer zapisu: ${esc(r.id)}</p>
          ${r.status !== 'cancelled' ? `
            <div class="row">
              <button class="btn secondary" data-action="ics-reg" data-id="${esc(r.id)}">📅 Dodaj do kalendarza</button>
              <button class="btn danger" data-action="cancel" data-id="${esc(r.id)}">Rezygnuję</button>
            </div>` : ''}
        </article>
      `).join('')}
    `;
  } catch (err) {
    app.innerHTML = `<div class="empty">${esc(err.message)}</div>`;
  }
}

function viewInfo() {
  app.innerHTML = `
    <div class="card">
      <h2>O aplikacji</h2>
      <p class="desc">Aplikacja służy do zapisów na wydarzenia i inicjatywy organizowane oraz finansowane przez Toruńskie Centrum Usług Społecznych. Otrzymasz potwierdzenie e-mailem, a przypomnienie dotrze dzień przed wydarzeniem.</p>
    </div>
    <div class="card">
      <h2>Przypomnienia</h2>
      <p class="muted">Włącz powiadomienia, aby aplikacja przypominała Ci o wydarzeniach, na które jesteś zapisany(-a). Możesz też dodać wydarzenie do kalendarza systemowego telefonu przyciskiem „Dodaj do kalendarza”.</p>
      <button class="btn block" data-action="notify">🔔 Włącz powiadomienia</button>
    </div>
    <div class="card">
      <h2>Kontakt TCUS</h2>
      <p class="desc">ul. Konopnickiej 13/1, 87-100 Toruń
Zapisy telefoniczne: 56 611 89 40
Godziny pracy:
pon., śr., czw. 7:30–15:30
wt. 7:30–16:00
pt. 7:30–15:00</p>
    </div>
    <div class="card">
      <h2>Rezygnacja z udziału</h2>
      <p class="desc">Jeśli nie możesz przyjść, zrezygnuj w zakładce „Moje zapisy” – zwolnisz miejsce, które automatycznie trafi do pierwszej osoby z listy rezerwowej.</p>
    </div>
  `;
}

async function cancelRegistration(id) {
  if (!confirm('Czy na pewno chcesz zrezygnować? Miejsce zostanie zwolnione i przekazane osobie z listy rezerwowej.')) return;
  try {
    const result = await API.cancel(id);
    localStorage.removeItem(`tcus-reg-${id}`);
    toast(result.message + (result.promoted ? ' Osoba z listy rezerwowej została poinformowana.' : ''));
    viewMyRegistrations();
  } catch (err) {
    toast(err.message, true);
  }
}

function findEvent(id) {
  return state.events.find((e) => e.id === id);
}

document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const id = btn.dataset.id;
  switch (btn.dataset.action) {
    case 'details':
      location.hash = `#wydarzenie/${id}`;
      break;
    case 'back':
      location.hash = '#wydarzenia';
      break;
    case 'forget':
      localStorage.removeItem('tcus-profile');
      state.profile = null;
      viewMyRegistrations();
      break;
    case 'ics': {
      const ev = findEvent(id) || await API.event(id);
      ICS.download(ev);
      break;
    }
    case 'ics-reg': {
      const cached = JSON.parse(localStorage.getItem(`tcus-reg-${id}`) || 'null');
      if (cached) ICS.download(cached);
      else toast('Szczegóły wydarzenia niedostępne offline.');
      break;
    }
    case 'share': {
      const ev = findEvent(id) || await API.event(id);
      if (navigator.share) {
        navigator.share({ title: ev.title, text: `Wydarzenie TCUS: ${ev.title}`, url: location.href }).catch(() => {});
      } else {
        navigator.clipboard.writeText(location.href).then(() => toast('Link skopiowany do schowka.'));
      }
      break;
    }
    case 'notify': {
      const ok = await Notify.enable();
      toast(ok ? 'Powiadomienia włączone.' : 'Powiadomienia są zablokowane w ustawieniach przeglądarki.', !ok);
      break;
    }
    case 'cancel':
      cancelRegistration(id);
      break;
  }
});

document.querySelectorAll('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    location.hash = `#${btn.dataset.view}`;
  });
});

function setActiveNav(view) {
  document.querySelectorAll('.nav-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.view === view);
  });
}

async function route() {
  const hash = location.hash.replace(/^#\/?/, '') || 'wydarzenia';
  const [view, param] = hash.split('/');
  setActiveNav(view === 'wydarzenie' ? 'wydarzenia' : view);
  try {
    if (view === 'wydarzenie' && param) {
      await viewEventDetail(param);
    } else if (view === 'moje-zapisy') {
      await viewMyRegistrations();
    } else if (view === 'info') {
      viewInfo();
    } else {
      await loadEvents();
      viewEvents();
    }
  } catch (err) {
    app.innerHTML = `<div class="empty">${esc(err.message)}</div>`;
  }
}

window.addEventListener('hashchange', route);
route();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
