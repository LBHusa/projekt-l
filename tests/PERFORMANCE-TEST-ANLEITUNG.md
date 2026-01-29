# Performance-Test Anleitung für Projekt L

## Voraussetzungen

1. Node.js 18+ installiert
2. Projekt geklont und `npm install` ausgeführt
3. `.env.local` mit Supabase-Credentials vorhanden

---

## Schritt 1: Playwright installieren

```bash
cd /pfad/zu/projekt-l
npx playwright install chromium
```

---

## Schritt 2: Dev-Server starten (Terminal 1)

```bash
npm run dev -- --port 3050
```

Warte bis `Ready in X.Xs` erscheint.

---

## Schritt 3: Performance-Test ausführen (Terminal 2)

```bash
# Nur Performance-Test
npx playwright test performance-baseline --project=chromium --reporter=list

# Mit UI-Modus (Browser sichtbar)
npx playwright test performance-baseline --project=chromium --headed

# Alle Tests
npx playwright test --project=chromium
```

---

## Schritt 4: Ergebnisse kopieren

Nach dem Test siehst du Output wie:

```
📊 PERFORMANCE BASELINE:
   Dashboard Load Time: XXXXms
   DOM Content Loaded: XXXms
   Page Load Complete: XXXms
   DOM Interactive: XXXms
   Server Response: XXXms
   Resources Loaded: XX

📊 SUPABASE REQUESTS (Dashboard Load):
   Total Requests: XX
   1. GET /rest/v1/...
   2. GET /rest/v1/...
   ...
```

**Kopiere diesen kompletten Output und gib ihn mir.**

---

## Alternative: Network-Tab im Browser

Falls Playwright nicht funktioniert:

1. Chrome öffnen
2. DevTools → Network Tab
3. Checkbox "Preserve log" aktivieren
4. Zu http://localhost:3000/auth/login navigieren
5. Mit Test-Account einloggen
6. Auf Dashboard warten bis geladen
7. Screenshot vom Network-Tab machen (alle Requests)
8. In Console: `performance.timing` eingeben, Ergebnis kopieren

---

## Was ich brauche

1. **Dashboard Load Time** in ms
2. **Anzahl Supabase Requests**
3. **Liste der Requests** (zumindest die ersten 20)
4. **Browser Performance Timing** (optional)

---

## Troubleshooting

### "Browser not found"
```bash
npx playwright install chromium
```

### "Port 3050 in use"
```bash
npm run dev -- --port 3051
# Dann in playwright.config.ts baseURL anpassen
```

### Tests timeout
Erhöhe das Timeout in `playwright.config.ts`:
```typescript
timeout: 120000, // 2 Minuten
```
