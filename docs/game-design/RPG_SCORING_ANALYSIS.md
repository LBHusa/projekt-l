# RPG Scoring System Analysis
**Game Designer Perspektive**

**Analysedatum:** 2026-01-10
**Autor:** Worker 4 (Claude)
**Status:** Analyse-Phase

---

## Executive Summary

Das aktuelle Projekt L RPG-System hat **4 separate Scoring-Mechanismen**, die größtenteils **isoliert voneinander operieren**. Diese Analyse identifiziert die Probleme und schlägt ein kohärentes System vor, bei dem alle Elemente logisch zusammenhängen.

### 🚨 Hauptprobleme

1. **Attributes (STR, DEX, INT, etc.)** – Statische Werte, keine Berechnung aus Skills
2. **Factions (7 Lebensbereiche)** – XP-System existiert, aber kein Trigger bei Skill-XP
3. **Mental Stats (Mood, Energy, Stress, Focus)** – Komplett disconnected
4. **Total Level** – Verwendet korrekte exponentielle Formel, aber isoliert

---

## 1. Ist-Analyse: Aktuelle Systeme

### 1.1 Skills & XP-System ✅ FUNKTIONIERT

**Formel:** `xpForLevel(level) = floor(100 * level^1.5)`

```typescript
// src/lib/xp.ts
export function xpForLevel(level: number): number {
  if (level <= 0) return 0;
  return Math.floor(100 * Math.pow(level, 1.5));
}
```

**Level-Kurve:**
- Level 1: 100 XP
- Level 10: 3,162 XP
- Level 25: 12,500 XP
- Level 50: 35,355 XP
- Level 100: 100,000 XP

**Status:** ✅ **Korrekt implementiert**
- Exponentielle Skalierung verhindert zu schnelles Leveling
- User Skills tracken XP pro Skill individuell
- Level-Ups korrekt berechnet

**XP-Flow:**
```
User loggt Skill XP
  ↓
addXpToSkill(skillId, xpAmount)
  ↓
1. user_skills.current_xp += xpAmount
2. Level-Up Berechnung (falls xp >= xpForLevel(level+1))
3. experience Log erstellt
4. Faction Stats sollten aktualisiert werden ⚠️
```

---

### 1.2 Factions (7 Lebensbereiche) ⚠️ TEILWEISE

**Formel:** `level = floor(sqrt(totalXp/100)) + 1`

```typescript
// src/lib/data/factions.ts
export function calculateFactionLevel(totalXp: number): number {
  if (totalXp <= 0) return 1;
  return Math.max(1, Math.floor(Math.sqrt(totalXp / 100)) + 1);
}
```

**Level-Kurve:**
- Level 1: 0-99 XP
- Level 2: 100-399 XP
- Level 5: 2,500-3,599 XP
- Level 10: 10,000-12,099 XP

**Die 7 Factions:**
1. `karriere` – Berufsleben & Karriere
2. `koerper` – Fitness & Gesundheit
3. `geist` – Mental Health & Mindfulness
4. `finanzen` – Geld & Finanzielle Freiheit
5. `sozial` – Beziehungen & Freundschaften
6. `wissen` – Lernen & Bildung
7. `abenteuer` – Hobbies & Erlebnisse

**Status:** ⚠️ **System existiert, aber nicht integriert**

**Probleme:**
1. ❌ **Kein Trigger:** `addXpToSkill()` aktualisiert Faction Stats NICHT automatisch
2. ❌ **Keine Domain-Mapping:** Skill Domains haben `faction_key`, aber es wird nicht genutzt
3. ⚠️ **Manuelle XP-Logs:** Nur Mood/Journal triggern Faction XP (geist), Skills tun es nicht

**Code-Evidenz:**
```typescript
// src/lib/data/user-skills.ts:126-180
export async function addXpToSkill(...) {
  // ...
  // Get faction for skill
  const factionId = factionOverride || await getFactionForSkill(skillId);

  // ⚠️ PROBLEM: updateFactionStats wird aufgerufen, ABER...
  if (factionId) {
    try {
      const factionResult = await updateFactionStats(factionId, xpAmount, userId);
      // Funktioniert eigentlich! ✅
    } catch (err) {
      console.error('Failed to update faction stats:', err);
    }
  }
}
```

**Update:** Nach genauerer Code-Analyse funktioniert der Faction-Trigger **tatsächlich**!
- ✅ `addXpToSkill()` ruft `getFactionForSkill()` auf
- ✅ `updateFactionStats()` wird mit XP-Amount aufgerufen
- ✅ Faction Level wird via DB-Function `update_faction_stats` recalculated

**Revidierte Bewertung:** ✅ **FUNKTIONIERT KORREKT**

---

### 1.3 Attributes (STR, DEX, INT, CHA, WIS, VIT) ❌ BROKEN

**Datenstruktur:**
```typescript
// src/lib/database.types.ts
export interface UserAttributes {
  str: number; // Strength (Stärke)
  dex: number; // Dexterity (Geschicklichkeit)
  int: number; // Intelligence (Intelligenz)
  cha: number; // Charisma
  wis: number; // Wisdom (Weisheit)
  vit: number; // Vitality (Vitalität)
}
```

**Speicherung:** `user_profiles.attributes` (JSONB)

**Status:** ❌ **KOMPLETT STATISCH**

**Probleme:**
1. ❌ **Keine Berechnung:** Werte sind hardcoded
2. ❌ **Keine Skill-Relation:** Skills beeinflussen Attributes NICHT
3. ❌ **Kein Leveling-System:** Attributes ändern sich nie
4. ❌ **Willkürliche Werte:** Test-User hat `{str:42, dex:78, int:89, cha:61, wis:68, vit:52}`

**Erwartung vs. Realität:**
| Erwartung | Realität |
|-----------|----------|
| STR steigt durch Fitness-Skills | ❌ Statisch |
| INT steigt durch Wissen-Skills | ❌ Statisch |
| DEX steigt durch Skill-Übung | ❌ Statisch |

---

### 1.4 Mental Stats (Mood, Energy, Stress, Focus) ❌ DISCONNECTED

**Datenstruktur:**
```sql
CREATE TABLE mental_stats_logs (
  mood INTEGER CHECK (mood >= 1 AND mood <= 5),
  energy INTEGER CHECK (energy >= 1 AND energy <= 5),
  stress INTEGER CHECK (stress >= 1 AND stress <= 5),
  focus INTEGER CHECK (focus >= 1 AND focus <= 5),
  ...
)
```

**Status:** ❌ **NUR LOGGING, KEINE GAME-MECHANIK**

**Aktuell:**
- ✅ User kann Mental Stats manuell loggen
- ✅ Chart-Visualisierung vorhanden
- ❌ Stats beeinflussen **NICHTS** im RPG-System
- ❌ Keine Skills triggern Mental Stats
- ❌ Keine Faction-Einflüsse

**Missed Opportunities:**
- 🚫 Energy könnte Daily Quest Slots beeinflussen
- 🚫 Stress könnte XP-Gain multiplier verringern
- 🚫 Focus könnte Skill-XP bonus geben
- 🚫 Mood könnte Faction XP boosten

---

## 2. Problem-Zusammenfassung

### 2.1 Die 4 Silos

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Skills     │  │   Factions   │  │  Attributes  │  │Mental Stats  │
│   + XP       │  │   + Level    │  │   Static     │  │  Logging     │
│              │  │              │  │              │  │              │
│   ✅ Works    │  │  ✅ Works     │  │   ❌ Broken   │  │ ❌ Isolated  │
└──────┬───────┘  └──────┬───────┘  └──────────────┘  └──────────────┘
       │                  │
       │         ✅ CONNECTED
       └──────────────────┘

       ❌ Attributes hängen NICHT von Skills ab
       ❌ Mental Stats beeinflussen NICHTS
```

### 2.2 Spezifische Inkonsistenzen

| Problem | Detail |
|---------|--------|
| **Attribute Source** | Woher kommen STR/DEX/INT Werte? Keine Antwort. |
| **Mental Impact** | Mental Stats sind reine Logs ohne Game-Mechanik |
| **Two XP Systems** | Skills nutzen `level^1.5`, Factions `sqrt(xp)` – BEIDE KORREKT, aber unterschiedlich |
| **Missing Links** | Skills → Attributes fehlt komplett |

---

## 3. Vorgeschlagenes kohärentes System

### 3.1 Design-Philosophie

**Kernprinzip:** Alles startet mit **Skill XP**

```
                    USER LOGGT XP
                         ↓
            ┌────────────┴────────────┐
            ↓                         ↓
       SKILL LEVEL              FACTION XP
            ↓                         ↓
      ATTRIBUTES                FACTION LEVEL
            ↓                         ↓
     MENTAL STATS ←───────────────────┘
```

### 3.2 Skill → Attribute Berechnung

**Konzept:** Attributes werden **dynamisch aus Skills berechnet**

#### Option A: Weighted Average (Empfohlen)

```typescript
// Beispiel für STR (Stärke)
function calculateSTR(userSkills: UserSkill[]): number {
  const relevantSkills = [
    { skillId: 'fitness_krafttraining', weight: 1.0 },
    { skillId: 'koerper_boxen', weight: 0.8 },
    { skillId: 'koerper_klettern', weight: 0.6 },
  ];

  const weighted = relevantSkills
    .map(s => {
      const skill = userSkills.find(us => us.skill_id === s.skillId);
      return (skill?.level || 0) * s.weight;
    })
    .reduce((sum, val) => sum + val, 0);

  return Math.min(100, Math.floor(weighted));
}
```

**Mapping-Vorschlag:**

| Attribute | Hauptskills | Formel |
|-----------|-------------|--------|
| **STR** | Krafttraining (1.0), Boxen (0.8), Klettern (0.6) | Weighted Avg |
| **DEX** | Programming (0.9), Gitarre (0.7), Gaming (0.5) | Weighted Avg |
| **INT** | Coding (1.0), Math (0.9), Data Science (0.8) | Weighted Avg |
| **CHA** | Public Speaking (1.0), Networking (0.8), Writing (0.6) | Weighted Avg |
| **WIS** | Meditation (1.0), Philosophie (0.8), Journaling (0.6) | Weighted Avg |
| **VIT** | Sleep (0.9), Nutrition (0.9), Cardio (0.8) | Weighted Avg |

#### Option B: Domain-Based (Alternativ)

```typescript
function calculateAttributeFromDomain(domainId: string, userSkills: UserSkill[]): number {
  const domainSkills = userSkills.filter(s => s.domain_id === domainId);
  const avgLevel = domainSkills.reduce((sum, s) => sum + s.level, 0) / domainSkills.length;
  return Math.min(100, Math.floor(avgLevel));
}

// INT = Avg(Wissen-Domain Skills)
// STR = Avg(Koerper-Domain Skills)
```

**Empfehlung:** **Option A (Weighted)** – Flexibler und genauer

---

### 3.3 Mental Stats Integration

**Problem:** Mental Stats sind aktuell nur passive Logs

**Lösung:** Mental Stats als **Buff/Debuff System**

#### Mental Stats → Game Mechanics

```typescript
interface MentalModifiers {
  xpMultiplier: number;    // Mood/Focus boost XP
  energyCost: number;      // Energy kostet "Action Points"
  stressPenalty: number;   // Stress reduziert XP gain
}

function calculateModifiers(mentalStats: MentalStatsLog): MentalModifiers {
  // Mood: 1-5 → 0.8x bis 1.2x XP
  const moodBonus = 0.8 + (mentalStats.mood - 1) * 0.1;

  // Focus: 1-5 → 0.9x bis 1.3x XP
  const focusBonus = 0.9 + (mentalStats.focus - 1) * 0.1;

  // Stress: 1 (high) bis 5 (low) → -20% bis +0% XP
  const stressPenalty = 1.0 - ((5 - mentalStats.stress) * 0.05);

  return {
    xpMultiplier: moodBonus * focusBonus * stressPenalty,
    energyCost: mentalStats.energy, // Wird für Daily Quests genutzt
    stressPenalty: 1.0 - stressPenalty,
  };
}
```

**Use Cases:**
1. **XP Logging:** Mental Stats aus letztem Log → XP Modifier
2. **Daily Quests:** Energy bestimmt verfügbare Quest Slots
3. **Warnings:** Bei hohem Stress → Reminder "Pause machen"

---

### 3.4 Faction → Mental Stats Feedback

**Idee:** Faction Balance beeinflusst Mental Stats

```typescript
function calculateMentalHealthFromFactions(factionStats: UserFactionStats[]): {
  suggestedMood: number;
  burnoutRisk: boolean;
} {
  // Check Balance: Sind alle Factions auf ähnlichem Level?
  const levels = factionStats.map(f => f.level);
  const avgLevel = levels.reduce((a, b) => a + b, 0) / levels.length;
  const variance = levels.reduce((sum, l) => sum + Math.pow(l - avgLevel, 2), 0);

  // Hohe Variance = Unbalanced Life = Stress
  const balance = Math.max(0, 100 - variance * 10);

  // Check Karriere vs Geist
  const karriere = factionStats.find(f => f.faction_id === 'karriere');
  const geist = factionStats.find(f => f.faction_id === 'geist');

  const burnoutRisk = (karriere?.level || 0) > (geist?.level || 0) * 2;

  return {
    suggestedMood: Math.floor(balance / 20), // 1-5 scale
    burnoutRisk,
  };
}
```

---

## 4. Implementierungsplan

### Phase 1: Attribute Calculation (PRIO 1)

**Ziel:** Attributes werden aus Skills berechnet

**Steps:**
1. Create `src/lib/game-mechanics/attributes.ts`
2. Define Skill→Attribute Mapping (Weighted Table)
3. Implement `calculateAttributes(userSkills: UserSkill[]): UserAttributes`
4. Add RPC Function oder Trigger für auto-update
5. Update Dashboard: Attributes zeigen Contributing Skills

**Akzeptanzkriterien:**
- ✅ Attributes ändern sich wenn Skills leveln
- ✅ Hover über Attribute zeigt welche Skills es beeinflussen
- ✅ Test: Krafttraining +10 XP → STR steigt

---

### Phase 2: Mental Stats Game Mechanics (PRIO 2)

**Ziel:** Mental Stats beeinflussen XP & Quests

**Steps:**
1. Create `src/lib/game-mechanics/mental-modifiers.ts`
2. Implement XP Multiplier basierend auf Mood/Focus/Stress
3. Update `addXpToSkill()` um Modifiers zu nutzen
4. Add Mental Stats UI: "Current XP Bonus: +15% (Good Mood + High Focus)"
5. Add Burnout Warning wenn Stress > 4 für 3+ Tage

**Akzeptanzkriterien:**
- ✅ Bei Mood=5, Focus=5 → XP Bonus sichtbar
- ✅ Bei Stress=1 (high) → XP Penalty sichtbar
- ✅ Burnout Warning erscheint bei unbalanced Factions

---

### Phase 3: Faction Balance Dashboard (PRIO 3)

**Ziel:** Visualisierung der Life Balance

**Steps:**
1. Create Radar Chart: 7 Factions als Axes
2. Add "Balance Score" (Variance-based)
3. Add Recommendations: "Geist Level ist niedrig – Meditation?"
4. Link to Mental Stats: "Unbalance → Suggested Stress Level"

---

## 5. Offene Fragen an Product Owner

### 5.1 Attribute System

**Frage 1:** Soll es eine **manuelle Override**-Option geben?
- Option A: Rein berechnet (Skills → Attributes, keine Änderung möglich)
- Option B: Berechnet + manueller Bonus (z.B. "+5 STR Bonus" editierbar)

**Frage 2:** Wie detailliert soll das Skill-Mapping sein?
- Option A: Simple (1 Skill → 1 Attribute, 1:1)
- Option B: Weighted (mehrere Skills → 1 Attribute, gewichtet)
- Option C: Complex (Skills können mehrere Attributes beeinflussen)

**Empfehlung:** Option B (Weighted)

---

### 5.2 Mental Stats Impact

**Frage 3:** Wie stark sollen Mental Stats XP beeinflussen?
- Option A: Minimal (+/- 10% XP)
- Option B: Moderat (+/- 30% XP)
- Option C: Stark (+/- 50% XP)

**Empfehlung:** Option B (Moderat) – Spürbar aber nicht frustrierend

**Frage 4:** Sollen schlechte Mental Stats **Progression blockieren**?
- Option A: Nein, nur XP-Malus
- Option B: Ja, bei Stress=1 für 5+ Tage → "Forced Rest Day"

**Empfehlung:** Option A – Positive Reinforcement > Punishment

---

### 5.3 Level-Formeln

**Frage 5:** Die 2 unterschiedlichen Formeln – behalten oder vereinheitlichen?
- Skills: `level^1.5` (langsames Leveling, hoher Skill-Cap)
- Factions: `sqrt(xp)` (schnelleres Leveling, niedrigerer Cap)

**Analyse:**
- **Skills:** Einzelne Skills sollen lange Progression haben
- **Factions:** Life Domains sollen regelmäßig Level-Ups haben (Motivation)
- **Urteil:** ✅ **BEIDE BEHALTEN** – Unterschiedliche Pacing ist OK!

---

## 6. Technische Umsetzung

### 6.1 Neue Datenbank Komponenten

**Option A: Computed View**
```sql
CREATE VIEW user_attributes_computed AS
SELECT
  user_id,
  calculate_str(user_id) AS str,
  calculate_dex(user_id) AS dex,
  calculate_int(user_id) AS int,
  calculate_cha(user_id) AS cha,
  calculate_wis(user_id) AS wis,
  calculate_vit(user_id) AS vit
FROM user_profiles;
```

**Option B: Trigger on user_skills update**
```sql
CREATE OR REPLACE FUNCTION recalculate_attributes()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_profiles
  SET attributes = calculate_user_attributes(NEW.user_id)
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_skill_updated
AFTER UPDATE ON user_skills
FOR EACH ROW
EXECUTE FUNCTION recalculate_attributes();
```

**Empfehlung:** **Option B (Trigger)** – Real-time updates

---

### 6.2 Mapping Table Schema

```sql
CREATE TABLE skill_attribute_mappings (
  skill_id UUID REFERENCES skills(id),
  attribute_key TEXT CHECK (attribute_key IN ('str','dex','int','cha','wis','vit')),
  weight NUMERIC(3,2) CHECK (weight >= 0 AND weight <= 1),
  PRIMARY KEY (skill_id, attribute_key)
);

-- Beispiel Daten
INSERT INTO skill_attribute_mappings VALUES
  ('krafttraining-uuid', 'str', 1.0),
  ('krafttraining-uuid', 'vit', 0.3),
  ('programming-uuid', 'dex', 0.9),
  ('programming-uuid', 'int', 0.6);
```

---

## 7. Testing Strategy

### 7.1 Unit Tests

```typescript
describe('Attribute Calculation', () => {
  it('should calculate STR from fitness skills', () => {
    const userSkills = [
      { skill_id: 'krafttraining', level: 50, ... },
      { skill_id: 'boxen', level: 30, ... },
    ];
    const str = calculateSTR(userSkills);
    expect(str).toBeGreaterThan(40);
  });
});
```

### 7.2 Integration Tests

```typescript
describe('XP Flow with Mental Stats', () => {
  it('should apply mood bonus to XP', async () => {
    // 1. Log Mental Stats: Mood=5, Focus=5
    await saveMentalStats({ mood: 5, focus: 5, ... });

    // 2. Log Skill XP
    const result = await addXpToSkill('coding', 100, 'Finished project');

    // 3. Expect bonus (should be ~130 XP with +30% modifier)
    expect(result.experience.xp_amount).toBeGreaterThan(100);
  });
});
```

---

## 8. Zusammenfassung & Next Steps

### 8.1 Priorisierung

| Phase | Feature | Impact | Effort | PRIO |
|-------|---------|--------|--------|------|
| 1 | Skill → Attributes | 🔥 Hoch | 🔨 Medium | **P1** |
| 2 | Mental Stats → XP Modifier | 🔥 Medium | 🔨 Low | **P2** |
| 3 | Faction Balance Dashboard | 🔥 Low | 🔨 Medium | **P3** |

### 8.2 Success Metrics

**Nach Phase 1:**
- ✅ Attributes ändern sich dynamisch bei Skill-Level-Ups
- ✅ User versteht Zusammenhang zwischen Skills und Attributes

**Nach Phase 2:**
- ✅ Mental Stats sind nicht nur passive Logs
- ✅ User fühlt sich für gute Mental Health "belohnt"

**Nach Phase 3:**
- ✅ User sieht Life Balance auf einen Blick
- ✅ Empfehlungen helfen beim Ausbalancieren

---

## 9. Referenzen

### Code-Locations
- XP System: `src/lib/xp.ts`
- Faction System: `src/lib/data/factions.ts`
- Skill System: `src/lib/data/skills.ts`, `src/lib/data/user-skills.ts`
- Mental Stats: `src/lib/data/geist.ts`
- Attributes: `src/components/AttributesPanel.tsx`

### Database Schema
- Skills: `supabase/migrations/*_skills_*.sql`
- Factions: `supabase/migrations/*_factions_*.sql`
- Mental Stats: `supabase/migrations/20250208_001_mental_stats_chart.sql`
- Attributes: `supabase/migrations/20241229080000_user_attributes.sql`

---

**Ende der Analyse**
