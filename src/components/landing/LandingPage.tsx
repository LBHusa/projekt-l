'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Sparkles,
  Target,
  Brain,
  Gamepad2,
  ChevronRight,
  Swords,
  Heart,
  TrendingUp,
  Users,
  BookOpen,
  Wallet,
  Palette
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' as const }
  }
};

const features = [
  {
    icon: Target,
    title: 'Ganzheitlicher Ansatz',
    description: '7 Lebensbereiche - Karriere, Gesundheit, Finanzen, Beziehungen, Wissen, Hobbys und Geist. Alles auf einen Blick.',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    border: 'border-blue-500/30',
    iconBg: 'bg-blue-500/30',
    iconColor: 'text-blue-400'
  },
  {
    icon: TrendingUp,
    title: 'Dein Ist-Zustand',
    description: 'Wisse immer, wo du stehst. Tracke deinen Fortschritt wie in einem Spiel - mit Leveln, XP und sichtbarem Wachstum.',
    gradient: 'from-green-500/20 to-emerald-500/20',
    border: 'border-green-500/30',
    iconBg: 'bg-green-500/30',
    iconColor: 'text-green-400'
  },
  {
    icon: Gamepad2,
    title: 'Deine Missionen',
    description: 'Wie in GTA bekommst du klare Quests. Keine vagen Ziele mehr - konkrete Aufgaben, die dich voranbringen.',
    gradient: 'from-purple-500/20 to-pink-500/20',
    border: 'border-purple-500/30',
    iconBg: 'bg-purple-500/30',
    iconColor: 'text-purple-400'
  },
  {
    icon: Brain,
    title: 'KI-gestütztes Onboarding',
    description: 'Ein ausführlicher Fragebogen zu Beginn hilft der KI, dich zu verstehen. Je mehr du teilst, desto besser die Quests. Alles kann auch später ergänzt werden.',
    gradient: 'from-amber-500/20 to-orange-500/20',
    border: 'border-amber-500/30',
    iconBg: 'bg-amber-500/30',
    iconColor: 'text-amber-400'
  }
];

const factionIcons = [
  { icon: Swords, color: 'text-blue-400', label: 'Karriere' },
  { icon: Heart, color: 'text-pink-400', label: 'Körper' },
  { icon: Brain, color: 'text-purple-400', label: 'Geist' },
  { icon: Wallet, color: 'text-green-400', label: 'Finanzen' },
  { icon: Users, color: 'text-cyan-400', label: 'Soziales' },
  { icon: BookOpen, color: 'text-amber-400', label: 'Wissen' },
  { icon: Palette, color: 'text-rose-400', label: 'Hobby' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 py-20">
        {/* Animated Background Orb */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.3 }}
            transition={{ duration: 2, ease: 'easeOut' }}
            className="w-[600px] h-[600px] rounded-full bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-cyan-500/20 blur-3xl"
          />
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 text-center max-w-4xl mx-auto"
        >
          {/* Badge */}
          <motion.div variants={itemVariants} className="mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              Life Gamification
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={itemVariants}
            className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent"
          >
            Projekt L
          </motion.h1>

          {/* Slogan */}
          <motion.p
            variants={itemVariants}
            className="text-2xl md:text-3xl text-adaptive font-medium mb-8"
          >
            Spiele dich in dein Leben
            <span className="block text-adaptive-muted mt-2">
              Hab endlich die Kontrolle.
            </span>
          </motion.p>

          {/* Faction Icons */}
          <motion.div
            variants={itemVariants}
            className="flex justify-center gap-3 mb-12"
          >
            {factionIcons.map((faction, i) => (
              <motion.div
                key={faction.label}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 + i * 0.1 }}
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center"
                title={faction.label}
              >
                <faction.icon className={`w-5 h-5 ${faction.color}`} />
              </motion.div>
            ))}
          </motion.div>

          {/* CTA Buttons */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl font-bold text-lg text-white shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2"
              >
                Jetzt starten
                <ChevronRight className="w-5 h-5" />
              </motion.button>
            </Link>
            <Link href="/auth/login">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/20 rounded-xl font-medium text-lg text-adaptive"
              >
                Einloggen
              </motion.button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-6 h-10 rounded-full border-2 border-white/20 flex justify-center pt-2"
          >
            <div className="w-1.5 h-3 rounded-full bg-white/40" />
          </motion.div>
        </motion.div>
      </section>

      {/* RPG Analogy Section */}
      <section className="relative py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative p-8 md:p-12 rounded-2xl bg-gradient-to-br from-purple-500/10 via-transparent to-pink-500/10 border border-purple-500/20"
          >
            {/* Quote marks */}
            <div className="absolute top-4 left-6 text-6xl text-purple-500/20 font-serif">&ldquo;</div>

            <div className="space-y-6 text-lg md:text-xl text-adaptive-muted leading-relaxed">
              <p>
                In Spielen wie <span className="text-purple-400 font-medium">Skyrim</span>, <span className="text-pink-400 font-medium">Dragon Quest</span> oder <span className="text-cyan-400 font-medium">The Witcher</span> investieren wir Stunden, um unseren Charakter zu perfektionieren. Wir kämpfen <span className="text-adaptive font-semibold">28 Mal gegen denselben Boss</span>, bis wir endlich gewinnen. Aufgeben? Keine Option.
              </p>

              <p>
                Im echten Leben? Sind wir oft unser <span className="text-adaptive font-semibold">eigener größter Kritiker</span>. Wir geben nach dem ersten Scheitern auf. Wir verlieren den Überblick. Wir vergessen, was wir eigentlich erreichen wollten.
              </p>

              <p className="text-adaptive font-medium text-xl md:text-2xl">
                Was wäre, wenn du dein Leben wie ein Spiel behandeln könntest?
                <span className="block mt-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Du bist der Charakter. Level ihn.
                </span>
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-adaptive mb-4">
              Wie funktioniert es?
            </h2>
            <p className="text-adaptive-muted text-lg max-w-2xl mx-auto">
              Projekt L verbindet bewährte Gamification-Prinzipien mit modernem Self-Tracking und KI-Unterstützung.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`p-6 rounded-xl bg-gradient-to-r ${feature.gradient} border ${feature.border} hover:scale-[1.02] transition-transform`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl ${feature.iconBg} flex items-center justify-center flex-shrink-0`}>
                    <feature.icon className={`w-6 h-6 ${feature.iconColor}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-adaptive mb-2">{feature.title}</h3>
                    <p className="text-adaptive-muted leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center"
        >
          <div className="p-8 md:p-12 rounded-2xl bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-cyan-500/20 border border-purple-500/30">
            <h2 className="text-3xl md:text-4xl font-bold text-adaptive mb-4">
              Bereit für dein Abenteuer?
            </h2>
            <p className="text-adaptive-muted text-lg mb-8 max-w-xl mx-auto">
              Erstelle deinen Charakter in wenigen Minuten.
              Je mehr du beim Onboarding teilst, desto besser kann die KI dich unterstützen.
            </p>
            <Link href="/auth/signup">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-10 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl font-bold text-lg text-white shadow-lg shadow-purple-500/25 inline-flex items-center gap-2"
              >
                Charakter erstellen
                <ChevronRight className="w-5 h-5" />
              </motion.button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-white/10">
        <div className="max-w-6xl mx-auto text-center text-adaptive-dim text-sm">
          <p>Projekt L - Ein persönliches Projekt zur Selbstoptimierung durch Gamification</p>
        </div>
      </footer>
    </div>
  );
}
