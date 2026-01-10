-- ================================================================
-- FREELANCER MODE FOR KARRIERE
-- ================================================================
-- Provides freelance/self-employed tracking capabilities
-- Author: Worker 3
-- Date: 2026-01-10
-- ================================================================

-- ================================================================
-- TABLE: freelance_clients
-- ================================================================
CREATE TABLE IF NOT EXISTS public.freelance_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  company_info TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast user lookups
CREATE INDEX idx_freelance_clients_user_id ON public.freelance_clients(user_id);
CREATE INDEX idx_freelance_clients_active ON public.freelance_clients(user_id, is_active);

-- ================================================================
-- TABLE: freelance_projects
-- ================================================================
CREATE TABLE IF NOT EXISTS public.freelance_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.freelance_clients(id) ON DELETE SET NULL,

  -- Project Info
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'paused', 'completed', 'cancelled')),

  -- Timeline
  start_date DATE,
  end_date DATE,
  completed_at TIMESTAMPTZ,

  -- Financial
  budget NUMERIC(12, 2),
  actual_cost NUMERIC(12, 2) DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  hourly_rate NUMERIC(8, 2),

  -- Time Tracking
  estimated_hours NUMERIC(8, 2),
  actual_hours NUMERIC(8, 2) DEFAULT 0,

  -- Metadata
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_freelance_projects_user_id ON public.freelance_projects(user_id);
CREATE INDEX idx_freelance_projects_client_id ON public.freelance_projects(client_id);
CREATE INDEX idx_freelance_projects_status ON public.freelance_projects(user_id, status);
CREATE INDEX idx_freelance_projects_dates ON public.freelance_projects(user_id, start_date, end_date);

-- ================================================================
-- TABLE: freelance_invoices
-- ================================================================
CREATE TABLE IF NOT EXISTS public.freelance_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.freelance_projects(id) ON DELETE SET NULL,

  -- Invoice Details
  invoice_number TEXT,
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),

  -- Dates
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,

  -- Additional Info
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_freelance_invoices_user_id ON public.freelance_invoices(user_id);
CREATE INDEX idx_freelance_invoices_project_id ON public.freelance_invoices(project_id);
CREATE INDEX idx_freelance_invoices_status ON public.freelance_invoices(user_id, status);
CREATE INDEX idx_freelance_invoices_dates ON public.freelance_invoices(user_id, due_date);

-- ================================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================================

-- Enable RLS
ALTER TABLE public.freelance_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelance_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelance_invoices ENABLE ROW LEVEL SECURITY;

-- Clients Policies
CREATE POLICY "Users can view their own clients"
  ON public.freelance_clients FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own clients"
  ON public.freelance_clients FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clients"
  ON public.freelance_clients FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clients"
  ON public.freelance_clients FOR DELETE
  USING (auth.uid() = user_id);

-- Projects Policies
CREATE POLICY "Users can view their own projects"
  ON public.freelance_projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects"
  ON public.freelance_projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON public.freelance_projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON public.freelance_projects FOR DELETE
  USING (auth.uid() = user_id);

-- Invoices Policies
CREATE POLICY "Users can view their own invoices"
  ON public.freelance_invoices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own invoices"
  ON public.freelance_invoices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoices"
  ON public.freelance_invoices FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own invoices"
  ON public.freelance_invoices FOR DELETE
  USING (auth.uid() = user_id);

-- ================================================================
-- TRIGGERS FOR updated_at
-- ================================================================

-- Create trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach triggers
CREATE TRIGGER update_freelance_clients_updated_at
  BEFORE UPDATE ON public.freelance_clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_freelance_projects_updated_at
  BEFORE UPDATE ON public.freelance_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_freelance_invoices_updated_at
  BEFORE UPDATE ON public.freelance_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- HELPER VIEWS
-- ================================================================

-- View: Active Projects with Client Info
CREATE OR REPLACE VIEW public.v_active_freelance_projects AS
SELECT
  p.*,
  c.name as client_name,
  c.contact_email as client_email,
  c.company_info as client_company
FROM public.freelance_projects p
LEFT JOIN public.freelance_clients c ON p.client_id = c.id
WHERE p.status IN ('planning', 'active', 'paused');

-- View: Project Revenue Summary
CREATE OR REPLACE VIEW public.v_freelance_revenue_summary AS
SELECT
  user_id,
  COUNT(*) as total_projects,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_projects,
  SUM(actual_cost) FILTER (WHERE status = 'completed') as total_revenue,
  SUM(actual_hours) FILTER (WHERE status = 'completed') as total_hours,
  AVG(hourly_rate) FILTER (WHERE status = 'completed' AND hourly_rate IS NOT NULL) as avg_hourly_rate
FROM public.freelance_projects
GROUP BY user_id;

-- ================================================================
-- COMMENTS
-- ================================================================

COMMENT ON TABLE public.freelance_clients IS 'Client database for freelance work';
COMMENT ON TABLE public.freelance_projects IS 'Freelance project tracking with time and budget';
COMMENT ON TABLE public.freelance_invoices IS 'Invoice management for freelance projects';

COMMENT ON COLUMN public.freelance_projects.status IS 'Project status: planning, active, paused, completed, cancelled';
COMMENT ON COLUMN public.freelance_invoices.status IS 'Invoice status: draft, sent, paid, overdue, cancelled';
