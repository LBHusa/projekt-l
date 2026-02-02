-- ============================================
-- Equipment System Schema
-- Phase 4: Visuelle Belohnungen
-- Layered 2D Equipment for Avatar Customization
-- ============================================

-- ============================================
-- EQUIPMENT ITEMS TABLE (Catalog)
-- ============================================

CREATE TABLE equipment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  item_type TEXT NOT NULL CHECK (item_type IN ('head', 'body', 'accessory')),
  sprite_url TEXT NOT NULL,
  price_gold INTEGER NOT NULL DEFAULT 100,
  rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  required_level INTEGER DEFAULT 1,
  required_prestige INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USER EQUIPMENT TABLE (Ownership/Equipped)
-- ============================================

CREATE TABLE user_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES equipment_items(id) ON DELETE CASCADE,
  is_equipped BOOLEAN DEFAULT FALSE,
  acquired_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, item_id)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_equipment_type ON equipment_items(item_type);
CREATE INDEX idx_equipment_rarity ON equipment_items(rarity);
CREATE INDEX idx_equipment_active ON equipment_items(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_user_equipment_user ON user_equipment(user_id);
CREATE INDEX idx_user_equipment_equipped ON user_equipment(user_id, is_equipped) WHERE is_equipped = TRUE;

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE equipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_equipment ENABLE ROW LEVEL SECURITY;

-- Equipment items: Anyone can view active items (public catalog)
CREATE POLICY "Anyone can view active equipment items"
  ON equipment_items FOR SELECT
  USING (is_active = TRUE);

-- User equipment: Users can only see their own items
CREATE POLICY "Users can view own equipment"
  ON user_equipment FOR SELECT
  USING (auth.uid() = user_id);

-- User equipment: Users can insert (via purchase)
CREATE POLICY "Users can acquire equipment"
  ON user_equipment FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- User equipment: Users can update (equip/unequip)
CREATE POLICY "Users can update own equipment"
  ON user_equipment FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- SEED DATA: 10 Starter Items
-- ============================================

-- HEAD Items (3)
INSERT INTO equipment_items (name, description, item_type, sprite_url, price_gold, rarity, required_level) VALUES
  ('Starter Helm', 'Ein einfacher Helm fuer Anfaenger', 'head', '/equipment/head/helmet-basic.png', 50, 'common', 1),
  ('Krieger-Helm', 'Ein robuster Helm fuer erfahrene Kaempfer', 'head', '/equipment/head/helmet-warrior.png', 200, 'rare', 5),
  ('Phoenix-Krone', 'Eine legendaere Krone, die in Flammen gluhen soll', 'head', '/equipment/head/crown-phoenix.png', 1000, 'legendary', 15);

-- BODY Items (4)
INSERT INTO equipment_items (name, description, item_type, sprite_url, price_gold, rarity, required_level) VALUES
  ('Leder-Ruestung', 'Leichte Ruestung aus gehaertetem Leder', 'body', '/equipment/body/armor-leather.png', 100, 'common', 1),
  ('Eisen-Ruestung', 'Solide Ruestung aus geschmiedetem Eisen', 'body', '/equipment/body/armor-iron.png', 300, 'rare', 8),
  ('Drachenschuppen-Ruestung', 'Epische Ruestung aus echten Drachenschuppen', 'body', '/equipment/body/armor-dragon.png', 600, 'epic', 12),
  ('Phoenix-Robe', 'Eine legendaere Robe, die den Traeger wiederbelebt', 'body', '/equipment/body/robe-phoenix.png', 1500, 'legendary', 20);

-- ACCESSORY Items (3)
INSERT INTO equipment_items (name, description, item_type, sprite_url, price_gold, rarity, required_level) VALUES
  ('Einfacher Umhang', 'Ein schlichter Umhang fuer kalte Naechte', 'accessory', '/equipment/accessory/cape-simple.png', 75, 'common', 1),
  ('Helden-Schild', 'Ein robuster Schild mit eingravier tem Wappen', 'accessory', '/equipment/accessory/shield-basic.png', 250, 'rare', 6),
  ('Phoenix-Fluegel', 'Legendaere Fluegel, die ewiges Feuer ausstrahlen', 'accessory', '/equipment/accessory/wings-phoenix.png', 2000, 'legendary', 25);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE equipment_items IS 'Catalog of all available equipment items for avatar customization';
COMMENT ON TABLE user_equipment IS 'User ownership and equipped status of equipment items';
COMMENT ON COLUMN equipment_items.item_type IS 'Slot type: head, body, or accessory - only one item per slot can be equipped';
COMMENT ON COLUMN equipment_items.sprite_url IS 'Path to sprite PNG (256x256 recommended) - stored in /public/equipment/';
COMMENT ON COLUMN equipment_items.rarity IS 'Item rarity affecting visual styling: common (gray), rare (blue), epic (purple), legendary (gold)';
COMMENT ON COLUMN user_equipment.is_equipped IS 'Whether this item is currently equipped in its slot';
