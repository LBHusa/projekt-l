'use client';

import { Check } from 'lucide-react';
import { COLOR_PALETTE } from '@/lib/ui/constants';
import type { ColorPickerProps } from '@/lib/ui/types';

const sizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
  xl: 'w-12 h-12',
} as const;

const checkSizes = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
  xl: 'w-6 h-6',
} as const;

export default function ColorPicker({
  value,
  onChange,
  colors = COLOR_PALETTE,
  size = 'md',
}: ColorPickerProps) {
  const buttonSize = sizeClasses[size];
  const checkSize = checkSizes[size];

  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className={`
            ${buttonSize} rounded-full flex items-center justify-center
            transition-all duration-200
            ${value === color
              ? 'ring-2 ring-white/60 ring-offset-2 ring-offset-black/50 scale-110'
              : 'hover:scale-110 hover:ring-2 hover:ring-white/30'
            }
          `}
          style={{ backgroundColor: color }}
        >
          {value === color && (
            <Check className={`${checkSize} text-white drop-shadow-md`} />
          )}
        </button>
      ))}
    </div>
  );
}
