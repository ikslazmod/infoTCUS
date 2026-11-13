# Konfiguracja Google Workspace dla TCUS Wydarzenia

## 1. Projekt w Google Cloud

1. Wejdź na https://console.cloud.google.com i utwórz projekt, np. `tcus-wydarzenia`.
2. Włącz API: **Google Calendar API**, **Google Sheets API**, **Google Drive API** (APIs & Services → Library).

## 2. Konto serwisowe (service account)

1. APIs & Services → Credentials → **Create Credentials → Service account**.
2. Nadaj nazwę, np. `tcus-app`. Nie potrzebuje ról projektu.
3. Keys → **Add key → Create new key → JSON**. Plik klucza zapisz jako `backend/secrets/service-account-key.json` (nigdy nie commituj go do repo — jest w `.gitignore`).
4. Skopiuj e-mail konta serwisowego (np. `tcus-app@tcus-wydarzenia.iam.gserviceaccount.com`) do `.env` jako `GOOGLE_SERVICE_ACCOUNT_EMAIL`.

Alternatywnie klucz można przekazać zmienną `GOOGLE_SERVICE_ACCOUNT_KEY_JSON` (treść JSON), co wygodne na hostingach PaaS.

## 3. Kalendarz Google

1. W Kalendarzu Google TCUS utwórz nowy kalendarz, np. „Wydarzenia TCUS".
2. Ustawienia kalendarza → **Udostępnij z konkretnymi osobami** → dodaj e-mail konta serwisowego z uprawnieniem **„Dokonaj zmian w wydarzeniach"**.
3. Z ustawień kalendarza skopiuj **ID kalendarza** (np. `c_xxx@group.calendar.google.com`) → `GOOGLE_CALENDAR_ID`.

Każde wydarzenie utworzone przez `POST /api/admin/events` pojawi się w tym kalendarzu z przypomnieniami (e-mail 24 h, pop-up 2 h).

## 4. Arkusz Google (Sheets) — lista gości + rezerwowa

1. Utwórz nowy arkusz w Google Sheets (na koncie TCUS), np. „TCUS — rejestr wydarzeń".
2. Udostępnij go e-mailowi konta serwisowego jako **Edytujący**.
3. Skopiuj ID z adresu URL (część między `/d/` a `/edit`) → `GOOGLE_SHEETS_ID`.
4. Aplikacja sama utworzy zakładki: **Lista gości**, **Lista rezerwowa**, **Wydarzenia** (przy pierwszym starcie backendu).

Ręczne dopisywanie osób zapisanych telefonicznie:
- bezpośrednio w arkuszu (zachowaj format wiersza), lub
- przez API: `POST /api/admin/registrations/manual` z `X-Organizer-Secret`.

## 5. Dysk Google — kopie zapasowe

1. Na Dysku Google TCUS utwórz folder, np. „TCUS — kopie zapasowe".
2. Udostępnij folder e-mailowi konta serwisowego jako **Edytujący**.
3. Skopiuj ID folderu z adresu URL → `GOOGLE_DRIVE_BACKUP_FOLDER_ID`.

Codziennie o 23:00 (konfigurowane `DAILY_BACKUP_CRON`) backend zapisuje tam:
- pełny eksport arkusza jako `.xlsx`,
- plik JSON z aktualną listą wydarzeń.

## 6. E-mail (potwierdzenia, przypomnienia, promocje z rezerwowej)

1. W Google Workspace dla domeny `torun.pl` utwórz konto, np. `wydarzenia@torun.pl` (lub użyj istniejącego).
2. Wygeneruj **hasło aplikacji**: konto Google → Security → 2-Step Verification → App passwords.
3. Wpisz w `.env`: `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`.

## 7. Zmienne środowiskowe

Skopiuj `backend/.env.example` do `backend/.env` i uzupełnij. **`ORGANIZER_SECRET`** ustaw jako długi losowy ciąg (np. `openssl rand -hex 32`) — chroni panel organizatora.
