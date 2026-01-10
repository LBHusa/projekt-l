import { createBrowserClient } from '@/lib/supabase';
import type {
  FreelanceClient,
  FreelanceProject,
  FreelanceInvoice,
  FreelanceProjectStatus,
  FreelanceInvoiceStatus,
} from '@/lib/database.types';
import { logActivity } from './activity-log';
import { updateFactionStats } from './factions';

// ============================================
// FREELANCER DATA ACCESS
// ============================================

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

// ============================================
// CLIENTS
// ============================================

export async function getClients(
  userId: string = TEST_USER_ID
): Promise<FreelanceClient[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('freelance_clients')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching clients:', error);
    throw error;
  }

  return data || [];
}

export async function getActiveClients(
  userId: string = TEST_USER_ID
): Promise<FreelanceClient[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('freelance_clients')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching active clients:', error);
    throw error;
  }

  return data || [];
}

export interface CreateClientInput {
  name: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  company_info?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

export async function createClient(
  input: CreateClientInput,
  userId: string = TEST_USER_ID
): Promise<FreelanceClient> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('freelance_clients')
    .insert({
      ...input,
      user_id: userId,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating client:', error);
    throw error;
  }

  return data;
}

export async function updateClient(
  clientId: string,
  input: Partial<CreateClientInput>
): Promise<FreelanceClient> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('freelance_clients')
    .update(input)
    .eq('id', clientId)
    .select()
    .single();

  if (error) {
    console.error('Error updating client:', error);
    throw error;
  }

  return data;
}

export async function deleteClient(clientId: string): Promise<void> {
  const supabase = createBrowserClient();

  const { error } = await supabase
    .from('freelance_clients')
    .delete()
    .eq('id', clientId);

  if (error) {
    console.error('Error deleting client:', error);
    throw error;
  }
}

// ============================================
// PROJECTS
// ============================================

export async function getProjects(
  userId: string = TEST_USER_ID
): Promise<(FreelanceProject & { client?: FreelanceClient })[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('freelance_projects')
    .select('*, client:freelance_clients(*)')
    .eq('user_id', userId)
    .order('start_date', { ascending: false });

  if (error) {
    console.error('Error fetching projects:', error);
    throw error;
  }

  return data || [];
}

export async function getActiveProjects(
  userId: string = TEST_USER_ID
): Promise<(FreelanceProject & { client?: FreelanceClient })[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('freelance_projects')
    .select('*, client:freelance_clients(*)')
    .eq('user_id', userId)
    .in('status', ['planning', 'active', 'paused'])
    .order('start_date', { ascending: false });

  if (error) {
    console.error('Error fetching active projects:', error);
    throw error;
  }

  return data || [];
}

export interface CreateProjectInput {
  client_id?: string | null;
  name: string;
  description?: string | null;
  status?: FreelanceProjectStatus;
  start_date?: string | null;
  end_date?: string | null;
  completed_at?: string | null;
  budget?: number | null;
  currency?: string;
  hourly_rate?: number | null;
  estimated_hours?: number | null;
  tags?: string[] | null;
}

export async function createProject(
  input: CreateProjectInput,
  userId: string = TEST_USER_ID
): Promise<FreelanceProject> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('freelance_projects')
    .insert({
      ...input,
      user_id: userId,
      status: input.status || 'planning',
      currency: input.currency || 'EUR',
      actual_cost: 0,
      actual_hours: 0,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating project:', error);
    throw error;
  }

  return data;
}

export async function updateProject(
  projectId: string,
  input: Partial<CreateProjectInput>,
  userId: string = TEST_USER_ID
): Promise<FreelanceProject> {
  const supabase = createBrowserClient();

  // Fetch current project state BEFORE updating
  const { data: currentProject } = await supabase
    .from('freelance_projects')
    .select('*')
    .eq('id', projectId)
    .single();

  // If marking as completed, set completed_at
  const updateData = { ...input };
  if (input.status === 'completed' && currentProject?.status !== 'completed') {
    updateData.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('freelance_projects')
    .update(updateData)
    .eq('id', projectId)
    .select()
    .single();

  if (error) {
    console.error('Error updating project:', error);
    throw error;
  }

  // XP Integration: Award XP when project is completed
  if (
    input.status === 'completed' &&
    currentProject &&
    currentProject.status !== 'completed'
  ) {
    const xpGained = calculateProjectXp(data);

    // Update Faction Stats
    if (xpGained > 0) {
      try {
        await updateFactionStats('karriere', xpGained, userId);
      } catch (err) {
        console.error('Error updating faction stats for project:', err);
      }
    }

    // Log Activity for Feed
    try {
      await logActivity({
        userId,
        activityType: 'project_completed',
        factionId: 'karriere',
        title: `Freelance-Projekt abgeschlossen: "${data.name}"`,
        description: data.description || undefined,
        xpAmount: xpGained,
        relatedEntityType: 'freelance_project',
        relatedEntityId: projectId,
        metadata: {
          actual_cost: data.actual_cost,
          actual_hours: data.actual_hours,
          budget: data.budget,
        },
      });
    } catch (err) {
      console.error('Error logging project activity:', err);
    }
  }

  return data;
}

// Calculate XP based on project size and completion
function calculateProjectXp(project: FreelanceProject): number {
  let xp = 100; // Base XP for completing a project

  // Bonus for project budget
  if (project.actual_cost > 0) {
    if (project.actual_cost >= 10000) xp += 100; // 10k+: +100 XP (200 total)
    else if (project.actual_cost >= 5000) xp += 50; // 5k+: +50 XP (150 total)
    else if (project.actual_cost >= 1000) xp += 25; // 1k+: +25 XP (125 total)
  }

  // Bonus for staying under budget
  if (project.budget && project.actual_cost > 0 && project.actual_cost <= project.budget) {
    xp += 25; // Stayed under budget: +25 XP
  }

  return xp;
}

export async function deleteProject(projectId: string): Promise<void> {
  const supabase = createBrowserClient();

  const { error } = await supabase
    .from('freelance_projects')
    .delete()
    .eq('id', projectId);

  if (error) {
    console.error('Error deleting project:', error);
    throw error;
  }
}

// ============================================
// INVOICES
// ============================================

export async function getInvoices(
  userId: string = TEST_USER_ID
): Promise<(FreelanceInvoice & { project?: FreelanceProject })[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('freelance_invoices')
    .select('*, project:freelance_projects(*)')
    .eq('user_id', userId)
    .order('issue_date', { ascending: false });

  if (error) {
    console.error('Error fetching invoices:', error);
    throw error;
  }

  return data || [];
}

export async function getProjectInvoices(
  projectId: string
): Promise<FreelanceInvoice[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('freelance_invoices')
    .select('*')
    .eq('project_id', projectId)
    .order('issue_date', { ascending: false });

  if (error) {
    console.error('Error fetching project invoices:', error);
    throw error;
  }

  return data || [];
}

export interface CreateInvoiceInput {
  project_id?: string | null;
  invoice_number?: string | null;
  amount: number;
  currency?: string;
  status?: FreelanceInvoiceStatus;
  issue_date: string;
  due_date: string;
  notes?: string | null;
}

export async function createInvoice(
  input: CreateInvoiceInput,
  userId: string = TEST_USER_ID
): Promise<FreelanceInvoice> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('freelance_invoices')
    .insert({
      ...input,
      user_id: userId,
      status: input.status || 'draft',
      currency: input.currency || 'EUR',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating invoice:', error);
    throw error;
  }

  return data;
}

export async function updateInvoice(
  invoiceId: string,
  input: Partial<CreateInvoiceInput & { paid_date?: string | null }>
): Promise<FreelanceInvoice> {
  const supabase = createBrowserClient();

  // If marking as paid, set paid_date if not already set
  const updateData = { ...input };
  if (input.status === 'paid' && !input.paid_date) {
    updateData.paid_date = new Date().toISOString().split('T')[0];
  }

  const { data, error } = await supabase
    .from('freelance_invoices')
    .update(updateData)
    .eq('id', invoiceId)
    .select()
    .single();

  if (error) {
    console.error('Error updating invoice:', error);
    throw error;
  }

  return data;
}

export async function deleteInvoice(invoiceId: string): Promise<void> {
  const supabase = createBrowserClient();

  const { error } = await supabase
    .from('freelance_invoices')
    .delete()
    .eq('id', invoiceId);

  if (error) {
    console.error('Error deleting invoice:', error);
    throw error;
  }
}

// ============================================
// FREELANCER STATS
// ============================================

export interface FreelancerStats {
  totalClients: number;
  activeClients: number;
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalRevenue: number;
  totalHours: number;
  avgHourlyRate: number;
  pendingInvoices: number;
  paidInvoices: number;
  totalInvoiced: number;
}

export async function getFreelancerStats(
  userId: string = TEST_USER_ID
): Promise<FreelancerStats> {
  const [clients, projects, invoices] = await Promise.all([
    getClients(userId),
    getProjects(userId),
    getInvoices(userId),
  ]);

  const activeProjects = projects.filter(p => ['planning', 'active', 'paused'].includes(p.status));
  const completedProjects = projects.filter(p => p.status === 'completed');

  const totalRevenue = completedProjects.reduce((sum, p) => sum + (p.actual_cost || 0), 0);
  const totalHours = completedProjects.reduce((sum, p) => sum + (p.actual_hours || 0), 0);

  const projectsWithRate = completedProjects.filter(p => p.hourly_rate && p.hourly_rate > 0);
  const avgHourlyRate = projectsWithRate.length > 0
    ? projectsWithRate.reduce((sum, p) => sum + (p.hourly_rate || 0), 0) / projectsWithRate.length
    : 0;

  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;
  const pendingInvoices = invoices.filter(inv => ['draft', 'sent', 'overdue'].includes(inv.status)).length;

  return {
    totalClients: clients.length,
    activeClients: clients.filter(c => c.is_active).length,
    totalProjects: projects.length,
    activeProjects: activeProjects.length,
    completedProjects: completedProjects.length,
    totalRevenue,
    totalHours,
    avgHourlyRate: Math.round(avgHourlyRate * 100) / 100,
    pendingInvoices,
    paidInvoices,
    totalInvoiced,
  };
}
