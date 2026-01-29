'use client';

import { Target, Calendar, TrendingUp, Trophy } from 'lucide-react';
import type { SavingsGoalProgress } from '@/lib/database.types';

interface SavingsGoalCardProps {
  goal: SavingsGoalProgress;
  onClick?: () => void;
}

export function SavingsGoalCard({ goal, onClick }: SavingsGoalCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const progressPercent = Math.min(100, goal.progress_percent || 0);
  const isAchieved = goal.is_achieved;

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden bg-white/5 hover:bg-white/10 rounded-xl p-4 transition-all ${onClick ? 'cursor-pointer' : ''}`}
      style={{ borderLeft: `4px solid ${goal.color}` }}
    >
      {isAchieved && (
        <div className="absolute top-2 right-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
        </div>
      )}

      <div className="flex items-start gap-3 mb-3 min-w-0">
        <span className="text-2xl shrink-0">{goal.icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">{goal.name}</h3>
          {goal.description && (
            <p className="text-xs text-adaptive-dim truncate">{goal.description}</p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {/* Progress */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-adaptive-muted">{formatCurrency(goal.current_amount)}</span>
            <span className="text-adaptive-dim">{formatCurrency(goal.target_amount)}</span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: goal.color,
              }}
            />
          </div>
          <p className="text-xs text-adaptive-dim mt-1 text-right">
            {progressPercent.toFixed(1)}% erreicht
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {goal.monthly_contribution > 0 && (
            <div className="flex items-center gap-1 text-adaptive-muted">
              <TrendingUp className="w-3 h-3" />
              <span>{formatCurrency(goal.monthly_contribution)}/Monat</span>
            </div>
          )}
          {goal.interest_rate > 0 && (
            <div className="flex items-center gap-1 text-green-400">
              <span>📈 {(goal.interest_rate * 100).toFixed(1)}% p.a.</span>
            </div>
          )}
          {goal.target_date && goal.days_remaining !== null && (
            <div className="flex items-center gap-1 text-adaptive-muted">
              <Calendar className="w-3 h-3" />
              <span>
                {goal.days_remaining > 0
                  ? `${goal.days_remaining} Tage`
                  : 'Uberfällig'}
              </span>
            </div>
          )}
          {goal.projected_amount > goal.current_amount && (
            <div className="flex items-center gap-1 text-emerald-400">
              <Target className="w-3 h-3" />
              <span>→ {formatCurrency(goal.projected_amount)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface SavingsGoalsListProps {
  goals: SavingsGoalProgress[];
  onGoalClick?: (goal: SavingsGoalProgress) => void;
}

export function SavingsGoalsList({ goals, onGoalClick }: SavingsGoalsListProps) {
  const activeGoals = goals.filter(g => !g.is_achieved);
  const achievedGoals = goals.filter(g => g.is_achieved);

  return (
    <div className="space-y-4">
      {activeGoals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {activeGoals.map(goal => (
            <SavingsGoalCard
              key={goal.id}
              goal={goal}
              onClick={onGoalClick ? () => onGoalClick(goal) : undefined}
            />
          ))}
        </div>
      )}

      {achievedGoals.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-yellow-400 mb-2 flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Erreichte Ziele ({achievedGoals.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 opacity-75">
            {achievedGoals.map(goal => (
              <SavingsGoalCard
                key={goal.id}
                goal={goal}
                onClick={onGoalClick ? () => onGoalClick(goal) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {goals.length === 0 && (
        <div className="text-center py-8 text-adaptive-dim">
          <Target className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>Noch keine Sparziele</p>
          <p className="text-sm mt-1">Erstelle dein erstes Ziel!</p>
        </div>
      )}
    </div>
  );
}
