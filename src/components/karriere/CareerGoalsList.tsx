'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Calendar, Plus, Edit2, Trash2, Trophy, AlertCircle } from 'lucide-react';
import type { CareerGoal, CareerGoalStatus } from '@/lib/database.types';

interface CareerGoalsListProps {
  goals: CareerGoal[];
  onAddGoal?: () => void;
  onEditGoal?: (goal: CareerGoal) => void;
  onDeleteGoal?: (goalId: string) => void;
}

export default function CareerGoalsList({
  goals,
  onAddGoal,
  onEditGoal,
  onDeleteGoal,
}: CareerGoalsListProps) {
  const [statusFilter, setStatusFilter] = useState<CareerGoalStatus | 'all'>('active');
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);

  const filteredGoals = goals.filter(goal =>
    statusFilter === 'all' ? true : goal.status === statusFilter
  );

  const getStatusColor = (status: CareerGoalStatus) => {
    switch (status) {
      case 'active':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'achieved':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'abandoned':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default:
        return 'bg-white/10 text-adaptive-muted border-white/20';
    }
  };

  const getStatusLabel = (status: CareerGoalStatus) => {
    switch (status) {
      case 'active':
        return 'Aktiv';
      case 'achieved':
        return 'Erreicht';
      case 'abandoned':
        return 'Aufgegeben';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: CareerGoalStatus) => {
    switch (status) {
      case 'achieved':
        return <Trophy className="w-4 h-4" />;
      case 'abandoned':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Target className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Target className="w-5 h-5 text-amber-400" />
          Karriere-Ziele
        </h2>
        {onAddGoal && (
          <button
            onClick={onAddGoal}
            className="flex items-center gap-2 px-3 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Ziel hinzufügen
          </button>
        )}
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {[
          { value: 'active' as const, label: 'Aktiv' },
          { value: 'achieved' as const, label: 'Erreicht' },
          { value: 'abandoned' as const, label: 'Aufgegeben' },
          { value: 'all' as const, label: 'Alle' },
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
              statusFilter === tab.value
                ? 'bg-amber-600 text-white'
                : 'bg-white/10 text-adaptive-muted hover:bg-white/20'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Goals Grid */}
      {filteredGoals.length === 0 ? (
        <div className="text-center py-12 text-adaptive-dim">
          <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Noch keine Ziele erstellt</p>
          {statusFilter !== 'all' && (
            <p className="text-sm mt-1">Filter: {getStatusLabel(statusFilter)}</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredGoals.map(goal => {
            const isExpanded = expandedGoal === goal.id;
            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white/5 border border-white/10 rounded-lg p-4 cursor-pointer hover:bg-white/10 transition-all ${
                  isExpanded ? 'ring-2 ring-amber-500/50' : ''
                }`}
                onClick={() => setExpandedGoal(isExpanded ? null : goal.id)}
              >
                {/* Title & Status */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-medium text-white mb-1 flex items-center gap-2">
                      {getStatusIcon(goal.status)}
                      {goal.title}
                    </h3>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs border flex items-center gap-1 ${getStatusColor(goal.status)}`}>
                    {getStatusLabel(goal.status)}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-sm text-adaptive-muted mb-1">
                    <span>Fortschritt</span>
                    <span className="font-medium text-amber-400">{goal.progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${goal.progress}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className={`h-full ${
                        goal.status === 'achieved'
                          ? 'bg-green-500'
                          : goal.status === 'abandoned'
                          ? 'bg-gray-500'
                          : 'bg-amber-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Target Date */}
                {goal.target_date && (
                  <div className="flex items-center gap-2 text-sm text-adaptive-muted mb-3">
                    <Calendar className="w-4 h-4" />
                    <span>Ziel: {new Date(goal.target_date).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}</span>
                  </div>
                )}

                {/* Expanded Content */}
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pt-3 border-t border-white/10"
                  >
                    {goal.description && (
                      <p className="text-sm text-adaptive mb-3">{goal.description}</p>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {onEditGoal && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditGoal(goal);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors text-sm"
                        >
                          <Edit2 className="w-4 h-4" />
                          Bearbeiten
                        </button>
                      )}
                      {onDeleteGoal && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Ziel wirklich löschen?')) {
                              onDeleteGoal(goal.id);
                            }
                          }}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg transition-colors text-sm text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                          Löschen
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Click hint */}
                {!isExpanded && (goal.description || onEditGoal || onDeleteGoal) && (
                  <p className="text-xs text-adaptive-dim text-center mt-2">
                    Klicken für Details
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
