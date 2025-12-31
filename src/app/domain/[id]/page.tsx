'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Link2, LayoutGrid, GitBranch } from 'lucide-react';
import SkillGraph from '@/components/SkillGraph';
import SkillTreeView from '@/components/SkillTreeView';
import SkillBreadcrumb from '@/components/SkillBreadcrumb';
import SkillForm, { type SkillFormData } from '@/components/SkillForm';
import ConnectionForm, { type ConnectionFormData } from '@/components/ConnectionForm';
import GraphViewManager from '@/components/GraphViewManager';
import type { SkillNodeData } from '@/components/SkillNode';
import { getDomainById } from '@/lib/data/domains';
import { getSkillsByDomain, getSkillTree, getConnectionsForDomain, createSkill, updateSkill, deleteSkill, createConnection } from '@/lib/data/skills';
import { getUserSkills } from '@/lib/data/user-skills';
import { getGraphViewsByDomain, getDefaultGraphView } from '@/lib/data/graph-views';
import type { SkillDomain, Skill, SkillConnection, SkillWithHierarchy, GraphView, ViewState } from '@/lib/database.types';

export default function DomainPage() {
  const params = useParams();
  const router = useRouter();
  const domainId = params.id as string;

  const [domain, setDomain] = useState<SkillDomain | null>(null);
  const [skillList, setSkillList] = useState<SkillNodeData[]>([]);
  const [skillTree, setSkillTree] = useState<SkillWithHierarchy[]>([]);
  const [connections, setConnections] = useState<{ source: string; target: string; type: 'prerequisite' | 'synergy' | 'related'; strength: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View mode: 'tree' or 'graph'
  const [viewMode, setViewMode] = useState<'tree' | 'graph'>('tree');
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);

  const [showSkillForm, setShowSkillForm] = useState(false);
  const [showConnectionForm, setShowConnectionForm] = useState(false);
  const [editingSkill, setEditingSkill] = useState<SkillNodeData | null>(null);

  // User levels map for tree view
  const [userLevels, setUserLevels] = useState<Map<string, number>>(new Map());

  // Graph Views state
  const [savedViews, setSavedViews] = useState<GraphView[]>([]);
  const [activeView, setActiveView] = useState<GraphView | null>(null);
  const [currentViewState, setCurrentViewState] = useState<ViewState | null>(null);

  // Load graph views
  const loadGraphViews = useCallback(async () => {
    try {
      const views = await getGraphViewsByDomain(domainId);
      setSavedViews(views);

      // Load default view if exists and no view is active
      if (!activeView) {
        const defaultView = views.find((v) => v.is_default);
        if (defaultView) {
          setActiveView(defaultView);
        }
      }
    } catch (err) {
      console.error('Error loading graph views:', err);
    }
  }, [domainId, activeView]);

  // Lade Daten aus Supabase
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Lade Domain
      const domainData = await getDomainById(domainId);
      if (!domainData) {
        setError('Domain nicht gefunden');
        return;
      }
      setDomain(domainData);

      // Lade Graph Views
      await loadGraphViews();

      // Lade Skills (flat list for graph)
      const skillsData = await getSkillsByDomain(domainId);

      // Lade Skill Tree (hierarchisch)
      const treeData = await getSkillTree(domainId);
      setSkillTree(treeData);

      // Lade User-Skills für Level-Daten
      const userSkillsData = await getUserSkills();
      const userSkillMap = new Map(userSkillsData.map(us => [us.skill_id, us]));

      // Create userLevels map for tree view
      const levelsMap = new Map<string, number>();
      userSkillsData.forEach(us => {
        levelsMap.set(us.skill_id, us.level);
      });
      setUserLevels(levelsMap);

      // Transformiere zu SkillNodeData (for graph view)
      const skillNodes: SkillNodeData[] = skillsData.map(skill => {
        const userSkill = userSkillMap.get(skill.id);
        return {
          id: skill.id,
          name: skill.name,
          icon: skill.icon,
          color: domainData.color,
          level: userSkill?.level || 1,
          description: skill.description || '',
        };
      });
      setSkillList(skillNodes);

      // Lade Connections
      const connectionsData = await getConnectionsForDomain(domainId);
      const formattedConnections = connectionsData.map(conn => ({
        source: conn.skill_a_id,
        target: conn.skill_b_id,
        type: conn.connection_type as 'prerequisite' | 'synergy' | 'related',
        strength: conn.strength,
      }));
      setConnections(formattedConnections);

    } catch (err) {
      console.error('Error loading domain:', err);
      setError('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  }, [domainId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateSkill = async (data: SkillFormData) => {
    if (!domain) return;

    try {
      const newSkill = await createSkill({
        domain_id: domain.id,
        name: data.name,
        icon: data.icon,
        description: data.description || '',
      });

      // Füge neuen Skill zur Liste hinzu
      const newSkillNode: SkillNodeData = {
        id: newSkill.id,
        name: newSkill.name,
        icon: newSkill.icon,
        color: domain.color,
        level: 1,
      };
      setSkillList(prev => [...prev, newSkillNode]);
      setShowSkillForm(false);
    } catch (err) {
      console.error('Error creating skill:', err);
      alert('Fehler beim Erstellen des Skills');
    }
  };

  const handleEditSkill = async (data: SkillFormData) => {
    if (!editingSkill) return;

    try {
      await updateSkill(editingSkill.id, {
        name: data.name,
        icon: data.icon,
        description: data.description || '',
      });

      // Update lokalen State
      setSkillList(prev =>
        prev.map(s =>
          s.id === editingSkill.id
            ? { ...s, name: data.name, icon: data.icon }
            : s
        )
      );
      setEditingSkill(null);
      setShowSkillForm(false);
    } catch (err) {
      console.error('Error updating skill:', err);
      alert('Fehler beim Aktualisieren des Skills');
    }
  };

  const handleDeleteSkill = async () => {
    if (!editingSkill) return;

    try {
      await deleteSkill(editingSkill.id);

      // Entferne aus lokalem State
      setSkillList(prev => prev.filter(s => s.id !== editingSkill.id));
      setEditingSkill(null);
      setShowSkillForm(false);
    } catch (err) {
      console.error('Error deleting skill:', err);
      alert('Fehler beim Löschen des Skills');
    }
  };

  const openEditModal = (skill: SkillNodeData) => {
    setEditingSkill(skill);
    setShowSkillForm(true);
  };

  const handleCreateConnection = async (data: ConnectionFormData) => {
    try {
      await createConnection({
        skill_a_id: data.skillAId,
        skill_b_id: data.skillBId,
        connection_type: data.connectionType,
        strength: data.strength,
      });

      // Reload data to show new connection
      await loadData();
      setShowConnectionForm(false);
    } catch (err) {
      console.error('Error creating connection:', err);
      throw err;
    }
  };

  // Handle view state changes from SkillGraph
  const handleViewChange = useCallback((state: ViewState) => {
    setCurrentViewState(state);
  }, []);

  // Handle loading a saved view
  const handleViewLoad = useCallback((view: GraphView | null) => {
    setActiveView(view);
    if (view) {
      setCurrentViewState({
        viewport: { x: view.viewport_x, y: view.viewport_y, zoom: view.viewport_zoom },
        nodePositions: view.node_positions,
        direction: view.direction,
      });
    }
  }, []);

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--accent-primary)] animate-pulse mx-auto mb-4" />
          <p className="text-[var(--foreground-muted)]">Lade Domain...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error || !domain) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{error || 'Domain nicht gefunden'}</h1>
          <button
            onClick={() => router.push('/')}
            className="text-[var(--accent-primary)] hover:underline"
          >
            Zurück zum Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-[var(--orb-border)] bg-[var(--background-secondary)]/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          {/* Breadcrumb Navigation */}
          <div className="mb-3">
            <SkillBreadcrumb domain={domain} />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <motion.div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: `${domain.color}20`,
                    boxShadow: `0 0 20px ${domain.color}40`,
                  }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <span className="text-2xl">{domain.icon}</span>
                </motion.div>
                <div>
                  <motion.h1
                    className="text-xl font-bold"
                    style={{ color: domain.color }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    {domain.name}
                  </motion.h1>
                  <motion.p
                    className="text-sm text-[var(--foreground-muted)]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    {domain.description}
                  </motion.p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-[var(--background-secondary)] rounded-lg border border-[var(--orb-border)] p-1">
                <button
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'tree'
                      ? 'bg-white/10 text-white'
                      : 'text-white/50 hover:text-white'
                  }`}
                  onClick={() => setViewMode('tree')}
                  title="Baum-Ansicht"
                >
                  <GitBranch className="w-4 h-4" />
                </button>
                <button
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'graph'
                      ? 'bg-white/10 text-white'
                      : 'text-white/50 hover:text-white'
                  }`}
                  onClick={() => setViewMode('graph')}
                  title="Graph-Ansicht"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>

              <motion.button
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--orb-border)] hover:bg-[var(--background-secondary)] transition-colors"
                style={{ borderColor: domain.color }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowConnectionForm(true)}
              >
                <Link2 className="w-4 h-4" style={{ color: domain.color }} />
                <span className="text-sm" style={{ color: domain.color }}>
                  Verbindung
                </span>
              </motion.button>

              <motion.button
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--orb-border)] hover:bg-[var(--background-secondary)] transition-colors"
                style={{ borderColor: domain.color }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setEditingSkill(null);
                  setShowSkillForm(true);
                }}
              >
                <Plus className="w-4 h-4" style={{ color: domain.color }} />
                <span className="text-sm" style={{ color: domain.color }}>
                  Skill hinzufügen
                </span>
              </motion.button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Stats Bar */}
          <motion.div
            className="grid grid-cols-4 gap-4 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="bg-[var(--background-secondary)] rounded-lg p-4 border border-[var(--orb-border)]">
              <div className="text-sm text-[var(--foreground-muted)]">Skills</div>
              <div className="text-2xl font-bold" style={{ color: domain.color }}>
                {skillList.length}
              </div>
            </div>
            <div className="bg-[var(--background-secondary)] rounded-lg p-4 border border-[var(--orb-border)]">
              <div className="text-sm text-[var(--foreground-muted)]">Durchschn. Level</div>
              <div className="text-2xl font-bold" style={{ color: domain.color }}>
                {skillList.length > 0
                  ? Math.round(skillList.reduce((sum, s) => sum + (s.level || 0), 0) / skillList.length)
                  : 0}
              </div>
            </div>
            <div className="bg-[var(--background-secondary)] rounded-lg p-4 border border-[var(--orb-border)]">
              <div className="text-sm text-[var(--foreground-muted)]">Verbindungen</div>
              <div className="text-2xl font-bold" style={{ color: domain.color }}>
                {connections.length}
              </div>
            </div>
            <div className="bg-[var(--background-secondary)] rounded-lg p-4 border border-[var(--orb-border)]">
              <div className="text-sm text-[var(--foreground-muted)]">Höchstes Level</div>
              <div className="text-2xl font-bold" style={{ color: domain.color }}>
                {skillList.length > 0
                  ? Math.max(...skillList.map((s) => s.level || 0))
                  : 0}
              </div>
            </div>
          </motion.div>

          {/* Tree View */}
          {viewMode === 'tree' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-[var(--background-secondary)] rounded-xl border border-[var(--orb-border)] p-4"
            >
              <h3 className="text-lg font-semibold mb-4 text-white/80">
                Skill-Hierarchie
              </h3>
              {skillTree.length > 0 ? (
                <SkillTreeView
                  skills={skillTree}
                  onSkillClick={(skill) => router.push(`/skill/${skill.id}`)}
                  onSkillRightClick={(skill, e) => {
                    const nodeData = skillList.find(s => s.id === skill.id);
                    if (nodeData) {
                      openEditModal(nodeData);
                    }
                  }}
                  selectedSkillId={selectedSkillId}
                  domainColor={domain.color}
                  userLevels={userLevels}
                  expandedByDefault={true}
                  maxDepthExpanded={3}
                />
              ) : (
                <div className="text-center py-8 text-white/40">
                  <p>Noch keine Skills vorhanden.</p>
                  <p className="text-sm mt-2">Erstelle deinen ersten Skill mit dem + Button.</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Graph View */}
          {viewMode === 'graph' && (
            <>
              {/* Graph View Manager */}
              <motion.div
                className="mb-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
              >
                <GraphViewManager
                  domainId={domainId}
                  savedViews={savedViews}
                  activeView={activeView}
                  currentState={currentViewState}
                  onViewLoad={handleViewLoad}
                  onViewsChange={loadGraphViews}
                />
              </motion.div>

              {/* Skill Graph with Dagre Layout */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <SkillGraph
                  skills={skillList}
                  skillTree={skillTree}
                  connections={connections}
                  domainColor={domain.color}
                  savedView={activeView || undefined}
                  onViewChange={handleViewChange}
                />
              </motion.div>

              {/* Skill List */}
              <motion.div
                className="mt-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <h3 className="text-lg font-semibold mb-3 text-[var(--foreground-muted)]">
                  Alle Skills
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {skillList.map((skill) => (
                    <motion.button
                      key={skill.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-[var(--orb-border)] bg-[var(--background-secondary)] hover:bg-[var(--background)] transition-colors text-left group"
                      onClick={() => router.push(`/skill/${skill.id}`)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        openEditModal(skill);
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      title="Rechtsklick zum Bearbeiten"
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{
                          backgroundColor: `${skill.color}20`,
                          boxShadow: `0 0 10px ${skill.color}30`,
                        }}
                      >
                        <span className="text-lg">{skill.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{skill.name}</div>
                        <div className="text-xs" style={{ color: skill.color }}>
                          Level {skill.level}
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </div>
      </main>

      {/* Skill Form Modal */}
      <SkillForm
        isOpen={showSkillForm}
        onClose={() => {
          setShowSkillForm(false);
          setEditingSkill(null);
        }}
        onSubmit={editingSkill ? handleEditSkill : handleCreateSkill}
        onDelete={editingSkill ? handleDeleteSkill : undefined}
        initialData={editingSkill ? {
          name: editingSkill.name,
          icon: editingSkill.icon,
          description: editingSkill.description || '',
        } : undefined}
        mode={editingSkill ? 'edit' : 'create'}
        domainColor={domain.color}
      />

      {/* Connection Form Modal */}
      <ConnectionForm
        isOpen={showConnectionForm}
        onClose={() => setShowConnectionForm(false)}
        onSubmit={handleCreateConnection}
        skills={skillList.map(s => ({ id: s.id, name: s.name, icon: s.icon }))}
        domainColor={domain.color}
      />
    </div>
  );
}
