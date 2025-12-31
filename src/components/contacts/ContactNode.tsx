'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { motion } from 'framer-motion';
import type { ContactWithStats } from '@/lib/types/contacts';
import { RELATIONSHIP_TYPE_META, getDisplayName } from '@/lib/types/contacts';

export interface ContactNodeData extends ContactWithStats {
  label?: string;
  [key: string]: unknown; // Required for React Flow compatibility
}

function ContactNode({ data }: { data: ContactNodeData }) {
  const typeMeta = RELATIONSHIP_TYPE_META[data.relationship_type];
  const displayName = getDisplayName(data);

  // Farbe basierend auf Kategorie
  const categoryColors = {
    family: '#ec4899', // pink
    friend: '#06b6d4', // cyan
    professional: '#3b82f6', // blue
    other: '#6b7280', // gray
  };
  const color = categoryColors[data.relationship_category];

  // Node-Größe basierend auf Level (min 60, max 100)
  const size = Math.min(100, Math.max(60, 50 + data.relationship_level * 5));

  return (
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

      {/* Avatar/Orb */}
      <div
        className="rounded-full flex items-center justify-center relative border-2"
        style={{
          width: size,
          height: size,
          backgroundColor: data.photo_url ? 'transparent' : `${color}20`,
          backgroundImage: data.photo_url ? `url(${data.photo_url})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderColor: color,
          boxShadow: `
            0 0 15px ${color}40,
            0 0 30px ${color}20,
            inset 0 0 20px ${color}10
          `,
        }}
      >
        {!data.photo_url && (
          <span className="text-2xl">{typeMeta.icon}</span>
        )}

        {/* Level Badge */}
        <div
          className="absolute -bottom-1 -right-1 bg-[#1e1e2e] rounded-full px-1.5 py-0.5 text-xs font-bold border"
          style={{
            color,
            borderColor: `${color}60`,
          }}
        >
          Lv.{data.relationship_level}
        </div>

        {/* Favorite Badge */}
        {data.is_favorite && (
          <div className="absolute -top-1 -right-1 text-red-500">
            <span className="text-sm">❤️</span>
          </div>
        )}
      </div>

      {/* Name Label */}
      <span className="mt-2 text-sm text-white/80 font-medium text-center max-w-[100px] truncate">
        {displayName}
      </span>

      {/* Relationship Type */}
      <span className="text-xs text-white/40">
        {typeMeta.labelDe}
      </span>
    </motion.div>
  );
}

export default memo(ContactNode);
