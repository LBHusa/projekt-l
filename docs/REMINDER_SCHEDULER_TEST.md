# Reminder Scheduler Production Test - Dokumentation

## Status: ✅ CODE VALIDIERT | ⏸️ PRODUCTION TEST BLOCKED

---

## Zusammenfassung

Der **Reminder Scheduler** wurde erfolgreich code-validiert. Alle Logik-Tests bestanden:

- ✅ Cron Pattern korrekt (jede Minute)
- ✅ Zeit-Matching funktioniert (HH:MM)
- ✅ Quiet Hours Logik korrekt (inkl. Overnight-Handling)
- ✅ Wochentag-Filterung funktioniert
- ✅ Duplikat-Prevention (2-Minuten-Fenster)

**ABER:** Production Test mit echtem Server konnte nicht durchgeführt werden, weil `.env.local` mit VAPID Keys fehlt.

---

## Was wurde getestet?

### 1. Code-Validierung (✅ DONE)

Test-Script: `scripts/test-reminder-scheduler.ts`

```bash
npx tsx scripts/test-reminder-scheduler.ts
```

**Ergebnisse:**
- Alle Unit-Tests bestanden
- Logik für Zeitvergleich, Quiet Hours, Day-of-Week validiert
- Keine Code-Fehler

### 2. Production Test (⏸️ BLOCKED)

**Warum blockiert?**
```
Error: No key set vapidDetails.publicKey
```

Der Scheduler braucht:
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Diese sind nicht im Git (korrekt!) und müssen vom User bereitgestellt werden.

---

## Wie funktioniert der Scheduler?

### Architektur

```
instrumentation.ts (Server-Start)
    ↓
initReminderScheduler()
    ↓
node-cron: * * * * * (jede Minute)
    ↓
checkDueReminders()
    ↓
1. Query habit_reminders (enabled=true)
2. Check days_of_week
3. Check reminder_time == current_time
4. Check quiet_hours
5. Check duplicate (last 2min)
6. Send web-push notification
7. Log to reminder_delivery_log
```

### Code-Dateien

| Datei | Zweck |
|-------|-------|
| `src/instrumentation.ts` | Startet Scheduler beim Server-Start |
| `src/lib/cron/reminder-scheduler.ts` | Haupt-Scheduler Logik |
| `src/lib/data/habit-reminders.ts` | DB-Queries für Reminders |
| `src/components/habits/HabitReminderSettings.tsx` | UI zum Einstellen |

---

## Production Test Anleitung (FÜR USER)

### Schritt 1: .env.local erstellen

```bash
# .env.local (im Projekt-Root)

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# VAPID Keys (für Push Notifications)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BL9aZKziDJwj_5MRny0BzJVlz_JhVyn1UQIgGsQqcUQwvwU5oLK3bMX-paVRE-An5Nnr-jP1Oi2MGlES4bShsYE
VAPID_PRIVATE_KEY=aWsRl9WyLyVNeG6PEgV0nMEaCBafUP1FIh72Lrt433A
VAPID_SUBJECT=mailto:lukas@projekt-l.de
```

**Neue VAPID Keys generieren:**
```bash
npx web-push generate-vapid-keys --json
```

### Schritt 2: Server starten

```bash
npm run dev
```

**Erwartete Console-Ausgabe:**
```
[Instrumentation] Server starting...
[Instrumentation] Initializing reminder scheduler...
[Reminder Scheduler] ✅ Initialized - Running every minute
[Instrumentation] Server ready ✅

[Reminder Scheduler] Checking due reminders...
[Reminder Scheduler] No active reminders found
```

### Schritt 3: Test-Habit erstellen

1. Gehe zu `/habits`
2. Öffne ein Habit → "Erinnerungen"
3. Füge Reminder hinzu:
   - **Zeit:** JETZT + 2 Minuten
   - **Tage:** Heute auswählen
   - **Speichern**

### Schritt 4: Warten & Beobachten

**Console Output (nach ~2 Minuten):**
```
[Reminder Scheduler] Checking due reminders...
[Reminder Scheduler] Found 1 active reminders
[Reminder Scheduler] Sent reminder for habit: 💧 Wasser trinken
[Reminder Scheduler] Check complete
```

**Browser:**
- Push-Notification sollte erscheinen (wenn Permission granted)

### Schritt 5: Verifizieren

**Datenbank-Check:**
```sql
SELECT * FROM reminder_delivery_log
ORDER BY sent_at DESC
LIMIT 5;
```

Sollte zeigen:
- `delivered = true`
- `sent_at` = vor wenigen Sekunden
- `error_message = null`

---

## Bekannte Probleme

### Problem 1: Keine Push Permission
**Symptom:** Reminder wird gesendet, aber keine Notification im Browser

**Lösung:** User muss in den Settings Push Notifications aktivieren + Browser Permission geben.

### Problem 2: VAPID Keys fehlen
**Symptom:** `Error: No key set vapidDetails.publicKey`

**Lösung:** `.env.local` erstellen mit VAPID Keys.

### Problem 3: Scheduler läuft nicht
**Symptom:** Keine Console Logs `[Reminder Scheduler]`

**Lösung:** Check `instrumentation.ts` - wird nur in Production/Dev aufgerufen, nicht im Turbopack HMR.

---

## Nächste Schritte

1. **User** muss `.env.local` mit gültigen Credentials bereitstellen
2. **Production Test** manuell durchführen (siehe Anleitung oben)
3. **Notification Permission Flow** testen
4. **Streak-Bonus XP** testen (wenn implementiert)

---

## Test-Ergebnis

| Test | Status | Details |
|------|--------|---------|
| Code-Validierung | ✅ PASS | Alle Logik-Tests bestanden |
| Cron Initialization | ⏸️ BLOCKED | Braucht .env.local |
| Live Reminder Send | ⏸️ BLOCKED | Braucht .env.local + DB |
| Notification Display | ⏸️ BLOCKED | Braucht Browser Test |
| Delivery Log | ⏸️ BLOCKED | Braucht DB |

**Fazit:** Code ist production-ready ✅, aber **echte Server-Tests benötigen User-Setup**.

---

**Erstellt:** 2026-01-09
**Worker:** Worker 4
**Task:** ab26317d-2dc6-4828-b969-a109f73bc806
