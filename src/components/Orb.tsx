'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useMemo } from 'react';

interface OrbProps {
  id: string;
  name: string;
  icon: string;
  color?: string;
  level?: number;
  href?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onClick?: () => void;
  showParticles?: boolean;
  animated?: boolean;
}

// Responsive size classes - smaller on mobile, larger on desktop
const sizeClasses = {
  sm: 'w-16 h-16 sm:w-20 sm:h-20',
  md: 'w-24 h-24 sm:w-32 sm:h-32',
  lg: 'w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40',
  xl: 'w-36 h-36 sm:w-44 sm:h-44 md:w-52 md:h-52',
};

// Responsive text sizes for orb icons
const textSizeClasses = {
  sm: 'text-xl sm:text-2xl',
  md: 'text-2xl sm:text-4xl',
  lg: 'text-3xl sm:text-4xl md:text-5xl',
  xl: 'text-4xl sm:text-5xl md:text-6xl',
};

// Responsive label sizes
const labelSizeClasses = {
  sm: 'text-xs',
  md: 'text-xs sm:text-sm',
  lg: 'text-sm sm:text-base',
  xl: 'text-base sm:text-lg',
};

const particleCounts = {
  sm: 3,
  md: 5,
  lg: 7,
  xl: 9,
};

function getLevelTierColor(level: number): string {
  if (level >= 100) return 'var(--level-legend)';
  if (level >= 80) return 'var(--level-master)';
  if (level >= 60) return 'var(--level-expert)';
  if (level >= 40) return 'var(--level-journeyman)';
  if (level >= 20) return 'var(--level-apprentice)';
  return 'var(--level-novice)';
}

export default function Orb({
  id,
  name,
  icon,
  color = 'var(--orb-glow)',
  level,
  href,
  size = 'md',
  onClick,
  showParticles = false,
  animated = true,
}: OrbProps) {
  // Generate random particle positions
  const particles = useMemo(() => {
    const count = particleCounts[size];
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${20 + Math.random() * 60}%`,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 2,
    }));
  }, [size]);

  const levelColor = level !== undefined ? getLevelTierColor(level) : color;

  const orbContent = (
    <motion.div
      className={`
        ${sizeClasses[size]}
        rounded-full
        flex flex-col items-center justify-center
        cursor-pointer
        relative
        bg-gradient-to-br from-[#1a1a2e] to-[#16162a]
        border border-[var(--orb-border)]
        ${animated ? 'orb-animated' : ''}
      `}
      style={{
        boxShadow: `
          0 0 20px ${color}40,
          0 0 40px ${color}20,
          0 0 60px ${color}10,
          inset 0 0 30px ${color}10
        `,
      }}
      whileHover={{
        scale: 1.1,
        boxShadow: `
          0 0 30px ${color}60,
          0 0 60px ${color}40,
          0 0 90px ${color}20,
          inset 0 0 40px ${color}20
        `,
      }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      onClick={onClick}
    >
      {/* Floating Particles */}
      {showParticles && (
        <div className="orb-particles">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="orb-particle"
              style={{
                left: p.left,
                bottom: '50%',
                color: color,
              }}
              animate={{
                y: [0, -40, -60],
                x: [0, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 30],
                opacity: [0, 1, 0],
                scale: [0, 1, 0.5],
              }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                repeat: Infinity,
                ease: 'easeOut',
              }}
            />
          ))}
        </div>
      )}

      {/* Inner Glow Ring */}
      <div
        className="absolute inset-2 rounded-full opacity-20"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${color}40, transparent 60%)`,
        }}
      />

      {/* Icon */}
      <span className={`${textSizeClasses[size]} mb-1 relative z-10`}>{icon}</span>

      {/* Level Badge */}
      {level !== undefined && (
        <motion.div
          className="absolute -bottom-1 -right-1 bg-[#1e1e2e] rounded-full px-2 py-0.5 text-xs font-bold border border-[var(--orb-border)]"
          style={{
            color: levelColor,
            boxShadow: `0 0 10px ${levelColor}40`,
          }}
          whileHover={{ scale: 1.1 }}
        >
          Lv.{level}
        </motion.div>
      )}
    </motion.div>
  );

  const label = (
    <motion.span
      className={`mt-2 ${labelSizeClasses[size]} text-center text-[var(--foreground-muted)] font-medium`}
      initial={{ opacity: 0.7 }}
      whileHover={{ opacity: 1 }}
    >
      {name}
    </motion.span>
  );

  const wrapper = (
    <div className="flex flex-col items-center">
      {orbContent}
      {label}
    </div>
  );

  if (href) {
    return <Link href={href}>{wrapper}</Link>;
  }

  return wrapper;
}
