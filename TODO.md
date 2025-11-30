# Code Review - Guest Manager

Stand: 30.11.2025

---

## KRITISCH (Sofort fixen)

### 1. Race Condition bei Dateizugriff
- **Datei:** `src/repositories/guestRepository.js:31-69`
- **Problem:** Keine File-Locking. Gleichzeitige Schreibzugriffe überschreiben sich gegenseitig.
- **Szenario:** User A und B checken gleichzeitig aus → Datenverlust
- **Fix:** Atomic writes mit temp-file + rename:
```javascript
const { rename, writeFile } = require('fs/promises');

async function writeData(guests) {
  const tempPath = dataPath + '.tmp';
  await writeFile(tempPath, JSON.stringify({ guests }, null, 2), 'utf-8');
  await rename(tempPath, dataPath); // Atomic auf den meisten Filesystemen
}
```

---

### 2. NaN Port crasht Server
- **Datei:** `src/config/index.js:8`
- **Problem:** `parseInt(PORT)` gibt NaN zurück wenn PORT ungültig
- **Fix:**
```javascript
const port = parseInt(process.env.PORT || '3000', 10);
if (isNaN(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid PORT: ${process.env.PORT}`);
}
```

---

### 3. API Client crasht bei Non-JSON Response
- **Datei:** `src/services/apiClient.js:27`
- **Problem:** `response.json()` ohne try-catch crasht wenn Server HTML/Text zurückgibt
- **Fix:**
```javascript
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers }
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
    }

    if (!response.ok) {
      throw new Error(data.error?.message || data.message || 'API request failed');
    }
    return data.data;
  } catch (error) {
    throw new Error(`API request to ${endpoint} failed: ${error.message}`);
  }
}
```

---

### 4. Stille Fehler verschluckt
- **Datei:** `src/controllers/guestController.js:64,101,120`
- **Problem:** `.catch(() => {})` verschluckt Telegram-Fehler komplett
- **Fix:**
```javascript
// Zeile 64:
notifyCheckin(guest, 'website').catch((err) => {
  console.error('Telegram notification failed:', err.message);
});

// Zeile 101:
notifyDelete(guest, 'website').catch((err) => {
  console.error('Telegram notification failed:', err.message);
});

// Zeile 120:
notifyCheckout(guest, 'website').catch((err) => {
  console.error('Telegram notification failed:', err.message);
});
```

---

## HOCH (Bald fixen)

### 5. Error-Counter reset nie
- **Datei:** `src/services/telegramBot.js:398-425`
- **Problem:** `errorCount` wird nie zurückgesetzt. Nach 3 Fehlern (egal wann) stoppt Bot für immer.
- **Fix:** Reset nach erfolgreichen Commands oder Zeit-Fenster nutzen:
```javascript
let errorCount = 0;
let lastErrorTime = 0;
const ERROR_WINDOW = 60000; // 1 Minute

bot.on('polling_error', (error) => {
  const now = Date.now();
  if (now - lastErrorTime > ERROR_WINDOW) {
    errorCount = 0; // Reset wenn außerhalb Fenster
  }
  errorCount++;
  lastErrorTime = now;
  // ... rest
});

// Nach erfolgreichen Commands:
errorCount = 0;
```

---

### 6. Startup Race Condition
- **Datei:** `src/services/telegramBot.js:434-437`
- **Problem:** `setTimeout(2000)` ist willkürlich, Bot evtl. noch nicht ready
- **Fix:** Event-basiert warten:
```javascript
// Statt setTimeout:
bot.on('polling_start', () => {
  console.log('Telegram Bot: Polling started');
  sendStartupNotification();
});
```

---

### 7. Keine Input-Validation im API Client
- **Datei:** `src/services/apiClient.js:70-75`
- **Problem:** guestId wird nicht validiert, könnte null/undefined sein
- **Fix:**
```javascript
export async function checkoutGuest(guestId) {
  if (!guestId || typeof guestId !== 'string') {
    throw new Error('Invalid guestId');
  }
  const result = await request(`/guests/${guestId}/checkout`, { method: 'POST' });
  return result.guest;
}

// Analog für deleteGuest, etc.
```

---

### 8. Null-Checks fehlen im Frontend
- **Datei:** `public/js/app.js:94,261,301`
- **Problem:** `guest` könnte undefined sein
- **Fix:**
```javascript
// Zeile 94:
const guest = state.guests.find(g => g?.id === guestId);
if (!guest) {
  ui.showToast('Gast nicht gefunden', 'error');
  return;
}

// Analog für andere Stellen
```

---

### 9. TOCTOU Race Condition
- **Datei:** `src/services/guestService.js:82-100`
- **Problem:** Zwischen Overlap-Check und Insert kann anderer Request einfügen
- **Workaround:** Unique constraint in Datenbank oder optimistic locking
- **Minimal-Fix:** Retry-Logic bei Conflict-Error

---

### 10. Daten-Validation fehlt im Repository
- **Datei:** `src/repositories/guestRepository.js:40-47`
- **Problem:** Korrupte JSON wird akzeptiert ohne Struktur-Prüfung
- **Fix:**
```javascript
function validateGuest(g) {
  if (!g || typeof g !== 'object') return false;
  if (!g.id || typeof g.id !== 'string') return false;
  if (!g.arrivalDate || !g.departureDate) return false;
  return true;
}

async function readData() {
  // ... existing code ...
  const validGuests = data.guests.filter(g => {
    if (!validateGuest(g)) {
      console.warn('Invalid guest object found:', g);
      return false;
    }
    return true;
  });
  return validGuests;
}
```

---

## MITTEL (Nice to have)

### 11. Doppelter Code - Date Utilities
- **Dateien:** `src/utils/dateUtils.js` + `public/js/ui.js:11-39`
- **Problem:** formatDate, getToday, getTomorrow sind dupliziert
- **Fix:** Shared module oder API-Endpunkt für Datum-Infos

---

### 12. Fehlende Umlaute im Frontend
- **Datei:** `public/js/app.js:234,323-324`
- **Problem:** "Mochten" statt "Möchten", "loschen" statt "löschen"
- **Fix:** Korrekte UTF-8 Strings verwenden

---

### 13. Kein Rate-Limiting für Telegram Bot
- **Datei:** `src/services/telegramBot.js`
- **Problem:** User kann Commands spammen
- **Fix:**
```javascript
const userRateLimit = new Map();
const RATE_LIMIT = { window: 60000, max: 10 };

function checkRateLimit(chatId) {
  const now = Date.now();
  const user = userRateLimit.get(chatId) || { count: 0, timestamp: now };

  if (now - user.timestamp > RATE_LIMIT.window) {
    user.count = 1;
    user.timestamp = now;
  } else if (user.count >= RATE_LIMIT.max) {
    return false;
  } else {
    user.count++;
  }

  userRateLimit.set(chatId, user);
  return true;
}
```

---

### 14. Guest Name nicht sanitized
- **Datei:** `src/controllers/guestController.js:61`
- **Problem:** HTML-Injection theoretisch möglich
- **Fix:** Name sanitizen oder bei Ausgabe escapen

---

### 15. Timezone-Probleme
- **Datei:** `src/utils/dateUtils.js:10-23`
- **Problem:** Server-Timezone vs Client-Timezone könnte unterschiedlich sein
- **Fix:** Explizit Timezone dokumentieren oder UTC verwenden

---

### 16. Leerer Name wird akzeptiert
- **Datei:** `src/models/guest.js:67-69`
- **Problem:** `name: ""` wird nicht rejected
- **Fix:** In validateGuestInput prüfen:
```javascript
if (data.name !== undefined && data.name.trim() === '') {
  errors.push('name cannot be empty');
}
```

---

### 17. Telegram Callback Data nicht validiert
- **Datei:** `src/services/telegramBot.js:318,356`
- **Problem:** callback_data ist user-controlled
- **Fix:** UUID-Format validieren:
```javascript
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

if (data.startsWith('checkout_')) {
  const guestId = data.substring('checkout_'.length);
  if (!UUID_REGEX.test(guestId)) {
    bot.answerCallbackQuery(callbackQuery.id, { text: 'Ungültige Anfrage' });
    return;
  }
  // ...
}
```

---

### 18. Schwache Date-Validation im Frontend
- **Datei:** `public/js/app.js:191`
- **Problem:** String-Vergleich für Datum
- **Fix:** Date-Objekte verwenden:
```javascript
const arrival = new Date(data.arrivalDate);
const departure = new Date(data.departureDate);
if (departure < arrival) {
  ui.showToast('Abreise muss nach Ankunft sein', 'error');
  return;
}
```

---

### 19. DATA_PATH nicht validiert
- **Datei:** `src/config/index.js:15`
- **Problem:** Beliebiger Pfad könnte gesetzt werden
- **Fix:** Pfad auf data-Verzeichnis beschränken

---

### 20. Notification-Loop Fehler nicht aggregiert
- **Datei:** `src/services/telegramNotifier.js:47-54`
- **Problem:** Einzelne Fehler geloggt, aber kein Gesamtüberblick
- **Fix:** Promise.allSettled verwenden und zusammenfassen

---

## NIEDRIG (Optional)

### 21. Magic Numbers
- **Datei:** `src/services/telegramBot.js:399`
- **Fix:** Konstanten definieren:
```javascript
const TELEGRAM_CONFIG = {
  MAX_POLLING_ERRORS: 3,
  STARTUP_DELAY_MS: 2000
};
```

---

### 22. Fehlendes Audit-Logging
- **Datei:** `src/repositories/guestRepository.js`
- **Fix:** CRUD-Operationen loggen für Debugging

---

### 23. Inkonsistente API Response Struktur
- **Datei:** `src/controllers/guestController.js`
- **Problem:** Mal `{ status }`, mal `{ guest }`
- **Fix:** Einheitliche Struktur

---

### 24. JSDoc fehlt
- **Diverse Dateien**
- **Fix:** Dokumentation für komplexe Funktionen

---

### 25. Unused Imports prüfen
- **Datei:** `public/js/app.js`
- **Fix:** ESLint konfigurieren

---

## SICHERHEIT

### 26. Keine API-Authentifizierung
- **Dateien:** `src/routes/guestRoutes.js`
- **Problem:** Alle Endpoints sind öffentlich
- **Fix:** API-Key Middleware:
```javascript
const API_KEY = process.env.API_KEY;

function apiKeyMiddleware(req, res, next) {
  // Skip für /status (wird von 1home gebraucht)
  if (req.path === '/status') return next();

  const key = req.header('X-API-Key');
  if (!API_KEY || key !== API_KEY) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  next();
}
```

---

## Zusammenfassung

| Priorität | Anzahl | Status |
|-----------|--------|--------|
| KRITISCH | 4 | [ ] |
| HOCH | 6 | [ ] |
| MITTEL | 10 | [ ] |
| NIEDRIG | 5 | [ ] |
| SICHERHEIT | 1 | [ ] |
| **Gesamt** | **26** | |

---

## Empfohlene Reihenfolge

1. **Kritisch 1-4** zuerst (Stabilität)
2. **Hoch 5-6** (Telegram Bot Stabilität)
3. **Sicherheit 26** (API-Key)
4. **Mittel 12** (Umlaute - schneller Fix)
5. Rest nach Bedarf
