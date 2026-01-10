# AI Faction Suggester - Phase 5

## Übersicht

Das **AI Faction Suggester** Feature nutzt KI (Claude API) und regelbasierte Logik, um Nutzern intelligente Vorschläge für Faction-Zuordnungen bei XP-Logging zu machen.

## Features

### ✅ Implementiert

1. **KI-basierte Vorschläge**
   - Claude API Integration für Kontext-Analyse
   - Analysiert: Zeit, Beschreibung, letzte Aktivitäten, Dauer, Ort
   - Gibt 1-3 Faction-Vorschläge mit Confidence-Score zurück

2. **Fallback: Regelbasierte Logik**
   - Funktioniert auch ohne API-Key
   - Zeit-basierte Regeln (9-17 Uhr → Karriere, Abends → Hobbys)
   - Keyword-Erkennung (Gym → Gesundheit, Meeting → Soziales)

3. **User Feedback Tracking**
   - Speichert akzeptierte/abgelehnte Vorschläge
   - Datenbank: `ai_faction_suggestions_feedback`
   - Views für Accuracy-Analyse und Confusion Matrix

4. **React Components**
   - `<FactionSuggester>` - Volle UI mit Erklärungen
   - `<FactionSuggestionBadge>` - Minimale Badge-Ansicht
   - `useFactionSuggestion` - React Hook

5. **Demo Page**
   - `/ai-demo` - Test-Interface
   - Beispiel-Prompts zum Ausprobieren
   - Accuracy-Stats Anzeige

## Architektur

```
src/
├── lib/
│   ├── ai/
│   │   └── faction-suggester.ts      # KI-Logik & Fallback-Regeln
│   └── data/
│       └── ai-faction-feedback.ts    # DB Access für Feedback
├── components/
│   └── ai/
│       └── FactionSuggester.tsx      # React UI Components
├── hooks/
│   └── use-faction-suggestion.ts     # React Hook
└── __tests__/
    └── ai-faction-suggester.test.ts  # Tests

supabase/migrations/
└── 20260110_005_ai_faction_suggestions.sql  # DB Schema
```

## Setup

### 1. Environment Variables

```bash
# .env.local
ANTHROPIC_API_KEY=sk-ant-...
# oder
NEXT_PUBLIC_ANTHROPIC_API_KEY=sk-ant-...
```

### 2. Database Migration

```bash
# Migration ist bereits in supabase/migrations/
# Bei Bedarf manuell ausführen:
supabase db push
```

### 3. Install Dependencies

```bash
npm install @anthropic-ai/sdk
```

## Usage

### Basic Example

```tsx
import { FactionSuggester } from '@/components/ai/FactionSuggester';

function MyComponent() {
  const [description, setDescription] = useState('');
  const [faction, setFaction] = useState<FactionId | null>(null);

  return (
    <div>
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Describe your activity..."
      />

      <FactionSuggester
        activityDescription={description}
        onAccept={(factionId) => setFaction(factionId)}
        autoSuggest={true}
      />
    </div>
  );
}
```

### Using the Hook

```tsx
import { useFactionSuggestion } from '@/hooks/use-faction-suggestion';

function MyComponent() {
  const { suggestions, isLoading, acceptSuggestion } = useFactionSuggestion({
    activityDescription: "Coding a feature",
    autoSuggest: true,
  });

  if (isLoading) return <div>Analyzing...</div>;

  return (
    <div>
      {suggestions.map(s => (
        <button key={s.faction_id} onClick={() => acceptSuggestion(s)}>
          {s.faction_id} ({s.confidence}%)
        </button>
      ))}
    </div>
  );
}
```

### Programmatic API

```tsx
import { suggestFaction, storeFactionFeedback } from '@/lib/ai/faction-suggester';

// Get suggestions
const suggestions = await suggestFaction({
  activityDescription: "Morning gym workout",
  currentTime: new Date(),
  lastActivities: ["Breakfast", "Meditation"],
  duration: 60,
});

console.log(suggestions[0]);
// {
//   faction_id: "gesundheit",
//   confidence: 90,
//   reasoning: "Sport/Fitness-Aktivität erkannt"
// }

// Store feedback
await storeFactionFeedback(
  "Morning gym workout",
  "gesundheit",    // suggested
  "gesundheit",    // actual (same = accepted)
  true,            // accepted
  userId,
  90,              // confidence
  "Sport/Fitness-Aktivität erkannt"
);
```

## Beispiele

### Zeit-basierte Erkennung

```typescript
// Beispiel 1: Arbeitszeit (9-17 Uhr)
suggestFaction({
  activityDescription: "Coding a new feature",
  currentTime: new Date("2025-01-10T10:00:00"),
})
// → karriere (75% confidence)

// Beispiel 2: Abends (18-23 Uhr)
suggestFaction({
  activityDescription: "Coding a new feature",
  currentTime: new Date("2025-01-10T20:00:00"),
})
// → hobbys (70% confidence)
```

### Keyword-Erkennung

```typescript
// Gym → Gesundheit
suggestFaction({ activityDescription: "Morning gym workout" })
// → gesundheit (90% confidence)

// Meeting → Soziales
suggestFaction({ activityDescription: "Coffee with friends" })
// → soziales (85% confidence)

// Lernen → Geist
suggestFaction({ activityDescription: "Reading a philosophy book" })
// → geist (80% confidence)
```

### Kontext-Nutzung

```typescript
suggestFaction({
  activityDescription: "Continuing work",
  lastActivities: [
    "Morning standup",
    "Code review",
    "Sprint planning"
  ],
})
// → karriere (höhere confidence durch Kontext)
```

## Analytics

### View: Suggestion Accuracy

```sql
SELECT * FROM ai_faction_suggestion_accuracy
WHERE user_id = '...';
```

Zeigt:
- Total suggestions
- Accepted suggestions
- Acceptance rate %
- Avg confidence (overall, accepted, rejected)

### View: Confusion Matrix

```sql
SELECT * FROM ai_faction_confusion_matrix
ORDER BY frequency DESC;
```

Zeigt welche Factions oft verwechselt werden:
- `suggested_faction_id` vs `actual_faction_id`
- Häufigkeit
- Acceptance rate

## Tests

```bash
# Run tests
npm test ai-faction-suggester.test.ts

# Test coverage
npm test -- --coverage ai-faction-suggester.test.ts
```

Tests decken ab:
- ✅ Regelbasierte Suggestions
- ✅ Zeit-basierte Logik
- ✅ Keyword-Erkennung
- ✅ Edge Cases
- ✅ Multi-keyword Handling

## Future Improvements

### Phase 6: ML Model Training

1. **Daten sammeln**
   - 1000+ Feedback-Einträge sammeln
   - Verschiedene User und Aktivitäten

2. **Model Training**
   - Fine-tune Claude mit User-Feedback
   - Oder: Lokales ML Model (TensorFlow.js)

3. **A/B Testing**
   - Rule-based vs AI-based
   - Accuracy-Vergleich

4. **Personalisierung**
   - User-spezifische Patterns lernen
   - "Dieser User macht Coding meist als Hobby"

### Phase 7: Advanced Features

- **Location-based**: Gym → Gesundheit, Office → Karriere
- **Calendar Integration**: Meeting in Kalender → Kontext nutzen
- **Multi-Faction Support**: Aktivität kann mehrere Factions betreffen
- **Confidence Threshold**: Nur Suggestions >70% anzeigen

## API Costs

Claude API Kosten (Stand 2025-01):
- Model: `claude-sonnet-4-5-20250929`
- ~$3 per million input tokens
- ~$15 per million output tokens

Geschätzte Kosten pro Suggestion:
- Input: ~200 tokens ($0.0006)
- Output: ~100 tokens ($0.0015)
- **Total: ~$0.002 pro Suggestion**

Bei 100 Suggestions/Tag:
- $0.20/Tag = $6/Monat

**Tipp:** Fallback-Regeln aktiviert lassen um Kosten zu sparen!

## Troubleshooting

### "ANTHROPIC_API_KEY not set"

→ API-Key in `.env.local` setzen
→ Fallback-Regeln funktionieren auch ohne Key

### Suggestions immer gleich

→ Mehr Kontext hinzufügen (lastActivities, duration, location)
→ Feedback geben um System zu trainieren

### Niedrige Accuracy

→ Mehr Feedback-Daten sammeln
→ Regeln in `faction-suggester.ts` anpassen
→ Check: `ai_faction_confusion_matrix` View

### Tests schlagen fehl

```bash
# Cache löschen
rm -rf .next
npm run build
npm test
```

## License

MIT - Teil von Projekt L
