'use client';

import { ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';
import type { SkillAncestor, SkillDomain } from '@/lib/database.types';

interface SkillBreadcrumbProps {
  domain: SkillDomain;
  ancestors?: SkillAncestor[];
  currentSkillName?: string;
  currentSkillIcon?: string;
  onAncestorClick?: (ancestor: SkillAncestor) => void;
}

export default function SkillBreadcrumb({
  domain,
  ancestors = [],
  currentSkillName,
  currentSkillIcon,
  onAncestorClick,
}: SkillBreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1 text-sm overflow-x-auto pb-2">
      {/* Home / Dashboard Link */}
      <Link
        href="/"
        className="flex items-center gap-1 px-2 py-1 rounded-md text-adaptive-muted hover:text-white hover:bg-white/10 transition-colors shrink-0"
      >
        <Home className="w-4 h-4" />
      </Link>

      <ChevronRight className="w-4 h-4 text-adaptive-dim shrink-0" />

      {/* Domain Link */}
      <Link
        href={`/domain/${domain.id}`}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-adaptive-muted hover:text-white hover:bg-white/10 transition-colors shrink-0"
      >
        <span>{domain.icon}</span>
        <span className="font-medium">{domain.name}</span>
      </Link>

      {/* Ancestors */}
      {ancestors.map((ancestor) => (
        <div key={ancestor.id} className="flex items-center gap-1 shrink-0">
          <ChevronRight className="w-4 h-4 text-adaptive-dim" />
          {onAncestorClick ? (
            <button
              onClick={() => onAncestorClick(ancestor)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-adaptive-muted hover:text-white hover:bg-white/10 transition-colors"
            >
              <span>{ancestor.icon}</span>
              <span>{ancestor.name}</span>
            </button>
          ) : (
            <Link
              href={`/skill/${ancestor.id}`}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-adaptive-muted hover:text-white hover:bg-white/10 transition-colors"
            >
              <span>{ancestor.icon}</span>
              <span>{ancestor.name}</span>
            </Link>
          )}
        </div>
      ))}

      {/* Current Skill (not clickable) */}
      {currentSkillName && (
        <div className="flex items-center gap-1 shrink-0">
          <ChevronRight className="w-4 h-4 text-adaptive-dim" />
          <span className="flex items-center gap-1.5 px-2 py-1 text-white font-medium">
            {currentSkillIcon && <span>{currentSkillIcon}</span>}
            <span>{currentSkillName}</span>
          </span>
        </div>
      )}
    </nav>
  );
}

// Compact version for smaller spaces
export function SkillBreadcrumbCompact({
  domain,
  ancestors = [],
  currentSkillName,
}: Omit<SkillBreadcrumbProps, 'currentSkillIcon' | 'onAncestorClick'>) {
  const allItems = [
    { id: 'domain', name: domain.name, icon: domain.icon, href: `/domain/${domain.id}` },
    ...ancestors.map(a => ({ id: a.id, name: a.name, icon: a.icon, href: `/skill/${a.id}` })),
  ];

  // If too many items, show first, ellipsis, and last 2
  const showEllipsis = allItems.length > 3;
  const visibleItems = showEllipsis
    ? [allItems[0], ...allItems.slice(-2)]
    : allItems;

  return (
    <nav className="flex items-center gap-1 text-xs text-adaptive-muted">
      {visibleItems.map((item, index) => (
        <div key={item.id} className="flex items-center gap-1">
          {index > 0 && (
            <>
              {showEllipsis && index === 1 && (
                <>
                  <ChevronRight className="w-3 h-3" />
                  <span className="px-1">...</span>
                </>
              )}
              <ChevronRight className="w-3 h-3" />
            </>
          )}
          <Link
            href={item.href}
            className="hover:text-white transition-colors"
          >
            {item.icon} {item.name}
          </Link>
        </div>
      ))}
      {currentSkillName && (
        <>
          <ChevronRight className="w-3 h-3" />
          <span className="text-white font-medium">{currentSkillName}</span>
        </>
      )}
    </nav>
  );
}
