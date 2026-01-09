# Knowledge Graph vs PostgreSQL - Evaluationsbericht

**Projekt:** Projekt L - Life Gamification System
**Task ID:** 06278f8b-29f2-47d4-8cd6-cea19bca5d31
**Datum:** 2026-01-09
**Autor:** Worker 4

---

## Executive Summary

**Empfehlung: PostgreSQL mit erweiterten Graph-Features beibehalten** ✅

PostgreSQL ist für die aktuellen und geplanten Anforderungen von Projekt L ausreichend und überlegen gegenüber einem dedizierten Knowledge Graph wie Neo4j.

**Hauptgründe:**
- Aktuelle Implementierung nutzt bereits recursive CTEs effektiv
- Skill-Hierarchie (5 Ebenen) ist überschaubar und performant in PostgreSQL
- Skill-Connections Tabelle ermöglicht flexible Beziehungen
- AI-Features benötigen strukturierte, nicht unbedingt graph-native Abfragen
- Vermeidung von zusätzlicher Komplexität und Kosten
- PostgreSQL bietet alle benötigten Graph-Operationen

---

## 1. Ist-Analyse: Aktuelle Architektur

### 1.1 Datenmodell

**Hierarchische Strukturen:**
```sql
-- skills Tabelle mit self-referencing parent_skill_id
CREATE TABLE skills (
  id UUID PRIMARY KEY,
  domain_id UUID REFERENCES skill_domains(id),
  parent_skill_id UUID REFERENCES skills(id),
  -- 5-Ebenen Hierarchie
  depth INTEGER,
  ...
)
```

**Graph-Beziehungen:**
```sql
-- skill_connections für lateral connections
CREATE TABLE skill_connections (
  skill_a_id UUID REFERENCES skills(id),
  skill_b_id UUID REFERENCES skills(id),
  connection_type ENUM ('prerequisite', 'synergy', 'related'),
  strength INTEGER CHECK (strength >= 1 AND strength <= 10),
  ...
)
```

**Multi-Domain Support:**
```sql
-- Ein Skill kann mehreren Domains zugeordnet sein
CREATE TABLE skill_domain_assignments (
  skill_id UUID,
  domain_id UUID,
  is_primary BOOLEAN
)
```

### 1.2 Bereits implementierte Graph-Operationen

#### ✅ Recursive Ancestor Traversal
```typescript
// skills.ts:454-456
const { data: ancestors } = await supabase
  .rpc('get_skill_ancestors', { skill_uuid: skillId });
```

**PostgreSQL Implementation (vermutlich):**
```sql
CREATE FUNCTION get_skill_ancestors(skill_uuid UUID)
RETURNS TABLE(...) AS $$
  WITH RECURSIVE ancestors AS (
    SELECT id, name, parent_skill_id, depth
    FROM skills WHERE id = skill_uuid

    UNION ALL

    SELECT s.id, s.name, s.parent_skill_id, s.depth
    FROM skills s
    JOIN ancestors a ON s.id = a.parent_skill_id
  )
  SELECT * FROM ancestors WHERE id != skill_uuid
  ORDER BY depth;
$$ LANGUAGE sql;
```

#### ✅ Descendant Traversal
```typescript
// skills.ts:503-538
export async function getDescendants(parentSkillId: string)
```

Nutzt iterative Graph-Traversierung mit Array-basierter Queue.

#### ✅ Tree Building
```typescript
// skills.ts:378-406
function buildSkillTree(skills: Skill[]): SkillWithHierarchy[]
```

In-Memory Tree Construction aus flacher Liste.

#### ✅ Connection Queries
```typescript
// skills.ts:260-341
export async function getConnectedSkills(skillId: string)
```

Findet alle verbundenen Skills mit Type (prerequisite/synergy/related).

### 1.3 Performance-Merkmale

- **Indizierung:** Mehrere B-tree Indizes auf parent_skill_id, domain_id
- **Depth Tracking:** Pre-calculated depth Spalte für O(1) Level-Zugriff
- **View Optimization:** `skills_with_domain` View für JOIN-Reduzierung
- **XP Propagation:** Recursive Function für Parent-Skill XP

---

## 2. Anforderungsanalyse: AI-Features

### 2.1 Identifizierte Use Cases

Aus der Task-Beschreibung:

1. **Skill-Beziehungen (Synergien, Prerequisites)**
   - Welche Skills ergänzen sich?
   - Welche Skills sind Voraussetzungen?
   - Welche Skills haben ähnliche Lernpfade?

2. **AI-Kontext-Abfragen**
   - "Welche Skills hat der User?"
   - "Welche Skills fehlen für Ziel X?"
   - "Empfehle nächste Skills basierend auf aktuellem Fortschritt"

3. **Graph-Traversierung für Vorschläge**
   - "Wenn User Python kann, empfehle Django/FastAPI"
   - "User hat React → empfehle Next.js/TypeScript"
   - "Finde Skill-Gaps in Domain"

### 2.2 Typische Abfrage-Patterns

#### Pattern 1: "Find Missing Prerequisites"
```sql
-- PostgreSQL Lösung (gut performant)
WITH user_skills AS (
  SELECT skill_id FROM user_skills WHERE user_id = $1
),
target_prerequisites AS (
  SELECT skill_a_id as prereq_id
  FROM skill_connections
  WHERE skill_b_id = $target_skill_id
    AND connection_type = 'prerequisite'
)
SELECT s.*
FROM target_prerequisites tp
JOIN skills s ON s.id = tp.prereq_id
WHERE tp.prereq_id NOT IN (SELECT skill_id FROM user_skills);
```

#### Pattern 2: "Find Skills with Synergy"
```sql
-- PostgreSQL Lösung (gut performant)
WITH user_skill_ids AS (
  SELECT skill_id FROM user_skills WHERE user_id = $1
)
SELECT
  s.*,
  sc.strength,
  COUNT(*) OVER (PARTITION BY s.id) as synergy_count
FROM skill_connections sc
JOIN skills s ON (
  CASE
    WHEN sc.skill_a_id IN (SELECT skill_id FROM user_skill_ids)
    THEN sc.skill_b_id
    WHEN sc.skill_b_id IN (SELECT skill_id FROM user_skill_ids)
    THEN sc.skill_a_id
  END = s.id
)
WHERE sc.connection_type = 'synergy'
  AND s.id NOT IN (SELECT skill_id FROM user_skill_ids)
ORDER BY synergy_count DESC, sc.strength DESC
LIMIT 10;
```

#### Pattern 3: "Find Skill Path (A → B)"
```sql
-- PostgreSQL mit recursive CTE
WITH RECURSIVE skill_path AS (
  -- Start node
  SELECT
    id, name, parent_skill_id,
    ARRAY[id] as path,
    0 as depth
  FROM skills WHERE id = $start_skill_id

  UNION ALL

  -- Follow connections
  SELECT
    s.id, s.name, s.parent_skill_id,
    sp.path || s.id,
    sp.depth + 1
  FROM skills s
  JOIN skill_connections sc ON (
    sc.skill_a_id = s.id OR sc.skill_b_id = s.id
  )
  JOIN skill_path sp ON (
    (sc.skill_a_id = sp.id AND sc.skill_b_id = s.id) OR
    (sc.skill_b_id = sp.id AND sc.skill_a_id = s.id)
  )
  WHERE s.id != ALL(sp.path)  -- Prevent cycles
    AND sp.depth < 5          -- Limit depth
)
SELECT * FROM skill_path WHERE id = $target_skill_id;
```

### 2.3 AI Context Requirements

Für Claude/GPT API Calls braucht die AI:

```json
{
  "user_skills": [
    {
      "skill_name": "Python",
      "level": 75,
      "domain": "Coding",
      "related_skills": ["JavaScript", "TypeScript"],
      "prerequisites_met": ["Programming Basics"],
      "next_recommendations": ["Django", "FastAPI", "Machine Learning"]
    }
  ],
  "skill_graph": {
    "nodes": [...],
    "edges": [...]
  },
  "user_goals": ["Become Backend Developer", "Learn ML"],
  "time_available": "2 hours/day"
}
```

→ **Diese Daten sind bereits strukturiert und relational abrufbar!**

---

## 3. Option 1: PostgreSQL (Status Quo +)

### 3.1 Vorteile ✅

1. **Bereits implementiert und funktionsfähig**
   - Recursive CTEs für Hierarchien
   - Skill-Connections für Beziehungen
   - Effiziente Indizierung

2. **Geringe Komplexität**
   - Kein zusätzliches DB-System
   - Kein Data-Sync zwischen zwei DBs
   - Team kennt PostgreSQL bereits

3. **Kosten**
   - Supabase Free Tier: 500MB PostgreSQL inkludiert
   - Neo4j Aura Free: 200k Nodes + 400k Relationships (könnte reichen, aber...)
   - Neo4j Aura Pro: $65/month minimum

4. **Performance für Projekt-L Use Cases**
   - **Skill-Count:** ~500-1000 Skills realistisch
   - **User-Skills:** ~50-200 pro User
   - **Connections:** ~1000-3000 Relationships
   - → **PostgreSQL ist hier SCHNELL GENUG**

5. **Rich Query Capabilities**
   - JOINs, Window Functions, CTEs
   - JSONB für flexible Attribute
   - Full-Text Search (für Skill-Namen)

6. **ACID + Transactions**
   - Wichtig für XP-Updates
   - Wichtig für Achievement-Vergabe

### 3.2 Limitationen ❌

1. **Multi-hop Queries (5+ levels)**
   - Recursive CTEs werden langsamer bei vielen Hops
   - → Aber: 5-Level Hierarchie ist Maximum in Projekt L

2. **Pathfinding Algorithms**
   - Shortest Path, PageRank, Community Detection nicht nativ
   - → Aber: Werden aktuell nicht benötigt

3. **Graph Visualization**
   - Kein natives Graph-Format
   - → Aber: Frontend macht Visualization via React Flow

### 3.3 Erweiterungsvorschläge 🔧

#### A) Materialized Path für schnellere Hierarchie-Queries

```sql
-- Aktuell: Recursive CTE für jeden Ancestor-Query
-- Besser: Materialized Path speichern

ALTER TABLE skills ADD COLUMN path ltree;

-- Beispiel: "Coding.Backend.Python.Django.REST"
CREATE INDEX idx_skills_path ON skills USING GIST (path);

-- Query: Alle Descendants von Python
SELECT * FROM skills
WHERE path <@ 'Coding.Backend.Python';

-- Query: Alle Ancestors von REST
SELECT * FROM skills
WHERE 'Coding.Backend.Python.Django.REST' <@ path;
```

**Vorteile:**
- O(log n) statt O(n) für Hierarchie-Queries
- Einfacher "Find Common Ancestor"
- Bessere Performance für Subtree-Queries

**Nachteil:**
- Path muss bei Skill-Verschiebung aktualisiert werden

#### B) JSONB für flexible Skill-Metadata

```sql
ALTER TABLE skills ADD COLUMN metadata JSONB;

-- Beispiel:
{
  "difficulty": "intermediate",
  "estimated_hours": 40,
  "tags": ["web", "framework", "fullstack"],
  "learning_resources": [
    {"type": "course", "url": "...", "duration": "10h"}
  ],
  "ai_embeddings": [...],  -- Für semantic search
  "popularity_score": 85
}

-- GIN Index für JSONB Queries
CREATE INDEX idx_skills_metadata ON skills USING GIN (metadata);

-- Query: Finde Skills mit Tag "web"
SELECT * FROM skills WHERE metadata @> '{"tags": ["web"]}';
```

#### C) Vorberechenete Adjacency Matrix (Cache)

Für häufige "Are A and B related?" Queries:

```sql
CREATE TABLE skill_adjacency_cache (
  skill_a_id UUID,
  skill_b_id UUID,
  distance INTEGER,      -- Hops (1 = direct, 2 = via 1 intermediate, etc.)
  path_type TEXT,        -- "prerequisite_chain", "synergy_network", etc.
  updated_at TIMESTAMPTZ,
  PRIMARY KEY (skill_a_id, skill_b_id)
);

-- Regenerate via Trigger oder Batch-Job
```

---

## 4. Option 2: Neo4j als dedizierter Graph

### 4.1 Vorteile ✅

1. **Native Graph Operations**
   - `MATCH (a)-[:PREREQUISITE*1..3]->(b)` ist elegant
   - Pathfinding Algorithms (Dijkstra, A*) built-in
   - Graph Algorithms Library (PageRank, Centrality, etc.)

2. **Cypher Query Language**
   - Einfacher für komplexe Graph-Patterns
   - Besser lesbar als recursive SQL

3. **Skalierung bei SEHR großen Graphs**
   - Millionen Nodes + Relationships
   - Optimiert für traversal-heavy Workloads

### 4.2 Nachteile ❌

1. **Zusätzliche Komplexität**
   - Zwei Datenbanken zu managen
   - Data Sync zwischen PostgreSQL ↔ Neo4j
   - Potenzielle Inkonsistenzen

2. **Kosten**
   - Neo4j Aura Free: Limitiert
   - Neo4j Aura Pro: $65+/month
   - Supabase + Neo4j = Doppelte Kosten

3. **Overkill für Projekt L**
   - ~1000 Skills sind KEINE "Big Graph"
   - Multi-hop Queries sind selten (meist 1-2 hops)
   - Keine Advanced Algorithms benötigt (aktuell)

4. **Team-Know-how**
   - Neues System zu lernen
   - Cypher statt SQL
   - Deployment + Monitoring

5. **Transaktionale Daten in PostgreSQL bleiben**
   - XP-Logs, User-Daten, Finanzen, Habits → PostgreSQL
   - Nur Skills → Neo4j
   - Mehr Queries über DB-Grenzen

### 4.3 Wann wäre Neo4j sinnvoll?

- **Bei >100k Skills** (unrealistisch für Life Gamification)
- **Bei komplexen Pathfinding-Anforderungen**
  - z.B. "Optimaler Lernpfad von Skill A zu Ziel B unter Constraints X, Y, Z"
- **Bei Graph-Analytics als Core-Feature**
  - z.B. "Community Detection: Welche Skill-Cluster gibt es?"
  - z.B. "Influence Propagation: Wie beeinflusst Skill A andere Skills?"

**Projekt L benötigt das NICHT.**

---

## 5. Option 3: Hybrid (PostgreSQL + In-Memory Graph)

### 5.1 Konzept

- **PostgreSQL:** Source of Truth (Skills, Connections, User-Data)
- **In-Memory Graph:** Read-only Cache für AI-Queries

### 5.2 Implementation Sketch

```typescript
// lib/graph/skill-graph.ts
import { Graph } from 'graphology';

class SkillGraphCache {
  private graph: Graph;
  private lastUpdated: Date;

  async initialize() {
    const skills = await supabase.from('skills').select('*');
    const connections = await supabase.from('skill_connections').select('*');

    this.graph = new Graph({ type: 'mixed' });

    skills.forEach(skill => {
      this.graph.addNode(skill.id, {
        name: skill.name,
        domain: skill.domain_id,
        depth: skill.depth,
        ...
      });
    });

    connections.forEach(conn => {
      this.graph.addEdge(conn.skill_a_id, conn.skill_b_id, {
        type: conn.connection_type,
        strength: conn.strength
      });
    });

    this.lastUpdated = new Date();
  }

  async getShortestPath(startId: string, targetId: string) {
    return this.graph.findPath(startId, targetId);
  }

  async getSynergies(skillIds: string[]) {
    const neighbors = new Set();
    skillIds.forEach(id => {
      this.graph.forEachNeighbor(id, (neighbor, attrs) => {
        if (attrs.type === 'synergy') {
          neighbors.add(neighbor);
        }
      });
    });
    return Array.from(neighbors);
  }
}
```

**Library:** [graphology](https://graphology.github.io/) (JavaScript/TypeScript)

### 5.3 Vorteile ✅

1. **Best of Both Worlds**
   - PostgreSQL für Persistenz + Transactions
   - Fast Graph Operations für AI-Queries

2. **Keine zusätzliche DB**
   - Läuft im Node.js Process
   - Kein Deployment-Overhead

3. **Flexibel**
   - Graph kann bei Bedarf erweitert werden
   - Z.B. Skill-Embeddings für Semantic Search

### 5.4 Nachteile ❌

1. **Cache Invalidation**
   - Graph muss bei Skill-/Connection-Changes aktualisiert werden
   - Komplexität im Code

2. **Memory Footprint**
   - ~1000 Skills × ~5 Relationships = ~5000 Edges
   - Mit Attributen: ~10-50 MB RAM
   - → Akzeptabel, aber zu tracken

3. **Single-Instance**
   - Bei Scale-out (mehrere Next.js Instanzen) müsste Graph repliziert werden
   - Oder: Shared Redis für Graph-Cache

### 5.5 Wann sinnvoll?

- Wenn PostgreSQL Graph-Queries ZU LANGSAM werden (aktuell nicht der Fall)
- Wenn komplexe Algorithmen benötigt werden (z.B. Clustering, Centrality)
- Wenn AI sehr viele Graph-Traversals macht (>1000 pro Sekunde)

**Projekt L ist davon weit entfernt.**

---

## 6. Benchmarks & Performance-Prognosen

### 6.1 Estimated Dataset Size (3 Jahre)

| Entity | Count | Growth |
|--------|-------|--------|
| Skill Domains | 10-15 | Stabil |
| Skills | 800-1500 | +50-100/Jahr |
| Skill Connections | 2000-5000 | +200-500/Jahr |
| User Skills | 50-200 pro User | +20-50/Jahr |
| Experiences | 1000-5000 pro User | +50-200/Monat |

### 6.2 PostgreSQL Performance-Schätzungen

**Query:** "Find all connected skills for user (2 hops)"

```sql
-- Worst case: User hat 100 Skills, jeder hat 5 Connections
WITH user_skills AS (
  SELECT skill_id FROM user_skills WHERE user_id = $1
),
first_hop AS (
  SELECT DISTINCT
    CASE
      WHEN sc.skill_a_id IN (SELECT skill_id FROM user_skills) THEN sc.skill_b_id
      ELSE sc.skill_a_id
    END as connected_id
  FROM skill_connections sc
  WHERE sc.skill_a_id IN (SELECT skill_id FROM user_skills)
     OR sc.skill_b_id IN (SELECT skill_id FROM user_skills)
),
second_hop AS (
  SELECT DISTINCT
    CASE
      WHEN sc.skill_a_id IN (SELECT connected_id FROM first_hop) THEN sc.skill_b_id
      ELSE sc.skill_a_id
    END as connected_id
  FROM skill_connections sc
  WHERE sc.skill_a_id IN (SELECT connected_id FROM first_hop)
     OR sc.skill_b_id IN (SELECT connected_id FROM first_hop)
)
SELECT s.* FROM skills s
WHERE s.id IN (SELECT connected_id FROM first_hop)
   OR s.id IN (SELECT connected_id FROM second_hop);
```

**Erwartete Performance:**
- Mit B-tree Index auf skill_a_id, skill_b_id: **~10-50ms**
- Mit 10k+ Connections: **~100-200ms** (immer noch akzeptabel)

**Neo4j Equivalent:**
```cypher
MATCH (start:Skill)-[:CONNECTED*1..2]-(end:Skill)
WHERE start.id IN $user_skill_ids
RETURN DISTINCT end
```

**Erwartete Performance:** ~5-20ms

**Differenz:** ~5-30ms → **Vernachlässigbar für UI**

### 6.3 Kritische Query: Recursive Ancestor (5 Levels)

**PostgreSQL:**
```sql
-- Mit depth=5 Maximum, <100 Ancestors typisch
SELECT * FROM get_skill_ancestors($skill_id);
-- Performance: ~5-15ms
```

**Neo4j:**
```cypher
MATCH path = (skill:Skill {id: $skill_id})-[:PARENT*]->(ancestor:Skill)
RETURN ancestor
-- Performance: ~2-8ms
```

**Fazit:** Neo4j 2-3x schneller, aber beide SCHNELL GENUG für UI.

---

## 7. Entscheidungsmatrix

| Kriterium | PostgreSQL (Option 1) | Neo4j (Option 2) | Hybrid (Option 3) |
|-----------|-----------------------|------------------|-------------------|
| **Implementierungsaufwand** | ✅ Bereits fertig | ❌ 2-3 Wochen Setup | ⚠️ 1 Woche |
| **Kosten (3 Jahre)** | ✅ $0 (Supabase Free) | ❌ $2,340+ | ✅ $0 |
| **Performance (1k Skills)** | ✅ <50ms für alle Queries | ✅ <20ms | ✅ <10ms |
| **Performance (10k+ Skills)** | ⚠️ ~100-200ms | ✅ <50ms | ✅ <30ms |
| **Team-Know-how** | ✅ Bekannt | ❌ Neu lernen | ⚠️ Graphology lernen |
| **Wartung/Ops** | ✅ Einfach | ❌ Zwei DBs | ⚠️ Cache-Logik |
| **AI-Feature Support** | ✅ Ausreichend | ✅ Optimal | ✅ Sehr gut |
| **Flexibilität** | ⚠️ Begrenzt bei 5+ hops | ✅ Unbegrenzt | ✅ Sehr flexibel |
| **Skalierung (100k+ Skills)** | ❌ Zu langsam | ✅ Kein Problem | ⚠️ RAM-limitiert |

**Szenario: Projekt L (realistisch 1k-5k Skills)**

→ **PostgreSQL gewinnt klar** (✅ bei allen relevanten Kriterien)

---

## 8. Empfehlung

### 8.1 Kurzfristig (jetzt - 6 Monate) ✅

**PostgreSQL beibehalten mit folgenden Verbesserungen:**

1. **Ltree Extension für Materialized Paths**
   ```sql
   CREATE EXTENSION ltree;
   ALTER TABLE skills ADD COLUMN path ltree;
   CREATE INDEX idx_skills_path_gist ON skills USING GIST (path);
   ```

2. **JSONB Metadata für Flexible Attributes**
   ```sql
   ALTER TABLE skills ADD COLUMN metadata JSONB;
   CREATE INDEX idx_skills_metadata_gin ON skills USING GIN (metadata);
   ```

3. **Skill Recommendation View (für AI)**
   ```sql
   CREATE MATERIALIZED VIEW skill_recommendations AS
   SELECT
     us.user_id,
     s.id as recommended_skill_id,
     s.name,
     sc.connection_type,
     sc.strength,
     COUNT(*) as synergy_count
   FROM user_skills us
   JOIN skill_connections sc ON (us.skill_id = sc.skill_a_id OR us.skill_id = sc.skill_b_id)
   JOIN skills s ON (s.id = sc.skill_a_id OR s.id = sc.skill_b_id)
   WHERE s.id NOT IN (SELECT skill_id FROM user_skills WHERE user_id = us.user_id)
   GROUP BY us.user_id, s.id, s.name, sc.connection_type, sc.strength;

   CREATE INDEX idx_skill_recommendations_user ON skill_recommendations(user_id);
   ```

4. **Query Performance Monitoring**
   - PostgreSQL EXPLAIN ANALYZE für kritische Queries
   - pg_stat_statements Extension für Slow Query Detection

### 8.2 Mittelfristig (6-12 Monate) ⚠️

**Wenn Performance-Probleme auftreten:**

1. **Hybrid-Approach mit Graphology**
   - In-Memory Graph für AI-intensive Queries
   - PostgreSQL bleibt Source of Truth

2. **Redis für Skill-Graph Cache**
   - Wenn mehrere Next.js Instanzen laufen
   - RedisGraph Extension (oder plain Redis mit HSET)

### 8.3 Langfristig (12+ Monate) 🔮

**Wenn Skill-Count >10k und/oder komplexe Algorithmen benötigt:**

1. **Neo4j als Read-Replica** evaluieren
   - PostgreSQL → Neo4j Sync via CDC (Change Data Capture)
   - Neo4j nur für Graph-Queries, PostgreSQL für Rest

2. **Oder:** Managed Graph Service (z.B. AWS Neptune, Azure Cosmos DB Gremlin API)

---

## 9. Konkrete Next Steps

### Für Worker Team 📋

1. **Ltree Migration implementieren** (Task Order: 85)
   - Migration Script: `supabase/migrations/20260110_003_skill_ltree.sql`
   - Update `skills.ts` für ltree Queries
   - Tests für Ancestor/Descendant Queries

2. **Skill Metadata JSONB hinzufügen** (Task Order: 84)
   - Migration Script: `supabase/migrations/20260110_004_skill_metadata.sql`
   - UI für Metadata-Editing
   - AI-Prompt-Integration (metadata als Context)

3. **AI Recommendation Endpoint** (Task Order: 83)
   - `/api/ai/recommend-skills` Route
   - Nutzt skill_recommendations View
   - Claude API Integration mit Skill-Graph Context

4. **Performance Benchmarks dokumentieren** (Task Order: 82)
   - E2E Tests mit Playwright
   - Query-Performance-Metriken sammeln
   - Dashboard für Performance-Monitoring

### Für User 🎯

**Keine Architektur-Änderung nötig → Fokus auf Features!**

Die aktuelle PostgreSQL-Architektur ist robust und zukunftssicher für alle geplanten AI-Features.

---

## 10. Anhang

### 10.1 Referenzen

- [PostgreSQL Ltree Documentation](https://www.postgresql.org/docs/current/ltree.html)
- [PostgreSQL Recursive CTEs](https://www.postgresql.org/docs/current/queries-with.html)
- [Neo4j vs PostgreSQL Performance](https://neo4j.com/blog/graph-vs-relational-database/)
- [Graphology Documentation](https://graphology.github.io/)

### 10.2 Code Snippets

Siehe `skills.ts:432-468` für aktuelle Recursive CTE Implementation.

Siehe `skills.ts:503-538` für iterative Graph Traversal.

### 10.3 Schema Diagram

```
skill_domains (10-15 nodes)
    ↓
skills (800-1500 nodes)
    ├── parent_skill_id (Tree: 5 levels)
    ├── path ltree (NEW: Materialized Path)
    └── metadata JSONB (NEW: Flexible Attributes)

skill_connections (2000-5000 edges)
    ├── prerequisite
    ├── synergy
    └── related

user_skills (50-200 per user)
    └── Links users to skills
```

---

**Ende des Evaluationsberichts**

**Status:** DONE ✅
**Recommendation:** Stay with PostgreSQL + enhancements
**Action Items:** 4 Tasks für Worker Team (siehe Section 9)
