'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Swords,
  Heart,
  Brain,
  Wallet,
  Users,
  BookOpen,
  Palette,
  Target,
  Zap,
  Clock,
  RefreshCw
} from 'lucide-react';

interface IntroSlidesProps {
  onComplete: () => void;
}

const factionIcons = [
  { icon: Swords, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Karriere' },
  { icon: Heart, color: 'text-pink-400', bg: 'bg-pink-500/20', label: 'Körper' },
  { icon: Brain, color: 'text-purple-400', bg: 'bg-purple-500/20', label: 'Geist' },
  { icon: Wallet, color: 'text-green-400', bg: 'bg-green-500/20', label: 'Finanzen' },
  { icon: Users, color: 'text-cyan-400', bg: 'bg-cyan-500/20', label: 'Soziales' },
  { icon: BookOpen, color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'Wissen' },
  { icon: Palette, color: 'text-rose-400', bg: 'bg-rose-500/20', label: 'Hobby' },
];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0
  }),
  center: {
    x: 0,
    opacity: 1
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0
  })
};

export default function IntroSlides({ onComplete }: IntroSlidesProps) {
  const [[currentSlide, direction], setSlide] = useState([0, 0]);

  const paginate = (newDirection: number) => {
    const newSlide = currentSlide + newDirection;
    if (newSlide >= 0 && newSlide <= 2) {
      setSlide([newSlide, newDirection]);
    }
  };

  const goToSlide = (index: number) => {
    setSlide([index, index > currentSlide ? 1 : -1]);
  };

  const slides = [
    // Slide 1: Welcome
    {
      title: 'Willkommen bei Projekt L',
      content: (
        <div className="space-y-6">
          <p className="text-adaptive-muted text-lg leading-relaxed">
            Gleich erstellst du <span className="text-adaptive font-medium">deinen eigenen Charakter</span> -
            basierend auf deinem echten Leben.
          </p>

          <div className="grid gap-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="font-medium text-adaptive">Fragen zu deinem Leben</p>
                <p className="text-sm text-adaptive-muted">Wir fragen dich zu 7 Lebensbereichen - was dir wichtig ist und wo du stehst.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="font-medium text-adaptive">KI analysiert deine Antworten</p>
                <p className="text-sm text-adaptive-muted">Basierend auf deinen Angaben erstellt die KI dein Profil, Skills und erste Quests.</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    // Slide 2: Philosophy - 7 Factions
    {
      title: 'Dein Leben als RPG',
      content: (
        <div className="space-y-6">
          <p className="text-adaptive-muted text-lg leading-relaxed">
            In Projekt L gibt es <span className="text-adaptive font-medium">7 Gilden</span> - jede repräsentiert einen Lebensbereich.
            Durch Aktivitäten sammelst du XP und levelst in allen Bereichen.
          </p>

          {/* Faction Circle */}
          <div className="relative py-6">
            <div className="flex flex-wrap justify-center gap-3">
              {factionIcons.map((faction, i) => (
                <motion.div
                  key={faction.label}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 + i * 0.08 }}
                  className="flex flex-col items-center gap-2"
                >
                  <div className={`w-14 h-14 rounded-xl ${faction.bg} border border-white/10 flex items-center justify-center`}>
                    <faction.icon className={`w-7 h-7 ${faction.color}`} />
                  </div>
                  <span className="text-xs text-adaptive-muted">{faction.label}</span>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
            <p className="text-center text-adaptive font-medium">
              Level up durch Konsequenz, nicht Perfektion.
              <span className="block text-adaptive-muted text-sm mt-1">
                Jeder kleine Schritt zählt - wie im Spiel.
              </span>
            </p>
          </div>
        </div>
      )
    },
    // Slide 3: What to expect
    {
      title: 'Was dich erwartet',
      content: (
        <div className="space-y-6">
          <p className="text-adaptive-muted text-lg leading-relaxed">
            Das Onboarding dauert ca. <span className="text-adaptive font-medium">5-10 Minuten</span>.
            Je ausführlicher du antwortest, desto bessere Quests bekommst du!
          </p>

          <div className="grid gap-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
              <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center text-sm font-bold text-purple-400">1</div>
              <span className="text-adaptive">Lebensbereiche bewerten</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
              <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center text-sm font-bold text-purple-400">2</div>
              <span className="text-adaptive">Fragen zu dir beantworten</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
              <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center text-sm font-bold text-purple-400">3</div>
              <span className="text-adaptive">KI-generierte Skills & Habits prüfen</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
              <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center text-sm font-bold text-purple-400">4</div>
              <span className="text-adaptive">Profil & Avatar erstellen</span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <RefreshCw className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-adaptive-muted">
              <span className="text-amber-400 font-medium">Keine Sorge:</span> Alles kann später jederzeit angepasst werden.
              Das Onboarding ist nur der Startpunkt.
            </p>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--background)]">
      {/* Background Glow */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[500px] h-[500px] rounded-full bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        {/* Card */}
        <div className="bg-[var(--background-secondary)]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl">
          {/* Progress Dots */}
          <div className="flex justify-center gap-2 mb-8">
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                onClick={() => goToSlide(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  i === currentSlide
                    ? 'bg-purple-500 w-8'
                    : 'bg-white/20 hover:bg-white/40'
                }`}
              />
            ))}
          </div>

          {/* Slide Content */}
          <div className="relative overflow-hidden" style={{ minHeight: '380px' }}>
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={currentSlide}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'tween', duration: 0.3 }}
                className="w-full"
              >
                <h2 className="text-2xl md:text-3xl font-bold text-adaptive mb-6 text-center">
                  {slides[currentSlide].title}
                </h2>
                {slides[currentSlide].content}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
            <button
              onClick={() => paginate(-1)}
              disabled={currentSlide === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                currentSlide === 0
                  ? 'text-adaptive-dim cursor-not-allowed'
                  : 'text-adaptive-muted hover:text-adaptive hover:bg-white/5'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
              Zurück
            </button>

            {currentSlide < 2 ? (
              <button
                onClick={() => paginate(1)}
                className="flex items-center gap-2 px-6 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg font-medium transition-colors"
              >
                Weiter
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <motion.button
                onClick={onComplete}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-bold shadow-lg shadow-purple-500/25 transition-colors"
              >
                Charakter erstellen
                <Sparkles className="w-5 h-5" />
              </motion.button>
            )}
          </div>
        </div>

        {/* Skip Link */}
        <div className="text-center mt-4">
          <button
            onClick={onComplete}
            className="text-sm text-adaptive-dim hover:text-adaptive-muted transition-colors"
          >
            Überspringen
          </button>
        </div>
      </div>
    </div>
  );
}
