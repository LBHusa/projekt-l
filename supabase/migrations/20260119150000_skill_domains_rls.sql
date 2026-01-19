-- ============================================
-- RLS Policies for skill_domains
-- Bug-Fix: User-created domains were visible to all users
-- ============================================

-- Enable RLS on skill_domains
ALTER TABLE skill_domains ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (clean slate)
DROP POLICY IF EXISTS "skill_domains_read_templates" ON skill_domains;
DROP POLICY IF EXISTS "skill_domains_read_own" ON skill_domains;
DROP POLICY IF EXISTS "skill_domains_insert_own" ON skill_domains;
DROP POLICY IF EXISTS "skill_domains_update_own" ON skill_domains;
DROP POLICY IF EXISTS "skill_domains_delete_own" ON skill_domains;

-- Policy 1: Template domains are readable by everyone
CREATE POLICY "skill_domains_read_templates" ON skill_domains
  FOR SELECT USING (is_template = true);

-- Policy 2: Users can read their own domains
CREATE POLICY "skill_domains_read_own" ON skill_domains
  FOR SELECT USING (created_by = auth.uid());

-- Policy 3: Users can insert their own domains
CREATE POLICY "skill_domains_insert_own" ON skill_domains
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- Policy 4: Users can update their own domains
CREATE POLICY "skill_domains_update_own" ON skill_domains
  FOR UPDATE USING (created_by = auth.uid());

-- Policy 5: Users can delete their own domains
CREATE POLICY "skill_domains_delete_own" ON skill_domains
  FOR DELETE USING (created_by = auth.uid());

-- Also enable RLS on skill_domain_factions (child table)
ALTER TABLE skill_domain_factions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "skill_domain_factions_read" ON skill_domain_factions;
DROP POLICY IF EXISTS "skill_domain_factions_insert" ON skill_domain_factions;
DROP POLICY IF EXISTS "skill_domain_factions_update" ON skill_domain_factions;
DROP POLICY IF EXISTS "skill_domain_factions_delete" ON skill_domain_factions;

-- Factions are readable if parent domain is readable
CREATE POLICY "skill_domain_factions_read" ON skill_domain_factions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM skill_domains 
      WHERE skill_domains.id = skill_domain_factions.domain_id
      AND (skill_domains.is_template = true OR skill_domains.created_by = auth.uid())
    )
  );

-- Factions insertable if user owns the parent domain
CREATE POLICY "skill_domain_factions_insert" ON skill_domain_factions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM skill_domains 
      WHERE skill_domains.id = skill_domain_factions.domain_id
      AND skill_domains.created_by = auth.uid()
    )
  );

-- Factions updatable if user owns the parent domain
CREATE POLICY "skill_domain_factions_update" ON skill_domain_factions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM skill_domains 
      WHERE skill_domains.id = skill_domain_factions.domain_id
      AND skill_domains.created_by = auth.uid()
    )
  );

-- Factions deletable if user owns the parent domain
CREATE POLICY "skill_domain_factions_delete" ON skill_domain_factions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM skill_domains 
      WHERE skill_domains.id = skill_domain_factions.domain_id
      AND skill_domains.created_by = auth.uid()
    )
  );
