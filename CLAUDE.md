# Projekt L - Worker Instruktionen (Kompakt)

**WICHTIG:** Dies ist die kompakte Worker-Version. Vollständige Dokumentation in `/Users/lukas/Desktop/Projekt L/CLAUDE.md`

---

## Dein Workflow (STRENG BEFOLGEN!)

1. **Task holen:**
   ```
   find_tasks(filter_by="project", filter_value="a3be6d47-fc76-4e59-88bc-e671b728cc13")
   ```
   Filter auf status="todo" → Nimm Task mit höchster task_order

2. **Task reservieren (SOFORT!):**
   ```
   manage_task("update", task_id="...", status="doing", assignee="Worker 4")
   ```

3. **Recherche (falls nötig):**
   - Context7: `resolve-library-id`, `query-docs`
   - Archon: `rag_search_knowledge_base`, `rag_search_code_examples`

4. **Implementieren** - Code schreiben, Tests wenn nötig

5. **Testen:**
   - `npm run build` → Keine Fehler?
   - Playwright wenn UI-Änderungen

6. **Bei Fehlern: DEBUG-LOOP (max 3 Versuche):**
   ```
   WENN Test fehlschlägt:
   1. Fehler analysieren (Error-Message lesen)
   2. Ursache identifizieren
   3. Fix implementieren
   4. Erneut testen
   5. Nach 3 Fehlversuchen → status="review" + Fehlerbeschreibung
   ```
   **WICHTIG:** Nicht sofort aufgeben! Erst debuggen, dann weitermachen.

7. **Commit & Push:**
   ```bash
   git add -A
   git commit -m "[feat/fix](bereich): Beschreibung"
   git push origin worker4
   ```

8. **Task abschließen:**
   - Erfolg: `manage_task("update", task_id="...", status="done")`
   - Nach 3 Debug-Versuchen: `manage_task("update", task_id="...", status="review")`
     + Fehlerbeschreibung in Task-Description hinzufügen!

9. **Weiter zu Schritt 1**

---

## Definition of Done (DoD)

Bevor du einen Task als "done" markierst, prüfe:

- [ ] Feature funktioniert wie beschrieben
- [ ] Dashboard-Link vorhanden (wenn UI-Feature)
- [ ] Playwright-Test erstellt (wenn UI)
- [ ] Keine TypeScript/Build Fehler
- [ ] .env.example aktualisiert (wenn neue Variablen)
- [ ] Commit gepusht

---

## Aktuelle TODO Tasks (Projekt L)

| Status | Task | Assignee |
|--------|------|----------|
| doing | Phase 2: Investment Portfolio UI | Worker 2 |
| doing | Quest System UI (Frontend fehlt!) | Worker 3 |
| doing | Phase 4: Notion API Integration | Worker 4 |
| todo | Karriere-Quellen System | User |

---

## Playwright Regeln

**KRITISCH:** Nur EINE Claude-Instanz kann Playwright nutzen!

1. VOR Nutzung: `browser_snapshot` aufrufen
2. Bei Fehler/Timeout: Browser ist belegt → WARTEN
3. Nach Abschluss: `browser_close`

---

## Wichtige Pfade

```
src/app/                    # Pages (Next.js App Router)
src/components/             # React Komponenten
src/lib/data/               # Data Layer
src/lib/database.types.ts   # TypeScript Types
supabase/migrations/        # SQL Migrations
```

---

## Verboten

- Keine großen Dateien lesen (>1000 Zeilen auf einmal)
- Keine package-lock.json oder node_modules lesen
- Keine Änderungen an .env (nur .env.example)
- Keine force pushes
