'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Sword, ChevronDown } from 'lucide-react';
import type { Skill, SkillDomain, FactionId } from '@/lib/database.types';
import { FACTIONS } from '@/lib/ui/constants';

export default function NewQuestPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [domains, setDomains] = useState<SkillDomain[]>([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    xp_reward: 100,
    skill_id: '',
    faction_id: '' as FactionId | '',
    due_date: '',
  });

  // Load skills and domains
  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch skill domains
        const domainsRes = await fetch('/api/skill-domains');
        const domainsData = await domainsRes.json();
        if (domainsData.domains) {
          setDomains(domainsData.domains);
        }

        // Fetch all skills
        const skillsRes = await fetch('/api/skills');
        const skillsData = await skillsRes.json();
        if (skillsData.skills) {
          setSkills(skillsData.skills);
        }
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.title.trim()) {
      setError('Titel ist erforderlich');
      return;
    }

    if (!formData.skill_id) {
      setError('Skill ist erforderlich');
      return;
    }

    // Check for XSS characters
    if (/<|>/.test(formData.title)) {
      setError('Cannot contain < or > characters');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/quests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || undefined,
          xp_reward: formData.xp_reward,
          skill_id: formData.skill_id,
          faction_id: formData.faction_id || undefined,
          due_date: formData.due_date || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.details) {
          const errorMessages = Object.values(data.details).flat().join(', ');
          setError(errorMessages || data.error);
        } else {
          setError(data.error || 'Fehler beim Erstellen');
        }
        return;
      }

      router.push('/quests');
    } catch (err) {
      console.error('Error creating quest:', err);
      setError('Netzwerkfehler');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group skills by domain
  const skillsByDomain = domains.map(domain => ({
    domain,
    skills: skills.filter(skill => skill.domain_id === domain.id),
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-adaptive-muted">Lade Daten...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Header */}
      <header className="border-b border-[var(--orb-border)] bg-[var(--background-secondary)]/50 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/quests"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-adaptive-muted" />
            </Link>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Sword className="w-6 h-6 text-purple-400" />
                Neue Quest
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Message */}
          {error && (
            <div className="error-message p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400" role="alert">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-2">
              Titel *
            </label>
            <input
              id="title"
              name="title"
              type="text"
              value={formData.title}
              onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="z.B. JavaScript Grundlagen lernen"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
              required
              maxLength={200}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2">
              Beschreibung
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional: Beschreibe deine Quest genauer"
              rows={4}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] resize-none"
              maxLength={2000}
            />
          </div>

          {/* Skill Selection */}
          <div>
            <label htmlFor="skill_id" className="block text-sm font-medium mb-2">
              Skill *
            </label>
            <div className="relative">
              <select
                id="skill_id"
                name="skill_id"
                value={formData.skill_id}
                onChange={e => setFormData(prev => ({ ...prev, skill_id: e.target.value }))}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] appearance-none"
                required
              >
                <option value="">Wähle einen Skill...</option>
                {skillsByDomain.map(({ domain, skills: domainSkills }) => (
                  domainSkills.length > 0 && (
                    <optgroup key={domain.id} label={`${domain.icon} ${domain.name}`}>
                      {domainSkills.map(skill => (
                        <option key={skill.id} value={skill.id}>
                          {skill.icon} {skill.name}
                        </option>
                      ))}
                    </optgroup>
                  )
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-adaptive-muted pointer-events-none" />
            </div>
          </div>

          {/* XP Reward */}
          <div>
            <label className="block text-sm font-medium mb-2">
              XP Belohnung: {formData.xp_reward}
            </label>
            <input
              type="range"
              min="10"
              max="1000"
              step="10"
              value={formData.xp_reward}
              onChange={e => setFormData(prev => ({ ...prev, xp_reward: parseInt(e.target.value) }))}
              className="w-full accent-[var(--accent-primary)]"
            />
            <div className="flex justify-between text-xs text-adaptive-dim mt-1">
              <span>10 XP</span>
              <span>1000 XP</span>
            </div>
          </div>

          {/* Faction (optional) */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Lebensbereich (optional)
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, faction_id: '' }))}
                className={`py-2 px-2 rounded-lg text-xs transition-all ${
                  !formData.faction_id
                    ? 'bg-white/20 ring-1 ring-white/50'
                    : 'bg-white/5 text-adaptive-muted hover:bg-white/10'
                }`}
              >
                Keiner
              </button>
              {FACTIONS.map(faction => (
                <button
                  key={faction.id}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, faction_id: faction.id }))}
                  className={`py-2 px-2 rounded-lg text-xs transition-all ${
                    formData.faction_id === faction.id
                      ? 'bg-white/20 ring-1 ring-white/50'
                      : 'bg-white/5 text-adaptive-muted hover:bg-white/10'
                  }`}
                >
                  {faction.icon} {faction.name}
                </button>
              ))}
            </div>
          </div>

          {/* Due Date (optional) */}
          <div>
            <label htmlFor="due_date" className="block text-sm font-medium mb-2">
              Fälligkeitsdatum (optional)
            </label>
            <input
              id="due_date"
              name="due_date"
              type="datetime-local"
              value={formData.due_date}
              onChange={e => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Link
              href="/quests"
              className="flex-1 py-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-center"
            >
              Abbrechen
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || !formData.title.trim() || !formData.skill_id}
              className="flex-1 py-3 rounded-lg bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isSubmitting ? 'Erstellen...' : 'Quest erstellen'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
