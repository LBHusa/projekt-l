-- Projekt L - Seed Data
-- Test-Daten basierend auf dem PRD

-- ============================================
-- 1. SKILL DOMAINS (Root-Orbs)
-- ============================================
INSERT INTO skill_domains (id, name, icon, color, description, display_order, faction_key) VALUES
  -- Original 5 Domains mit Faction-Mapping
  ('11111111-1111-1111-1111-111111111111', 'Coding', '💻', '#6366f1', 'Programmierung und Software-Entwicklung', 1, 'karriere'),
  ('22222222-2222-2222-2222-222222222222', 'Labor', '🔬', '#22c55e', 'Wissenschaftliche Laborarbeit und Molekularbiologie', 2, 'karriere'),
  ('33333333-3333-3333-3333-333333333333', 'Design', '🎨', '#f59e0b', 'UI/UX Design und visuelle Gestaltung', 3, 'hobbys'),
  ('44444444-4444-4444-4444-444444444444', 'Fitness', '💪', '#ef4444', 'Körperliche Fitness und Sport', 4, 'gesundheit'),
  ('55555555-5555-5555-5555-555555555555', 'Finanzen', '💰', '#8b5cf6', 'Finanzmanagement und Investitionen', 5, 'finanzen'),
  -- Neue Lebensbereiche
  ('66666666-6666-6666-6666-666666666666', 'Karriere', '💼', '#3b82f6', 'Berufliche Entwicklung und Karriere', 6, 'karriere'),
  ('77777777-7777-7777-7777-777777777777', 'Familie', '👨‍👩‍👧‍👦', '#ec4899', 'Familie und Beziehungen', 7, 'familie'),
  ('88888888-8888-8888-8888-888888888888', 'Hobbys', '🎮', '#8b5cf6', 'Freizeitaktivitäten und Hobbys', 8, 'hobbys'),
  ('99999999-9999-9999-9999-999999999999', 'Lernen', '📚', '#f59e0b', 'Bildung und lebenslanges Lernen', 9, 'lernen'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Soziales', '🤝', '#06b6d4', 'Freundschaften und soziales Netzwerk', 10, 'freunde'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Seele', '🧘', '#a855f7', 'Mentale Gesundheit und Spiritualität', 11, NULL);

-- ============================================
-- 2. SKILLS - Coding Domain
-- ============================================
INSERT INTO skills (id, domain_id, name, icon, description, display_order) VALUES
  -- Root Skills
  ('c1000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Python', '🐍', 'Hauptsprache für Backend und Data Science', 1),
  ('c1000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'TypeScript', '📘', 'Typsichere JavaScript-Entwicklung', 2),
  ('c1000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'SQL', '🗄️', 'Datenbankabfragen und -design', 3),
  ('c1000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Frontend', '🖥️', 'Web-Frontend-Entwicklung', 4),
  ('c1000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Backend', '⚙️', 'Server-seitige Entwicklung', 5),
  ('c1000000-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'DevOps', '🚀', 'Deployment und Infrastruktur', 6);

-- Sub-Skills für Python
INSERT INTO skills (id, domain_id, parent_skill_id, name, icon, description, display_order) VALUES
  ('c1100000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'c1000000-0000-0000-0000-000000000001', 'FastAPI', '⚡', 'Modernes Python Web-Framework', 1),
  ('c1100000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'c1000000-0000-0000-0000-000000000001', 'Data Science', '📊', 'Datenanalyse mit Python', 2),
  ('c1100000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'c1000000-0000-0000-0000-000000000001', 'ML/AI', '🤖', 'Machine Learning und KI', 3);

-- Sub-Skills für Frontend
INSERT INTO skills (id, domain_id, parent_skill_id, name, icon, description, display_order) VALUES
  ('c1400000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'c1000000-0000-0000-0000-000000000004', 'React', '⚛️', 'React.js Framework', 1),
  ('c1400000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'c1000000-0000-0000-0000-000000000004', 'Next.js', '▲', 'React Framework für Production', 2),
  ('c1400000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'c1000000-0000-0000-0000-000000000004', 'Tailwind', '🎨', 'Utility-First CSS Framework', 3);

-- ============================================
-- 3. SKILLS - Labor Domain
-- ============================================
INSERT INTO skills (id, domain_id, name, icon, description, display_order) VALUES
  ('a1000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Molekularbiologie', '🧬', 'Grundlagen der Molekularbiologie', 1),
  ('a1000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Zellkultur', '🦠', 'Arbeiten mit Zellkulturen', 2),
  ('a1000000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'Analytik', '📈', 'Analytische Methoden', 3);

-- Sub-Skills für Molekularbiologie
INSERT INTO skills (id, domain_id, parent_skill_id, name, icon, description, display_order) VALUES
  ('a1100000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'a1000000-0000-0000-0000-000000000001', 'PCR', '🔬', 'Polymerase-Kettenreaktion', 1),
  ('a1100000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'a1000000-0000-0000-0000-000000000001', 'Gelelektrophorese', '📊', 'DNA/RNA-Trennung', 2),
  ('a1100000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'a1000000-0000-0000-0000-000000000001', 'CRISPR', '✂️', 'Gen-Editierung', 3);

-- ============================================
-- 4. SKILL CONNECTIONS
-- ============================================
INSERT INTO skill_connections (skill_a_id, skill_b_id, connection_type, strength) VALUES
  -- Python <-> FastAPI (prerequisite)
  ('c1000000-0000-0000-0000-000000000001', 'c1100000-0000-0000-0000-000000000001', 'prerequisite', 9),
  -- Python <-> Data Science (prerequisite)
  ('c1000000-0000-0000-0000-000000000001', 'c1100000-0000-0000-0000-000000000002', 'prerequisite', 8),
  -- Python <-> ML/AI (prerequisite)
  ('c1000000-0000-0000-0000-000000000001', 'c1100000-0000-0000-0000-000000000003', 'prerequisite', 9),
  -- Data Science <-> ML/AI (synergy)
  ('c1100000-0000-0000-0000-000000000002', 'c1100000-0000-0000-0000-000000000003', 'synergy', 8),
  -- TypeScript <-> React (prerequisite)
  ('c1000000-0000-0000-0000-000000000002', 'c1400000-0000-0000-0000-000000000001', 'prerequisite', 7),
  -- React <-> Next.js (prerequisite)
  ('c1400000-0000-0000-0000-000000000001', 'c1400000-0000-0000-0000-000000000002', 'prerequisite', 9),
  -- SQL <-> Backend (synergy)
  ('c1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000005', 'synergy', 8),
  -- Molekularbiologie <-> PCR
  ('a1000000-0000-0000-0000-000000000001', 'a1100000-0000-0000-0000-000000000001', 'prerequisite', 9),
  -- Molekularbiologie <-> Gelelektrophorese
  ('a1000000-0000-0000-0000-000000000001', 'a1100000-0000-0000-0000-000000000002', 'prerequisite', 8);

-- ============================================
-- 5. TEST USER PROFILE
-- ============================================
INSERT INTO user_profiles (id, user_id, username, total_level, total_xp) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Lukas', 28, 12500);

-- ============================================
-- 5b. NOTIFICATION SETTINGS (Default für Test-User)
-- ============================================
INSERT INTO notification_settings (user_id, push_enabled, telegram_enabled)
VALUES ('00000000-0000-0000-0000-000000000001', FALSE, FALSE)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- 6. USER SKILLS (Test-Daten)
-- ============================================
INSERT INTO user_skills (user_id, skill_id, level, current_xp, last_used) VALUES
  -- Coding Skills
  ('00000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 85, 450, NOW() - INTERVAL '1 day'),
  ('00000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000002', 72, 280, NOW() - INTERVAL '2 days'),
  ('00000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000003', 68, 120, NOW() - INTERVAL '5 days'),
  ('00000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000004', 70, 350, NOW()),
  ('00000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000005', 65, 200, NOW() - INTERVAL '3 days'),
  ('00000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000006', 45, 80, NOW() - INTERVAL '10 days'),
  -- Sub-Skills
  ('00000000-0000-0000-0000-000000000001', 'c1100000-0000-0000-0000-000000000001', 70, 150, NOW() - INTERVAL '2 days'),
  ('00000000-0000-0000-0000-000000000001', 'c1100000-0000-0000-0000-000000000002', 55, 90, NOW() - INTERVAL '7 days'),
  ('00000000-0000-0000-0000-000000000001', 'c1100000-0000-0000-0000-000000000003', 52, 60, NOW() - INTERVAL '14 days'),
  ('00000000-0000-0000-0000-000000000001', 'c1400000-0000-0000-0000-000000000001', 75, 300, NOW()),
  ('00000000-0000-0000-0000-000000000001', 'c1400000-0000-0000-0000-000000000002', 65, 180, NOW()),
  ('00000000-0000-0000-0000-000000000001', 'c1400000-0000-0000-0000-000000000003', 70, 220, NOW()),
  -- Labor Skills
  ('00000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 75, 380, NOW() - INTERVAL '30 days'),
  ('00000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', 65, 150, NOW() - INTERVAL '45 days'),
  ('00000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003', 58, 90, NOW() - INTERVAL '60 days'),
  ('00000000-0000-0000-0000-000000000001', 'a1100000-0000-0000-0000-000000000001', 82, 420, NOW() - INTERVAL '30 days'),
  ('00000000-0000-0000-0000-000000000001', 'a1100000-0000-0000-0000-000000000002', 78, 350, NOW() - INTERVAL '35 days'),
  ('00000000-0000-0000-0000-000000000001', 'a1100000-0000-0000-0000-000000000003', 40, 50, NOW() - INTERVAL '90 days');

-- ============================================
-- 7. EXAMPLE EXPERIENCES
-- ============================================
INSERT INTO experiences (user_id, skill_id, description, xp_gained, date) VALUES
  ('00000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Projekt L Backend API erstellt', 150, CURRENT_DATE),
  ('00000000-0000-0000-0000-000000000001', 'c1400000-0000-0000-0000-000000000001', 'Dashboard UI mit React gebaut', 200, CURRENT_DATE),
  ('00000000-0000-0000-0000-000000000001', 'c1400000-0000-0000-0000-000000000002', 'Next.js App Router gelernt', 100, CURRENT_DATE - 1),
  ('00000000-0000-0000-0000-000000000001', 'a1100000-0000-0000-0000-000000000001', 'qPCR für Genexpression durchgeführt', 80, CURRENT_DATE - 30);
