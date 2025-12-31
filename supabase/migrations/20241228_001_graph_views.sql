-- =============================================
-- Graph Views - Gespeicherte Skill-Tree Ansichten
-- =============================================

-- Tabelle für gespeicherte Graph-Ansichten pro Domain
CREATE TABLE graph_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID NOT NULL REFERENCES skill_domains(id) ON DELETE CASCADE,

  -- Metadaten
  name TEXT NOT NULL,
  description TEXT,

  -- Viewport State
  viewport_x FLOAT NOT NULL DEFAULT 0,
  viewport_y FLOAT NOT NULL DEFAULT 0,
  viewport_zoom FLOAT NOT NULL DEFAULT 0.8,

  -- Layout Richtung
  direction TEXT NOT NULL DEFAULT 'TB' CHECK (direction IN ('TB', 'LR')),

  -- Node Positionen (JSONB für Flexibilität)
  -- Format: {"nodeId": {"x": 100, "y": 200}, ...}
  node_positions JSONB NOT NULL DEFAULT '{}',

  -- Flags
  is_default BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index für schnelle Domain-Abfragen
CREATE INDEX idx_graph_views_domain ON graph_views(domain_id);

-- Trigger für updated_at (nutzt existierende Funktion)
CREATE TRIGGER update_graph_views_updated_at
  BEFORE UPDATE ON graph_views
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Partial unique index: Nur eine Default-View pro Domain erlaubt
CREATE UNIQUE INDEX idx_graph_views_default
  ON graph_views(domain_id)
  WHERE is_default = TRUE;

-- Kommentar zur Dokumentation
COMMENT ON TABLE graph_views IS 'Gespeicherte Graph-Ansichten für Skill-Trees. Jede Domain kann mehrere Views haben.';
COMMENT ON COLUMN graph_views.node_positions IS 'JSON Object mit manuell verschobenen Node-Positionen: {"nodeId": {"x": number, "y": number}}';
COMMENT ON COLUMN graph_views.is_default IS 'Nur eine View pro Domain kann Default sein (enforced by partial unique index)';
