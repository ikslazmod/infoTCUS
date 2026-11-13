# Wdrożenie i eksploatacja

## 1. Wymagania

- Node.js ≥ 20
- Domena z obsługą HTTPS (wymóg przeglądarek dla PWA, powiadomień push i geolokalizacji)
- Google Workspace TCUS (Kalendarz, Sheets, Drive) — patrz `KONFIGURACJA-GOOGLE.md`

## 2. Uruchomienie

```bash
cd backend
npm install --omit=dev
cp .env.example .env    # uzupełnij konfigurację
npm start               # serwuje PWA i API na jednym porcie
```

Backend serwuje pliki z `frontend/`, więc wystarczy jeden proces i jedna domena, np. `https://wydarzenia.tcus.torun.pl`.

### Przykładowy hosting

- **VPS (zalecane dla samorządu):** `systemd` + nginx (proxy na port 3000) + certbot (Let's Encrypt).
- **PaaS:** Render / Railway / Fly.io — ustaw zmienne środowiskowe z `.env.example`, klucz konta serwisowego przekaż jako `GOOGLE_SERVICE_ACCOUNT_KEY_JSON`.

### Przykład systemd

```ini
[Unit]
Description=TCUS Wydarzenia
After=network.target

[Service]
WorkingDirectory=/opt/tcus-wydarzenia/backend
ExecStart=/usr/bin/node src/server.js
Restart=always
User=tcus
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

## 3. Instalacja aplikacji u mieszkańców

1. Otwórz adres aplikacji w przeglądarce telefonu (Chrome / Safari).
2. Android: menu → „Dodaj do ekranu głównego". iOS: Udostępnij → „Do ekranu początkowego".
3. Aplikacja uruchamia się potem jak natywna, działa też offline (lista wydarzeń z cache).

## 4. Praca organizatora (na start)

Tworzenie wydarzenia (np. z `curl` lub prostego panelu):

```bash
curl -X POST https://wydarzenia.tcus.torun.pl/api/admin/events \
  -H "X-Organizer-Secret: $ORGANIZER_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Warsztaty ceramiki",
    "date": "15/12/2026",
    "time": "17:00",
    "location": "TCUS, ul. Konopnickiej 13/1",
    "audience": "Dorośli",
    "capacity": 15,
    "description": "Opis wydarzenia...",
    "notifySubscribers": true
  }'
```

Skutek: wydarzenie w Kalendarzu Google, wiersz w zakładce „Wydarzenia" w Sheets, mailing do zapisanych osób, pozycja w aplikacji.

Ręczne dopisanie osoby zapisanej telefonicznie:

```bash
curl -X POST https://wydarzenia.tcus.torun.pl/api/admin/registrations/manual \
  -H "X-Organizer-Secret: $ORGANIZER_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"eventId":"warsztaty-ceramiki","name":"Jan Nowak","phone":"600 100 200","seats":1}'
```

## 5. Bezpieczeństwo i RODO

- `.env` i `secrets/` nigdy nie trafiają do repo (`.gitignore`).
- Panel organizatora chroniony `X-Organizer-Secret`; przy publicznym wdrożeniu dodatkowo ogranicz `/api/admin/*` w nginx do sieci TCUS lub VPN.
- W aplikacji zbierane są wyłącznie: imię i nazwisko, e-mail, (opcjonalnie) telefon i liczba osób — minimalizacja danych do celu zapisów. Dane przechowywane w Google Workspace TCUS (umowa powierzenia RODO z Google). Rekomendowane: dodanie w zakładce „Informacje" klauzuli informacyjnej IOD miasta Torunia przed uruchomieniem produkcyjnym.
- Kopie zapasowe: codzienne na Dysku Google; retencję ustal organizacyjnie (np. 12 miesięcy).

## 6. Znane ograniczenia i dalszy rozwój

- Powiadomienia push w tle wymagają kluczy VAPID (web-push) — obecnym rozwiązaniem jest e-mail z serwera + powiadomienia lokalne w aplikacji; dodanie VAPID to ~1 dzień pracy.
- Magazyn danych to pliki JSON — przy dużym wolumenie zapisów warto przejść na PostgreSQL/Supabase; struktura serwisów to ułatwia.
- Panel organizatora jest obecnie API-first (curl / Sheets); prosty ekran administracyjny można dodać w tym samym frontendzie.
- Ikony w `frontend/icons/` są placeholderami — do podmiany na logo TCUS.
