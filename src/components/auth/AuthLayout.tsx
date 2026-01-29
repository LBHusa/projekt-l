'use client';

import { motion } from 'framer-motion';
import {
  Swords,
  Heart,
  Brain,
  Wallet,
  Users,
  BookOpen,
  Palette
} from 'lucide-react';

const factionIcons = [
  { icon: Swords, color: 'text-blue-400', label: 'Karriere' },
  { icon: Heart, color: 'text-pink-400', label: 'Körper' },
  { icon: Brain, color: 'text-purple-400', label: 'Geist' },
  { icon: Wallet, color: 'text-green-400', label: 'Finanzen' },
  { icon: Users, color: 'text-cyan-400', label: 'Soziales' },
  { icon: BookOpen, color: 'text-amber-400', label: 'Wissen' },
  { icon: Palette, color: 'text-rose-400', label: 'Hobby' },
];

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
}

export function AuthLayout({ children, title }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[var(--background)]">
      {/* Marketing Panel - Left Side */}
      <div className="relative lg:w-1/2 flex items-center justify-center p-8 lg:p-12 overflow-hidden">
        {/* Animated Background Glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.4 }}
            transition={{ duration: 2, ease: 'easeOut' }}
            className="w-[400px] h-[400px] lg:w-[500px] lg:h-[500px] rounded-full bg-gradient-to-r from-purple-500/30 via-pink-500/20 to-cyan-500/30 blur-3xl"
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 text-center max-w-md"
        >
          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl lg:text-5xl font-bold mb-4 text-purple-600 dark:text-purple-400"
          >
            Projekt L
          </motion.h1>

          {/* Slogan */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-xl lg:text-2xl text-adaptive font-medium mb-6"
          >
            Spiele dein Leben & unlock yourself.
            <span className="block text-adaptive-muted text-base lg:text-lg mt-1">
              Hab endlich die Kontrolle und den Überblick.
            </span>
          </motion.p>

          {/* RPG Analogy - Compact */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-sm lg:text-base text-adaptive-muted leading-relaxed mb-8 space-y-3"
          >
            <p>
              In Spielen wie <span className="text-purple-400">Skyrim</span> oder{' '}
              <span className="text-pink-400">Dragon Quest</span> kämpfen wir{' '}
              <span className="text-adaptive font-medium">tausend Mal gegen denselben Boss</span>, bis wir gewinnen.
              Aufgeben? Keine Option.
            </p>
            <p>
              Im echten Leben? Geben wir manchmal nach dem ersten Versuch auf.
              Weil die Gedanken zu laut sind, die Angst zu groß oder wir die Lust verlieren.
            </p>
            <p className="mt-3 text-adaptive font-medium">
              Was passiert in deinem Leben, wenn du dich so behandelst wie einen Gaming-Charakter,
              für den du nur das Beste willst – weil du gewinnen willst?
            </p>
          </motion.div>

          {/* Faction Icons */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex justify-center gap-2 lg:gap-3"
          >
            {factionIcons.map((faction, i) => (
              <motion.div
                key={faction.label}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + i * 0.05 }}
                className="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
                title={faction.label}
              >
                <faction.icon className={`w-4 h-4 lg:w-5 lg:h-5 ${faction.color}`} />
              </motion.div>
            ))}
          </motion.div>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-adaptive font-medium mt-6 text-sm lg:text-base"
          >
            Hier bist <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">DU</span> der Charakter.
            <span className="block mt-1">Entdecke dich. Lebe dich. Level dich.</span>
          </motion.p>
        </motion.div>
      </div>

      {/* Form Panel - Right Side */}
      <div className="lg:w-1/2 flex items-center justify-center p-4 lg:p-8">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-md"
        >
          <div className="p-8 bg-[var(--background-secondary)] rounded-xl border border-[var(--orb-border)]">
            <h2 className="text-2xl font-bold text-adaptive mb-6 text-center">
              {title}
            </h2>
            {children}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
