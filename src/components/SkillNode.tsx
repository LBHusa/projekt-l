'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export interface SkillNodeData {
  id: string;
  name: string;
  icon: string;
  color: string;
  level?: number;
  description?: string;
  label?: string;
}

function SkillNode({ data }: { data: SkillNodeData }) {
  const { id, name, icon, color, level } = data;

  return (
    <Link href={`/skill/${id}`}>
      <motion.div
        className="flex flex-col items-center cursor-pointer"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Connection Handles */}
        <Handle
          type="target"
          position={Position.Top}
          className="!bg-transparent !border-0 !w-2 !h-2"
        />
        <Handle
          type="source"
          position={Position.Bottom}
          className="!bg-transparent !border-0 !w-2 !h-2"
        />
        <Handle
          type="target"
          position={Position.Left}
          id="left"
          className="!bg-transparent !border-0 !w-2 !h-2"
        />
        <Handle
          type="source"
          position={Position.Right}
          id="right"
          className="!bg-transparent !border-0 !w-2 !h-2"
        />

        {/* Orb */}
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center relative bg-gradient-to-br from-[#1a1a2e] to-[#16162a] border border-[var(--orb-border)]"
          style={{
            boxShadow: `
              0 0 20px ${color}40,
              0 0 40px ${color}20,
              0 0 60px ${color}10,
              inset 0 0 30px ${color}10
            `,
          }}
        >
          <span className="text-3xl">{icon}</span>

          {/* Level Badge */}
          {level !== undefined && (
            <div
              className="absolute -bottom-1 -right-1 bg-[#1e1e2e] rounded-full px-2 py-0.5 text-xs font-bold border border-[var(--orb-border)]"
              style={{ color }}
            >
              Lv.{level}
            </div>
          )}
        </div>

        {/* Name Label */}
        <span className="mt-2 text-sm text-[var(--foreground-muted)] font-medium text-center max-w-[100px] truncate">
          {name}
        </span>
      </motion.div>
    </Link>
  );
}

export default memo(SkillNode);
