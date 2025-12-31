import { createBrowserClient } from '@/lib/supabase';
import type { GraphView, GraphViewInsert, GraphViewUpdate } from '@/lib/database.types';

// ============================================
// GRAPH VIEWS DATA ACCESS
// ============================================

/**
 * Get all saved views for a domain
 */
export async function getGraphViewsByDomain(domainId: string): Promise<GraphView[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('graph_views')
    .select('*')
    .eq('domain_id', domainId)
    .order('is_default', { ascending: false })
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching graph views:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get a single view by ID
 */
export async function getGraphView(id: string): Promise<GraphView | null> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('graph_views')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching graph view:', error);
    throw error;
  }

  return data;
}

/**
 * Get the default view for a domain (if any)
 */
export async function getDefaultGraphView(domainId: string): Promise<GraphView | null> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('graph_views')
    .select('*')
    .eq('domain_id', domainId)
    .eq('is_default', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // No default view
    }
    console.error('Error fetching default view:', error);
    throw error;
  }

  return data;
}

/**
 * Create a new graph view
 */
export async function createGraphView(view: GraphViewInsert): Promise<GraphView> {
  const supabase = createBrowserClient();

  // If this is marked as default, unset any existing default first
  if (view.is_default) {
    await supabase
      .from('graph_views')
      .update({ is_default: false })
      .eq('domain_id', view.domain_id)
      .eq('is_default', true);
  }

  const { data, error } = await supabase
    .from('graph_views')
    .insert(view)
    .select()
    .single();

  if (error) {
    console.error('Error creating graph view:', error);
    throw error;
  }

  return data;
}

/**
 * Update an existing graph view
 */
export async function updateGraphView(
  id: string,
  updates: GraphViewUpdate
): Promise<GraphView> {
  const supabase = createBrowserClient();

  // If setting as default, get domain_id first and unset other defaults
  if (updates.is_default) {
    const existing = await getGraphView(id);
    if (existing) {
      await supabase
        .from('graph_views')
        .update({ is_default: false })
        .eq('domain_id', existing.domain_id)
        .eq('is_default', true)
        .neq('id', id);
    }
  }

  const { data, error } = await supabase
    .from('graph_views')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating graph view:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a graph view
 */
export async function deleteGraphView(id: string): Promise<void> {
  const supabase = createBrowserClient();

  const { error } = await supabase
    .from('graph_views')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting graph view:', error);
    throw error;
  }
}

/**
 * Set a view as the default for its domain
 */
export async function setDefaultGraphView(
  domainId: string,
  viewId: string
): Promise<void> {
  const supabase = createBrowserClient();

  // Unset all defaults for this domain
  await supabase
    .from('graph_views')
    .update({ is_default: false })
    .eq('domain_id', domainId)
    .eq('is_default', true);

  // Set the new default
  const { error } = await supabase
    .from('graph_views')
    .update({ is_default: true })
    .eq('id', viewId);

  if (error) {
    console.error('Error setting default view:', error);
    throw error;
  }
}

/**
 * Save current view state (create or update)
 */
export async function saveViewState(
  viewId: string | null,
  domainId: string,
  name: string,
  state: {
    viewport: { x: number; y: number; zoom: number };
    nodePositions: Record<string, { x: number; y: number }>;
    direction: 'TB' | 'LR';
  },
  options?: {
    description?: string;
    isDefault?: boolean;
  }
): Promise<GraphView> {
  const viewData: GraphViewInsert = {
    domain_id: domainId,
    name,
    description: options?.description || null,
    viewport_x: state.viewport.x,
    viewport_y: state.viewport.y,
    viewport_zoom: state.viewport.zoom,
    direction: state.direction,
    node_positions: state.nodePositions,
    is_default: options?.isDefault || false,
  };

  if (viewId) {
    return updateGraphView(viewId, viewData);
  } else {
    return createGraphView(viewData);
  }
}
