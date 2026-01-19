'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { FactionId } from '@/lib/database.types';
import { FACTIONS, FACTION_COLORS } from '@/lib/ui/constants';

export interface FactionWeight {
  faction_id: FactionId;
  weight: number;
  is_primary: boolean;
}

interface DomainFactionEditorProps {
  initialFactions?: FactionWeight[];
  onChange: (factions: FactionWeight[]) => void;
  domainName?: string;
}

// Smart default weights based on domain name keywords
const SMART_DEFAULTS: Record<string, FactionWeight[]> = {
  coding: [
    { faction_id: 'karriere', weight: 60, is_primary: true },
    { faction_id: 'hobby', weight: 25, is_primary: false },
    { faction_id: 'wissen', weight: 15, is_primary: false },
  ],
  labor: [
    { faction_id: 'karriere', weight: 70, is_primary: true },
    { faction_id: 'wissen', weight: 30, is_primary: false },
  ],
  fitness: [
    { faction_id: 'koerper', weight: 80, is_primary: true },
    { faction_id: 'geist', weight: 20, is_primary: false },
  ],
  sport: [
    { faction_id: 'koerper', weight: 70, is_primary: true },
    { faction_id: 'hobby', weight: 20, is_primary: false },
    { faction_id: 'soziales', weight: 10, is_primary: false },
  ],
  meditation: [
    { faction_id: 'geist', weight: 80, is_primary: true },
    { faction_id: 'koerper', weight: 20, is_primary: false },
  ],
  seele: [
    { faction_id: 'geist', weight: 80, is_primary: true },
    { faction_id: 'koerper', weight: 20, is_primary: false },
  ],
  design: [
    { faction_id: 'hobby', weight: 60, is_primary: true },
    { faction_id: 'karriere', weight: 30, is_primary: false },
    { faction_id: 'geist', weight: 10, is_primary: false },
  ],
  musik: [
    { faction_id: 'hobby', weight: 70, is_primary: true },
    { faction_id: 'soziales', weight: 20, is_primary: false },
    { faction_id: 'geist', weight: 10, is_primary: false },
  ],
  gaming: [
    { faction_id: 'hobby', weight: 70, is_primary: true },
    { faction_id: 'soziales', weight: 30, is_primary: false },
  ],
};

function getSmartDefaults(domainName: string): FactionWeight[] | null {
  const name = domainName.toLowerCase();
  for (const [key, weights] of Object.entries(SMART_DEFAULTS)) {
    if (name.includes(key)) {
      return weights;
    }
  }
  return null;
}

export default function DomainFactionEditor({
  initialFactions = [],
  onChange,
  domainName = '',
}: DomainFactionEditorProps) {
  const [selectedFactions, setSelectedFactions] = useState<FactionWeight[]>(initialFactions);
  const [hasAppliedSmartDefaults, setHasAppliedSmartDefaults] = useState(false);

  useEffect(() => {
    if (domainName && selectedFactions.length === 0 && !hasAppliedSmartDefaults) {
      const defaults = getSmartDefaults(domainName);
      if (defaults) {
        setSelectedFactions(defaults);
        onChange(defaults);
        setHasAppliedSmartDefaults(true);
      }
    }
  }, [domainName, selectedFactions.length, hasAppliedSmartDefaults, onChange]);

  useEffect(() => {
    if (initialFactions.length > 0) {
      setSelectedFactions(initialFactions);
      setHasAppliedSmartDefaults(true);
    }
  }, [initialFactions]);

  const handleFactionToggle = useCallback((factionId: FactionId) => {
    setSelectedFactions((prev) => {
      const existing = prev.find((f) => f.faction_id === factionId);
      let newFactions: FactionWeight[];

      if (existing) {
        newFactions = prev.filter((f) => f.faction_id !== factionId);
        if (existing.is_primary && newFactions.length > 0) {
          newFactions[0].is_primary = true;
        }
      } else {
        const isPrimary = prev.length === 0;
        newFactions = [...prev, { faction_id: factionId, weight: 50, is_primary: isPrimary }];
      }

      const total = newFactions.reduce((sum, f) => sum + f.weight, 0);
      if (total > 0 && total !== 100) {
        newFactions = newFactions.map((f) => ({
          ...f,
          weight: Math.round((f.weight / total) * 100),
        }));
      }

      onChange(newFactions);
      return newFactions;
    });
  }, [onChange]);

  const handleWeightChange = useCallback((factionId: FactionId, newWeight: number) => {
    setSelectedFactions((prev) => {
      const newFactions = prev.map((f) =>
        f.faction_id === factionId ? { ...f, weight: newWeight } : f
      );
      onChange(newFactions);
      return newFactions;
    });
  }, [onChange]);

  const handlePrimaryChange = useCallback((factionId: FactionId) => {
    setSelectedFactions((prev) => {
      const newFactions = prev.map((f) => ({
        ...f,
        is_primary: f.faction_id === factionId,
      }));
      onChange(newFactions);
      return newFactions;
    });
  }, [onChange]);

  const totalWeight = selectedFactions.reduce((sum, f) => sum + f.weight, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium">Lebensbereiche</label>
        {selectedFactions.length > 0 && (
          <span className={`text-xs ${totalWeight === 100 ? 'text-green-400' : 'text-yellow-400'}`}>
            Gesamt: {totalWeight}%
          </span>
        )}
      </div>

      <div className="space-y-2">
        {FACTIONS.map((faction) => {
          const selected = selectedFactions.find((f) => f.faction_id === faction.id);
          const isSelected = !!selected;

          return (
            <div
              key={faction.id}
              className={`rounded-lg border transition-all ${
                isSelected
                  ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/5'
                  : 'border-[var(--orb-border)] bg-[var(--background)]'
              }`}
            >
              <div
                className="flex items-center justify-between p-3 cursor-pointer"
                onClick={() => handleFactionToggle(faction.id)}
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      isSelected
                        ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]'
                        : 'border-[var(--orb-border)]'
                    }`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </motion.div>
                  <span className="text-xl" style={{ filter: isSelected ? 'none' : 'grayscale(1)' }}>
                    {faction.icon}
                  </span>
                  <span className={isSelected ? 'text-white' : 'text-adaptive-muted'}>
                    {faction.name}
                  </span>
                </div>
                {isSelected && (
                  <span className="text-sm font-medium" style={{ color: FACTION_COLORS[faction.id] }}>
                    {selected.weight}%
                  </span>
                )}
              </div>

              {isSelected && (
                <div className="px-3 pb-3 space-y-2">
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={selected.weight}
                    onChange={(e) => handleWeightChange(faction.id, parseInt(e.target.value))}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, ${FACTION_COLORS[faction.id]} ${selected.weight}%, rgba(255,255,255,0.1) ${selected.weight}%)`,
                    }}
                  />
                  <div className="flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrimaryChange(faction.id);
                      }}
                      className={`px-2 py-1 rounded text-xs transition-colors ${
                        selected.is_primary
                          ? 'bg-[var(--accent-primary)] text-white'
                          : 'bg-white/10 text-adaptive-muted hover:bg-white/20'
                      }`}
                    >
                      {selected.is_primary ? 'Hauptbereich' : 'Als Hauptbereich setzen'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedFactions.length === 0 && (
        <p className="text-sm text-adaptive-muted text-center py-2">
          Waehle mindestens einen Lebensbereich aus
        </p>
      )}
    </div>
  );
}
