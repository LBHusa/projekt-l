'use client';

import { useState, useCallback } from 'react';
import {
  FolderOpen,
  Save,
  Star,
  Trash2,
  Plus,
  ChevronDown,
  X,
  Check,
} from 'lucide-react';
import type { GraphView, ViewState } from '@/lib/database.types';
import {
  createGraphView,
  updateGraphView,
  deleteGraphView,
  setDefaultGraphView,
} from '@/lib/data/graph-views';

interface GraphViewManagerProps {
  domainId: string;
  savedViews: GraphView[];
  activeView: GraphView | null;
  currentState: ViewState | null;
  onViewLoad: (view: GraphView | null) => void;
  onViewsChange: () => void; // Callback to refresh views list
}

export default function GraphViewManager({
  domainId,
  savedViews,
  activeView,
  currentState,
  onViewLoad,
  onViewsChange,
}: GraphViewManagerProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Check if current state differs from active view (unsaved changes)
  const hasUnsavedChanges = useCallback(() => {
    if (!currentState) return false;
    if (!activeView) return true; // No view selected = changes exist

    // Compare viewport
    if (
      Math.abs(currentState.viewport.x - activeView.viewport_x) > 1 ||
      Math.abs(currentState.viewport.y - activeView.viewport_y) > 1 ||
      Math.abs(currentState.viewport.zoom - activeView.viewport_zoom) > 0.01
    ) {
      return true;
    }

    // Compare direction
    if (currentState.direction !== activeView.direction) {
      return true;
    }

    // Compare node positions
    const savedPositions = activeView.node_positions || {};
    const currentPositions = currentState.nodePositions || {};
    const allNodeIds = new Set([
      ...Object.keys(savedPositions),
      ...Object.keys(currentPositions),
    ]);

    for (const nodeId of allNodeIds) {
      const saved = savedPositions[nodeId];
      const current = currentPositions[nodeId];
      if (!saved || !current) continue;
      if (Math.abs(saved.x - current.x) > 1 || Math.abs(saved.y - current.y) > 1) {
        return true;
      }
    }

    return false;
  }, [currentState, activeView]);

  // Save current view (update existing or create new)
  const handleSave = async () => {
    if (!currentState) return;

    setIsSaving(true);
    try {
      if (activeView) {
        // Update existing view
        await updateGraphView(activeView.id, {
          viewport_x: currentState.viewport.x,
          viewport_y: currentState.viewport.y,
          viewport_zoom: currentState.viewport.zoom,
          direction: currentState.direction,
          node_positions: currentState.nodePositions,
        });
      } else {
        // Open save dialog for new view
        setIsSaveDialogOpen(true);
        setIsSaving(false);
        return;
      }
      onViewsChange();
    } catch (error) {
      console.error('Error saving view:', error);
    }
    setIsSaving(false);
  };

  // Create new view
  const handleCreateView = async () => {
    if (!currentState || !saveName.trim()) return;

    setIsSaving(true);
    try {
      const newView = await createGraphView({
        domain_id: domainId,
        name: saveName.trim(),
        description: saveDescription.trim() || null,
        viewport_x: currentState.viewport.x,
        viewport_y: currentState.viewport.y,
        viewport_zoom: currentState.viewport.zoom,
        direction: currentState.direction,
        node_positions: currentState.nodePositions,
        is_default: savedViews.length === 0, // First view becomes default
      });
      onViewLoad(newView);
      onViewsChange();
      setIsSaveDialogOpen(false);
      setSaveName('');
      setSaveDescription('');
    } catch (error) {
      console.error('Error creating view:', error);
    }
    setIsSaving(false);
  };

  // Delete a view
  const handleDeleteView = async (viewId: string) => {
    try {
      await deleteGraphView(viewId);
      if (activeView?.id === viewId) {
        onViewLoad(null);
      }
      onViewsChange();
    } catch (error) {
      console.error('Error deleting view:', error);
    }
  };

  // Set view as default
  const handleSetDefault = async (viewId: string) => {
    try {
      await setDefaultGraphView(domainId, viewId);
      onViewsChange();
    } catch (error) {
      console.error('Error setting default view:', error);
    }
  };

  return (
    <div className="relative flex items-center gap-2">
      {/* Views Dropdown */}
      <div className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--orb-border)] bg-[var(--background-secondary)] hover:bg-[var(--background)] transition-colors"
        >
          <FolderOpen className="w-4 h-4 text-white/60" />
          <span className="text-sm text-white/80">
            {activeView?.name || 'Ansichten'}
          </span>
          {hasUnsavedChanges() && (
            <span className="w-2 h-2 rounded-full bg-amber-500" title="Ungespeicherte Änderungen" />
          )}
          <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {isDropdownOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => {
                setIsDropdownOpen(false);
                setIsManaging(false);
              }}
            />

            {/* Dropdown Menu */}
            <div className="absolute top-full left-0 mt-2 w-64 rounded-lg border border-[var(--orb-border)] bg-[var(--background-secondary)] shadow-xl z-50 overflow-hidden">
              {/* Create New */}
              <button
                onClick={() => {
                  setIsSaveDialogOpen(true);
                  setIsDropdownOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-white/80 hover:bg-white/5 transition-colors border-b border-[var(--orb-border)]"
              >
                <Plus className="w-4 h-4 text-green-400" />
                <span>Neue Ansicht erstellen</span>
              </button>

              {/* Views List */}
              {savedViews.length > 0 ? (
                <div className="max-h-64 overflow-y-auto">
                  {savedViews.map((view) => (
                    <div
                      key={view.id}
                      className={`flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors ${
                        activeView?.id === view.id ? 'bg-white/10' : ''
                      }`}
                    >
                      <button
                        onClick={() => {
                          onViewLoad(view);
                          setIsDropdownOpen(false);
                          setIsManaging(false);
                        }}
                        className="flex-1 flex items-center gap-2 text-left"
                      >
                        {view.is_default && (
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        )}
                        <span className="text-sm text-white/80 truncate">{view.name}</span>
                      </button>

                      {isManaging && (
                        <div className="flex items-center gap-1">
                          {!view.is_default && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetDefault(view.id);
                              }}
                              className="p-1 rounded hover:bg-white/10 transition-colors"
                              title="Als Standard setzen"
                            >
                              <Star className="w-3.5 h-3.5 text-white/40" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteView(view.id);
                            }}
                            className="p-1 rounded hover:bg-red-500/20 transition-colors"
                            title="Löschen"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-3 py-4 text-center text-sm text-white/40">
                  Keine gespeicherten Ansichten
                </div>
              )}

              {/* Manage Views Toggle */}
              {savedViews.length > 0 && (
                <button
                  onClick={() => setIsManaging(!isManaging)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-white/50 hover:text-white/70 hover:bg-white/5 transition-colors border-t border-[var(--orb-border)]"
                >
                  {isManaging ? 'Fertig' : 'Verwalten...'}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={isSaving || !currentState}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
          hasUnsavedChanges()
            ? 'border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400'
            : 'border-[var(--orb-border)] bg-[var(--background-secondary)] hover:bg-[var(--background)] text-white/60'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        title={activeView ? 'Änderungen speichern' : 'Als neue Ansicht speichern'}
      >
        <Save className="w-4 h-4" />
        <span className="text-sm">{activeView ? 'Speichern' : 'Speichern als...'}</span>
      </button>

      {/* Save Dialog */}
      {isSaveDialogOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 z-50"
            onClick={() => setIsSaveDialogOpen(false)}
          />

          {/* Dialog */}
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-xl border border-[var(--orb-border)] bg-[var(--background-secondary)] shadow-2xl z-50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Ansicht speichern</h3>
              <button
                onClick={() => setIsSaveDialogOpen(false)}
                className="p-1 rounded hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Name *</label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="z.B. Fokus: Frontend Skills"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--orb-border)] bg-[var(--background)] text-white placeholder:text-white/30 focus:outline-none focus:border-white/40"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-1.5">Beschreibung (optional)</label>
                <textarea
                  value={saveDescription}
                  onChange={(e) => setSaveDescription(e.target.value)}
                  placeholder="Kurze Beschreibung dieser Ansicht..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--orb-border)] bg-[var(--background)] text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setIsSaveDialogOpen(false)}
                className="px-4 py-2 rounded-lg border border-[var(--orb-border)] text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleCreateView}
                disabled={!saveName.trim() || isSaving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4" />
                <span>Erstellen</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
