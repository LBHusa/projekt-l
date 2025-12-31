'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronDown } from 'lucide-react';
import type { SkillWithHierarchy } from '@/lib/database.types';

interface SkillTreeViewProps {
  skills: SkillWithHierarchy[];
  onSkillClick?: (skill: SkillWithHierarchy) => void;
  onSkillRightClick?: (skill: SkillWithHierarchy, event: React.MouseEvent) => void;
  selectedSkillId?: string | null;
  domainColor?: string;
  userLevels?: Map<string, number>; // skill_id -> level
  expandedByDefault?: boolean;
  maxDepthExpanded?: number;
}

export default function SkillTreeView({
  skills,
  onSkillClick,
  onSkillRightClick,
  selectedSkillId,
  domainColor = '#6366f1',
  userLevels = new Map(),
  expandedByDefault = true,
  maxDepthExpanded = 2,
}: SkillTreeViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {skills.map(skill => (
        <div
          key={skill.id}
          className="bg-[var(--background)]/50 rounded-lg p-3 border border-[var(--orb-border)] min-w-0"
        >
          <SkillTreeNode
            skill={skill}
            onSkillClick={onSkillClick}
            onSkillRightClick={onSkillRightClick}
            selectedSkillId={selectedSkillId}
            domainColor={domainColor}
            userLevels={userLevels}
            expandedByDefault={expandedByDefault}
            depth={1}
            maxDepthExpanded={maxDepthExpanded}
          />
        </div>
      ))}
    </div>
  );
}

interface SkillTreeNodeProps {
  skill: SkillWithHierarchy;
  onSkillClick?: (skill: SkillWithHierarchy) => void;
  onSkillRightClick?: (skill: SkillWithHierarchy, event: React.MouseEvent) => void;
  selectedSkillId?: string | null;
  domainColor: string;
  userLevels: Map<string, number>;
  expandedByDefault: boolean;
  depth: number;
  maxDepthExpanded: number;
}

function SkillTreeNode({
  skill,
  onSkillClick,
  onSkillRightClick,
  selectedSkillId,
  domainColor,
  userLevels,
  expandedByDefault,
  depth,
  maxDepthExpanded,
}: SkillTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(
    expandedByDefault && depth <= maxDepthExpanded
  );

  const hasChildren = skill.children && skill.children.length > 0;
  const userLevel = userLevels.get(skill.id);
  const isSelected = selectedSkillId === skill.id;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSkillClick) {
      onSkillClick(skill);
    }
  };

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onSkillRightClick) {
      onSkillRightClick(skill, e);
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  // Calculate indentation based on depth
  const paddingLeft = (depth - 1) * 20;

  // Get level color
  const getLevelColor = (level: number) => {
    if (level >= 90) return '#f59e0b'; // Legendary - Gold
    if (level >= 70) return '#8b5cf6'; // Master - Purple
    if (level >= 50) return '#3b82f6'; // Expert - Blue
    if (level >= 30) return '#22c55e'; // Advanced - Green
    return '#64748b'; // Beginner - Gray
  };

  return (
    <div className="select-none">
      {/* Skill Node */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className={`
          group flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer
          transition-all duration-200
          ${isSelected
            ? 'bg-white/15 ring-1 ring-white/30'
            : 'hover:bg-white/10'
          }
        `}
        style={{ paddingLeft: `${paddingLeft + 8}px` }}
        onClick={handleClick}
        onContextMenu={handleRightClick}
      >
        {/* Expand/Collapse Toggle */}
        <button
          onClick={handleToggle}
          className={`
            w-5 h-5 flex items-center justify-center rounded
            transition-colors duration-200
            ${hasChildren
              ? 'hover:bg-white/20 text-white/60 hover:text-white'
              : 'text-transparent'
            }
          `}
        >
          {hasChildren && (
            isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )
          )}
        </button>

        {/* Skill Icon */}
        <span className="text-lg">{skill.icon}</span>

        {/* Skill Name */}
        <span className="flex-1 text-sm font-medium text-white/90 truncate">
          {skill.name}
        </span>

        {/* Level Badge */}
        {userLevel !== undefined && (
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: `${getLevelColor(userLevel)}20`,
              color: getLevelColor(userLevel),
            }}
          >
            Lv.{userLevel}
          </span>
        )}

        {/* Children Count */}
        {hasChildren && (
          <span className="text-xs text-white/40 opacity-0 group-hover:opacity-100 transition-opacity">
            {skill.children!.length}
          </span>
        )}
      </motion.div>

      {/* Children */}
      <AnimatePresence>
        {isExpanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* Vertical line connecting children */}
            <div
              className="relative"
              style={{ marginLeft: `${paddingLeft + 18}px` }}
            >
              <div
                className="absolute left-0 top-0 bottom-0 w-px bg-white/10"
                style={{ marginLeft: '2px' }}
              />
              <div className="pl-4">
                {skill.children!.map(child => (
                  <SkillTreeNode
                    key={child.id}
                    skill={child}
                    onSkillClick={onSkillClick}
                    onSkillRightClick={onSkillRightClick}
                    selectedSkillId={selectedSkillId}
                    domainColor={domainColor}
                    userLevels={userLevels}
                    expandedByDefault={expandedByDefault}
                    depth={depth + 1}
                    maxDepthExpanded={maxDepthExpanded}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
