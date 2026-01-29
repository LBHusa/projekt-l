# Performance-Analyse Projekt L - Dashboard

**Datum:** 2026-01-26
**Status:** Analyse abgeschlossen, ROOT CAUSE identifiziert

---

## Executive Summary

🔴 **KRITISCHES FINDING:** 79 Supabase-Requests bei einem Dashboard-Load!

**Root Cause:** `getUserIdOrCurrent()` ruft `supabase.auth.getUser()` für JEDE Data-Funktion auf. Kombiniert mit unabhängig ladenden Widgets ergibt das 15+ redundante Auth-Calls.

### Hauptengpässe (priorisiert):

1. **🔴 Auth Helper Pattern** - Jede Data-Funktion ruft `getUser()` auf
2. **🔴 Unabhängige Widget-Datenladung** - Kein Data Prop Drilling
3. **🟠 Client-Side Only Dashboard** - Alle Daten erst nach Hydration
4. **🟠 Kein Caching** - Jeder Seitenbesuch = alle Queries neu
5. **🟡 Viele parallele Queries** - 10+ in loadData(), weitere in Widgets

---

## 🔴 ROOT CAUSE ANALYSE

### Gemessene Daten (Playwright E2E Test)

```
📊 SUPABASE REQUESTS (Dashboard Load):
   Total Requests: 79

Breakdown:
   GET /auth/v1/user        ~15x  (getUser() calls)
   GET /rest/v1/skills      ~6x
   GET /rest/v1/user_skills ~6x
   GET /rest/v1/activity_log 2x
   GET /rest/v1/habit_logs   4x
   GET /rest/v1/achievements  2x
   GET /rest/v1/user_achievements 2x
   + viele weitere Domain-Queries...
```

### Das Auth Helper Anti-Pattern

**Datei:** `src/lib/auth-helper.ts:12-22`

```typescript
export async function getCurrentUserId(): Promise<string> {
  const supabase = createBrowserClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  // ...
  return user.id;
}
```

**Problem:** Diese Funktion wird von JEDER Data-Layer-Funktion aufgerufen:

```
getUserProfile(userId?)  → getUserIdOrCurrent() → getUser() → API
getHabits(userId?)       → getUserIdOrCurrent() → getUser() → API
getRecentActivity()      → getUserIdOrCurrent() → getUser() → API
getDomainStats(domainId) → getUserIdOrCurrent() → getUser() → API
... (30+ Funktionen)
```

### Widget Independence Anti-Pattern

Jedes Widget hat seinen eigenen `useEffect`:

```typescript
// HabitTrackerWidget.tsx:28-30
useEffect(() => {
  loadHabits();  // → getUser() + query
}, []);

// AchievementBadgeWidget.tsx:18-34
useEffect(() => {
  loadStats();   // → getUser() + query
}, []);

// RecentActivityFeed.tsx:131-133
useEffect(() => {
  loadActivities(); // → getUser() + query
}, []);
```

**Kein Data Prop Drilling** = Jedes Widget fetcht unabhängig.

### Warum 79 Requests?

```
page.tsx loadData()          → 10 Queries (+ 10 getUser() calls)
HabitTrackerWidget           → 1-4 Queries (+ getUser())
AchievementBadgeWidget       → 2 Queries (+ getUser())
RecentActivityFeed           → 1 Query (+ getUser())
TimeTrackingWidget           → 1-2 Queries (+ getUser())
WeeklySummary                → 2-3 Queries (+ getUser())
StreakHighlightWidget        → 1-2 Queries (+ getUser())
Domain Stats (N domains)     → N Queries (+ N getUser())
-------------------------------------------------------
TOTAL:                       ~40-60 Queries + ~15 getUser() = ~79 Requests
```

---

## Architektur-Mapping

### Middleware (`src/middleware.ts`)

```typescript
// Zeile 32 - EINZIGER Auth-Call im gesamten Request-Lifecycle
const { data: { user } } = await supabase.auth.getUser();
```

**Verantwortlichkeiten:**
- Auth-Check bei jedem Request (außer statische Assets)
- Redirect zu `/auth/login` wenn nicht eingeloggt
- Redirect zu `/` wenn eingeloggt und auf Login-Seite

**Kein Onboarding-Check!**

---

### useAuth Hook (`src/hooks/use-auth.ts`)

```typescript
// Zeile 28 - Session-Abruf beim Mount
const { data: { session }, error } = await supabase.auth.getSession();
```

**Verantwortlichkeiten:**
- Liefert `userId` und `user` für Client Components
- Auth State Change Listener
- Kein zusätzlicher DB-Call

**Clean Implementation!**

---

### Dashboard (`src/app/page.tsx`)

**Typ:** Client Component (`'use client'`)

**Datenladung (Zeile 110-121):**
```typescript
const results = await Promise.allSettled([
  getAllDomains(),               // Query 1
  getDomainByName('Familie'),    // Query 2
  getUserProfile(userId!),       // Query 3
  getTotalSkillCount(),          // Query 4
  getContactsStats(),            // Query 5
  getUpcomingBirthdays(14),      // Query 6
  getContactsNeedingAttention(5),// Query 7
  getFactionsWithStats(userId!), // Query 8
  getAccounts(userId!),          // Query 9
  calculateAttributes(userId!),  // Query 10
]);
```

**Zusätzliche Queries (Zeile 148-156):**
```typescript
// N extra Queries für Domain-Stats
const domainResults = await Promise.allSettled(
  filteredDomains.map(async (domain) => {
    const stats = await getDomainStats(domain.id);
    return { ...domain, level: stats.averageLevel || 1 };
  })
);
```

**Probleme:**
1. Alles Client-Side → Keine SSR-Vorteile
2. Kein Caching → Bei jeder Navigation werden alle Queries neu ausgeführt
3. Waterfall: Erst Auth → dann loadData() → dann Domain-Stats

---

## Datenfluss-Diagramm

```
┌─────────────────────────────────────────────────────────────────┐
│                         REQUEST                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ MIDDLEWARE (server-side)                                         │
│ └─ getUser() ────────────────────────────────── ~100-300ms      │
│    └─ Redirect to /auth/login if no user                        │
│    └─ Redirect to / if user on login page                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ PAGE RENDER (server-side RSC + client hydration)                 │
│ └─ HTML Shell gesendet ───────────────────────── ~50ms          │
│ └─ JS Bundle geladen ─────────────────────────── ~100-500ms     │
│ └─ Hydration ─────────────────────────────────── ~50-100ms      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ useAuth() HOOK (client-side)                                     │
│ └─ getSession() ──────────────────────────────── ~100-200ms     │
│    └─ setState({ userId, user })                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ useEffect → loadData() (client-side)                             │
│ └─ Promise.allSettled([                                         │
│      getAllDomains(),                    ─┐                     │
│      getDomainByName('Familie'),          │                     │
│      getUserProfile(userId),              │                     │
│      getTotalSkillCount(),                │  ~200-800ms         │
│      getContactsStats(),                  │  (parallel)         │
│      getUpcomingBirthdays(14),            │                     │
│      getContactsNeedingAttention(5),      │                     │
│      getFactionsWithStats(userId),        │                     │
│      getAccounts(userId),                 │                     │
│      calculateAttributes(userId),        ─┘                     │
│    ])                                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Domain Stats Queries (client-side, sequential after above)       │
│ └─ for each domain:                                              │
│      getDomainStats(domain.id) ────────────── ~50-100ms each    │
│                                                                  │
│    Bei 5 Domains: ~250-500ms extra                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ UI RENDER (Dashboard angezeigt)                                  │
│ └─ setLoading(false)                                            │
│ └─ Framer Motion Animationen                                    │
└─────────────────────────────────────────────────────────────────┘

TOTAL TIME: ~600-2000ms (abhängig von Supabase-Latenz)
```

---

## Bottleneck-Übersicht

| # | Bottleneck | Datei | Zeile | Impact | Aufwand |
|---|------------|-------|-------|--------|---------|
| 1 | Client-Side Dashboard | `page.tsx` | 1 | **Hoch** | Mittel |
| 2 | Kein Query-Caching | `page.tsx` | 107-189 | **Hoch** | Niedrig |
| 3 | 10 parallele Queries | `page.tsx` | 110-121 | **Mittel** | - |
| 4 | Domain-Stats Waterfall | `page.tsx` | 148-156 | **Mittel** | Niedrig |
| 5 | Framer Motion Overhead | `page.tsx` | 316+ | **Niedrig** | - |

---

## Optimierungs-Optionen (Priorisiert nach Impact)

### 🔴 KRITISCH: Fix Auth Helper Pattern

**Aufwand:** 30 Minuten
**Risiko:** Niedrig
**Impact:** -15 API Calls → ~64 statt 79

**Lösung:** UserId einmal holen und an alle Funktionen weitergeben:

```typescript
// page.tsx - VORHER
const results = await Promise.allSettled([
  getUserProfile(),        // calls getUser()
  getFactionsWithStats(),  // calls getUser()
  getAccounts(),           // calls getUser()
]);

// page.tsx - NACHHER
const userId = useAuth().userId;  // Bereits vorhanden!
const results = await Promise.allSettled([
  getUserProfile(userId),        // kein getUser()
  getFactionsWithStats(userId),  // kein getUser()
  getAccounts(userId),           // kein getUser()
]);
```

### 🔴 KRITISCH: Widget Data Consolidation

**Aufwand:** 2-3 Stunden
**Risiko:** Mittel
**Impact:** -20 API Calls → ~44 statt 64

**Lösung:** Dashboard lädt ALLE Daten, Widgets bekommen Props:

```typescript
// VORHER: Jedes Widget lädt selbst
<HabitTrackerWidget />           // eigener useEffect → getUser() + query
<AchievementBadgeWidget />       // eigener useEffect → getUser() + query
<RecentActivityFeed />           // eigener useEffect → getUser() + query

// NACHHER: Dashboard lädt, Widgets bekommen Props
const { habits, achievements, activities } = await loadAllDashboardData(userId);

<HabitTrackerWidget habits={habits} />
<AchievementBadgeWidget stats={achievements} />
<RecentActivityFeed activities={activities} />
```

---

### Option 1: React Query / TanStack Query (Zusätzlich empfohlen)

**Aufwand:** 2-3 Stunden
**Risiko:** Niedrig
**Impact:** Hoch für Navigation (Stale-While-Revalidate)

```typescript
// Beispiel-Implementierung
const { data: profile } = useQuery({
  queryKey: ['user-profile', userId],
  queryFn: () => getUserProfile(userId),
  staleTime: 60 * 1000, // 60s cached
});
```

**Vorteile:**
- Cache bleibt bei Navigation erhalten
- Background Refetch
- Deduplizierung paralleler Requests
- Optimistic Updates möglich

---

### Option 2: Server Component + Streaming

**Aufwand:** 4-6 Stunden
**Risiko:** Mittel
**Impact:** Hoch für First Paint

```typescript
// page.tsx als Server Component
export default async function Dashboard() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Parallel fetch server-side
  const [domains, profile, factions] = await Promise.all([
    getAllDomains(),
    getUserProfile(user.id),
    getFactionsWithStats(user.id),
  ]);

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent
        domains={domains}
        profile={profile}
        factions={factions}
      />
    </Suspense>
  );
}
```

**Vorteile:**
- Schnellerer First Paint
- SEO-Verbesserung (falls relevant)
- Streaming mit Suspense

**Nachteile:**
- Größerer Refactor nötig
- Client-State muss anders gehandhabt werden

---

### Option 3: Kombination (Best of Both)

**Aufwand:** 6-8 Stunden
**Risiko:** Mittel
**Impact:** Sehr Hoch

1. Server Component für initiales Laden
2. React Query für Client-Side Updates
3. Suspense Boundaries für Streaming

---

## Nicht-Empfohlen

- **Redux/Zustand für Server-State**: Overkill, React Query ist besser geeignet
- **Manual Cache mit localStorage**: Komplexität ohne Mehrwert
- **Service Worker Caching**: Zu komplex für den Use Case

---

## Priorisierte Roadmap (Aktualisiert)

### Phase 1: Auth Fix (30 Min) - HÖCHSTE PRIORITÄT

**Ziel:** 79 → ~64 Requests

1. In `page.tsx`: Alle `loadData()` Queries mit `userId` Parameter aufrufen
2. Sicherstellen dass `userId` von `useAuth()` verwendet wird

```typescript
// Änderung in page.tsx loadData()
const results = await Promise.allSettled([
  getAllDomains(),                      // ok, braucht kein userId
  getDomainByName('Familie'),           // ok
  getUserProfile(userId!),              // ✅ bereits korrekt
  getTotalSkillCount(userId!),          // 🔧 userId hinzufügen
  getContactsStats(userId!),            // 🔧 userId hinzufügen
  getUpcomingBirthdays(14, userId!),    // 🔧 userId hinzufügen
  getContactsNeedingAttention(5, userId!), // 🔧 userId hinzufügen
  getFactionsWithStats(userId!),        // ✅ bereits korrekt
  getAccounts(userId!),                 // ✅ bereits korrekt
  calculateAttributes(userId!),         // ✅ bereits korrekt
]);
```

### Phase 2: Widget Consolidation (2-3 Std)

**Ziel:** ~64 → ~30-40 Requests

1. `loadData()` erweitern um Widget-Daten:
   - `getTodaysHabits(userId)`
   - `getAchievementStats(userId)`
   - `getRecentActivity(userId)`

2. Widget-Props statt eigene Fetches:
   - `HabitTrackerWidget` → `habits` prop
   - `AchievementBadgeWidget` → `stats` prop
   - `RecentActivityFeed` → `activities` prop

### Phase 3: React Query Caching (2 Std)

**Ziel:** Navigation-Performance verbessern

1. `@tanstack/react-query` installieren
2. QueryClientProvider in `layout.tsx`
3. Data Functions mit `useQuery` wrappen
4. `staleTime: 60000` (60s Cache)

### Phase 4: Optional Server Components

**Ziel:** First Paint optimieren (wenn noch nötig nach Phase 1-3)

1. Dashboard zu RSC konvertieren
2. Suspense Boundaries für Streaming

---

## Metriken für Erfolgsmessung

| Metrik | Aktuell (gemessen) | Nach Phase 1 | Nach Phase 2 | Nach Phase 3 |
|--------|-------------------|--------------|--------------|--------------|
| Supabase Requests | **79** | ~64 | ~35 | ~35 (cached) |
| getUser() Calls | ~15 | ~2-3 | ~2-3 | ~2-3 |
| Dashboard Load Time | ~2000ms | ~1500ms | ~1000ms | <500ms (cached) |

### Erwarteter Request-Breakdown nach Optimierung:

```
Phase 1 (Auth Fix):
- getUser() calls:        15 → 2-3
- Queries unchanged:      ~64

Phase 2 (Widget Consolidation):
- Widget-Queries in loadData(): alle konsolidiert
- Gesamt:                 64 → ~35

Phase 3 (Caching):
- Erste Navigation:       ~35
- Zweite Navigation:      <5 (nur cache-miss)
```

---

## Fazit

### Root Cause
Das `getUserIdOrCurrent()` Pattern in Kombination mit unabhängig ladenden Widgets verursacht **79 Supabase-Requests** bei jedem Dashboard-Load, davon **15+ redundante getUser() Calls**.

### Empfohlene Reihenfolge

1. **Phase 1: Auth Fix** (30 Min, -15 Requests)
   - Niedrigstes Risiko
   - Sofortiger Impact
   - Keine Breaking Changes

2. **Phase 2: Widget Consolidation** (2-3 Std, -30 Requests)
   - Moderates Risiko
   - Größter Impact
   - Refactoring erforderlich

3. **Phase 3: React Query** (2 Std, Caching)
   - Niedrigstes Risiko
   - Impact bei Navigation
   - Unabhängig von Phase 1+2

### Betroffene Dateien

| Datei | Phase | Änderung |
|-------|-------|----------|
| `src/app/page.tsx` | 1, 2 | userId an alle Queries, Widget-Daten konsolidieren |
| `src/lib/auth-helper.ts` | - | Keine Änderung nötig |
| `src/lib/data/habits.ts` | 1 | Prüfen ob userId Parameter verwendet |
| `src/lib/data/contacts.ts` | 1 | userId Parameter hinzufügen |
| `src/lib/data/achievements.ts` | 2 | Neue Funktion für Dashboard-Stats |
| `src/lib/data/activity-log.ts` | 2 | Anpassung für konsolidiertes Laden |
| `src/components/dashboard/*.tsx` | 2 | Von eigenem Fetch zu Props wechseln |

---

*Analyse durchgeführt am: 2026-01-26*
*Test-Methode: Playwright E2E mit Request-Logging*
*Test-Account: Test (Supabase Auth)*
