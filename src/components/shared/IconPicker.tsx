'use client';

import { COMMON_ICONS } from '@/lib/ui/constants';
import type { IconPickerProps } from '@/lib/ui/types';

const columnClasses = {
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
  8: 'grid-cols-8',
} as const;

export default function IconPicker({
  value,
  onChange,
  icons = COMMON_ICONS,
  columns = 5,
}: IconPickerProps) {
  const gridCols = columnClasses[columns as keyof typeof columnClasses] || 'grid-cols-5';

  return (
    <div className={`grid ${gridCols} gap-2`}>
      {icons.map((icon) => (
        <button
          key={icon}
          type="button"
          onClick={() => onChange(icon)}
          className={`
            w-10 h-10 rounded-lg flex items-center justify-center text-xl
            transition-all duration-200
            ${value === icon
              ? 'bg-white/20 ring-2 ring-white/40 scale-110'
              : 'bg-white/5 hover:bg-white/10 hover:scale-105'
            }
          `}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}
