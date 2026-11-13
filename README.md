# TCUS Wydarzenia — aplikacja zapisów dla Toruńskiego Centrum Usług Społecznych

Aplikacja mobilna typu **PWA** (działa jak aplikacja na Androidzie i iPhonie — instalowana ze strony, bez sklepu) do zapisów na wydarzenia i inicjatywy organizowane / finansowane przez TCUS, z powiadomieniami o nowych wydarzeniach i przypomnieniami o zbliżających się zapisach.

## Funkcje — strona mieszkańca (PWA)

- Lista aktualnych wydarzeń z danymi: data, godzina, miejsce, dla kogo, liczba wolnych miejsc
- Zapis online (imię, e-mail, telefon, liczba osób) + **potwierdzenie e-mail**
- Automatyczne umieszczanie na **liście rezerwowej**, gdy zabraknie miejsc
- **Moje zapisy** — podgląd po adresie e-mail, status (potwierdzony / rezerwowy / anulowany)
- **Rezygnacja** jednym przyciskiem — zwalnia miejsce, a pierwsza osoba z listy rezerwowej jest **automatycznie promowana i informowana e-mailem**
- **Dodaj do kalendarza systemowego** (plik .ics z wbudowanymi alarmami 24 h i 2 h przed wydarzeniem)
- **Powiadomienia push / lokalne** o nowych wydarzeniach i przypomnieniach
- Działa offline (service worker cache), instalowalna na ekranie głównym

## Funkcje — strona organizatora (integracja z Google Workspace)

| Wymaganie | Realizacja |
|---|---|
| Kalendarz Google | Każde nowe wydarzenie tworzone z panelu trafia do **Kalendarza Google** (`POST /api/admin/events`) z przypomnieniami e-mail/pop-up; edycja i usuwanie synchronizowane |
| Sheets — lista gości + rezerwowa | Arkusz Google z zakładkami **„Lista gości"** i **„Lista rezerwowa"**; każdy zapis dopisuje wiersz; rezygnacja usuwa wiersz; promocja z rezerwowej przenosi wiersz między zakładkami |
| Ręczne dopisywanie (telefon) | `POST /api/admin/registrations/manual` + panelowy podgląd (`GET /api/admin/registrations`) — źródło zapisu oznaczane jako „telefon/sekretariat" |
| Dysk Google — kopia zapasowa | Codzienny automatyczny eksport całego arkusza do **.xlsx na Dysku Google** + kopia JSON wydarzeń (`cron`, konfigurowalny); ręczny backup: `GET /api/admin/sheets/backup` |
| Informowanie o nowych wydarzeniach | Mass-mail do wszystkich zapisanych (`notifySubscribers`) + push w aplikacji |
| Przypomnienia | Serwerowy cron: e-mail 24–36 h przed wydarzeniem dla potwierdzonych uczestników |

## Struktura repozytorium

```
tcus-wydarzenia/
├── backend/               # Node.js + Express — API i integracje Google Workspace
│   ├── src/
│   │   ├── server.js      # bootstrap, statyczne serwowanie PWA
│   │   ├── config.js      # konfiguracja ze zmiennych środowiskowych
│   │   ├── store.js       # magazyn wydarzeń/zapisów (JSON)
│   │   ├── routes/        # events, registrations, admin (chroniony sekretem)
│   │   └── services/      # googleClient, googleCalendar, googleSheets, googleDrive, mailer, reminders
│   ├── data/events.seed.json   # 6 wydarzeń pobranych z oficjalnej strony TCUS
│   └── .env.example
├── frontend/              # PWA (vanilla JS, bez build-stepu)
│   ├── index.html, manifest.webmanifest, sw.js
│   ├── css/styles.css
│   ├── js/  (app.js — widoki i routing, api.js, ics.js, notify.js)
│   └── icons/ (wygenerowane placeholdery — do podmiany na branding TCUS)
└── docs/
    ├── KONFIGURACJA-GOOGLE.md   # krok po kroku: service account, kalendarz, arkusz, dysk
    └── WDROZENIE.md             # uruchomienie, HTTPS, instalacja PWA, bezpieczeństwo, RODO
```

## Szybki start

```bash
cd backend
npm install
cp .env.example .env       # uzupełnij dane z docs/KONFIGURACJA-GOOGLE.md
npm start                  # http://localhost:3000 — PWA i API pod jednym adresem
```

## API

| Metoda | Ścieżka | Opis |
|---|---|---|
| GET | `/api/events` | lista wydarzeń z liczbą wolnych miejsc |
| GET | `/api/events/:id` | szczegóły wydarzenia |
| POST | `/api/registrations/:eventId/register` | zapis (auto: potwierdzony lub rezerwowy) |
| GET | `/api/registrations/lookup?email=` | moje zapisy |
| POST | `/api/registrations/:id/cancel` | rezygnacja + auto-promocja z rezerwowej |
| POST | `/api/admin/events` | nowe wydarzenie → Kalendarz Google + Sheets (+ opcjonalny mailing) |
| PUT/DELETE | `/api/admin/events/:id` | edycja / usunięcie (synchronizacja z kalendarzem) |
| POST | `/api/admin/registrations/manual` | ręczne dopisanie osoby (np. zapis telefoniczny) |
| GET | `/api/admin/registrations` | pełna lista zapisów |
| GET | `/api/admin/sheets/backup` | ręczna kopia arkusza na Dysk Google |
| GET | `/api/admin/sheets/preview/:sheet` | podgląd arkusza (goscie / rezerwowa / wydarzenia) |

Endpointy `/api/admin/*` wymagają nagłówka `X-Organizer-Secret` (zmienna `ORGANIZER_SECRET`).

## Źródło danych startowych

Facebook (`m.facebook.com/CUSTorun`) blokuje automatyczny dostęp, dlatego lista 6 wydarzeń startowych została pobrana z oficjalnej strony **tcus.torun.pl/wydarzenia**, która publikuje te same treści. Aktualizacja odbywa się z panelu organizatora (tworzenie wydarzeń przez API) — docelowo można dodać synchronizację z Kalendarzem Google jako źródłem prawdy.

## Status

- ✅ Backend przetestowany dymnie: zapis, duplikaty, lookup, rezygnacja, autoryzacja admina, serwowanie PWA
- ⬜ Wymaga wdrożenia: konfiguracja Google Workspace (docs/KONFIGURACJA-GOOGLE.md), HTTPS, konto SMTP
