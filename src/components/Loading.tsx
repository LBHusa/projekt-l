'use client';

import { motion } from 'framer-motion';

interface LoadingProps {
  variant?: 'orb' | 'skeleton' | 'spinner';
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

const sizeClasses = {
  sm: 'w-20 h-20',
  md: 'w-32 h-32',
  lg: 'w-40 h-40',
};

export default function Loading({ variant = 'orb', size = 'md', text }: LoadingProps) {
  if (variant === 'spinner') {
    return (
      <div className="flex flex-col items-center justify-center gap-4">
        <motion.div
          className={`${sizeClasses[size]} rounded-full border-4 border-[var(--orb-border)] border-t-[var(--accent-primary)]`}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
        {text && <span className="text-[var(--foreground-muted)]">{text}</span>}
      </div>
    );
  }

  if (variant === 'skeleton') {
    return (
      <div className="space-y-4">
        <div className={`skeleton rounded-full ${sizeClasses[size]}`} />
        <div className="skeleton h-4 w-24 rounded" />
      </div>
    );
  }

  // Animated Orb Loading
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <motion.div
        className={`
          ${sizeClasses[size]}
          rounded-full
          bg-gradient-to-br from-[#1a1a2e] to-[#16162a]
          border border-[var(--orb-border)]
          flex items-center justify-center
        `}
        animate={{
          boxShadow: [
            '0 0 20px var(--orb-glow), inset 0 0 20px rgba(99, 102, 241, 0.1)',
            '0 0 40px var(--orb-glow), inset 0 0 30px rgba(99, 102, 241, 0.2)',
            '0 0 20px var(--orb-glow), inset 0 0 20px rgba(99, 102, 241, 0.1)',
          ],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <motion.div
          className="text-4xl"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          ⏳
        </motion.div>
      </motion.div>
      {text && (
        <motion.span
          className="text-[var(--foreground-muted)]"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          {text}
        </motion.span>
      )}
    </div>
  );
}

// Skeleton variants for different components
export function OrbSkeleton({ count = 1 }: { count?: number }) {
  return (
    <div className="flex flex-wrap gap-8 justify-center">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-2">
          <div className="skeleton w-32 h-32 rounded-full" />
          <div className="skeleton h-4 w-20 rounded" />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="card p-6 space-y-4">
      <div className="skeleton h-6 w-1/3 rounded" />
      <div className="skeleton h-4 w-full rounded" />
      <div className="skeleton h-4 w-2/3 rounded" />
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card p-4 text-center">
          <div className="skeleton h-8 w-16 mx-auto rounded mb-2" />
          <div className="skeleton h-4 w-20 mx-auto rounded" />
        </div>
      ))}
    </div>
  );
}
