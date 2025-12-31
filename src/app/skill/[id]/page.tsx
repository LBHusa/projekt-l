'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus, Edit, Clock, TrendingUp } from 'lucide-react';
import { progressToNextLevel, xpForLevel, getLevelTier } from '@/lib/xp';
import { getSkillWithAncestors, getConnectedSkills, updateSkill, deleteSkill } from '@/lib/data/skills';
import { getUserSkillBySkillId, getExperiencesForSkill, addXpToSkill } from '@/lib/data/user-skills';
import { getDomainById } from '@/lib/data/domains';
import SkillBreadcrumb from '@/components/SkillBreadcrumb';
import SkillForm from '@/components/SkillForm';
import type { Skill, SkillDomain, UserSkill, Experience, SkillAncestor } from '@/lib/database.types';

interface ConnectedSkillDisplay {
  id: string;
  name: string;
  icon: string;
  type: 'prerequisite' | 'synergy' | 'related';
  // Domain info
  domain: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
  // Ancestors for path display
  path: SkillAncestor[];
}

export default function SkillPage() {
  const params = useParams();
  const router = useRouter();
  const skillId = params.id as string;

  const [skill, setSkill] = useState<Skill | null>(null);
  const [ancestors, setAncestors] = useState<SkillAncestor[]>([]);
  const [domain, setDomain] = useState<SkillDomain | null>(null);
  const [userSkill, setUserSkill] = useState<UserSkill | null>(null);
  const [connectedSkills, setConnectedSkills] = useState<ConnectedSkillDisplay[]>([]);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showXpModal, setShowXpModal] = useState(false);
  const [xpAmount, setXpAmount] = useState(50);
  const [xpDescription, setXpDescription] = useState('');
  const [addingXp, setAddingXp] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Load skill with ancestors for breadcrumb
      const skillResult = await getSkillWithAncestors(skillId);
      if (!skillResult) {
        setError('Skill nicht gefunden');
        return;
      }
      setSkill(skillResult.skill);
      setAncestors(skillResult.ancestors);

      // Load domain
      const domainData = await getDomainById(skillResult.skill.domain_id);
      setDomain(domainData);

      // Load user skill data
      const userSkillData = await getUserSkillBySkillId(skillId);
      setUserSkill(userSkillData);

      // Load connected skills with domain info
      const connections = await getConnectedSkills(skillId);
      const connectedDisplay: ConnectedSkillDisplay[] = connections.map(conn => ({
        id: conn.connectedSkill.id,
        name: conn.connectedSkill.name,
        icon: conn.connectedSkill.icon,
        type: conn.type,
        domain: conn.domain,
        path: conn.path,
      }));
      setConnectedSkills(connectedDisplay);

      // Load experiences
      const experiencesData = await getExperiencesForSkill(skillId);
      setExperiences(experiencesData);

    } catch (err) {
      console.error('Error loading skill:', err);
      setError('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  }, [skillId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddXp = async () => {
    if (!xpDescription.trim() || xpAmount <= 0) return;

    try {
      setAddingXp(true);
      await addXpToSkill(skillId, xpAmount, xpDescription);

      // Reload data
      await loadData();

      // Reset form
      setShowXpModal(false);
      setXpAmount(50);
      setXpDescription('');
    } catch (err) {
      console.error('Error adding XP:', err);
      alert('Fehler beim Hinzufügen von XP');
    } finally {
      setAddingXp(false);
    }
  };

  // Edit skill handler
  const handleEditSkill = async (data: { name: string; icon: string; description: string }) => {
    try {
      await updateSkill(skillId, data);
      await loadData();
      setShowEditModal(false);
    } catch (err) {
      console.error('Error updating skill:', err);
      alert('Fehler beim Aktualisieren des Skills');
    }
  };

  // Delete skill handler
  const handleDeleteSkill = async () => {
    if (!skill) return;
    try {
      await deleteSkill(skillId);
      router.push(`/domain/${skill.domain_id}`);
    } catch (err) {
      console.error('Error deleting skill:', err);
      alert('Fehler beim Löschen des Skills');
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--accent-primary)] animate-pulse mx-auto mb-4" />
          <p className="text-[var(--foreground-muted)]">Lade Skill...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error || !skill) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{error || 'Skill nicht gefunden'}</h1>
          <button
            onClick={() => router.push('/')}
            className="text-[var(--accent-primary)] hover:underline"
          >
            Zurück zum Dashboard
          </button>
        </div>
      </div>
    );
  }

  const level = userSkill?.level || 1;
  const currentXp = userSkill?.current_xp || 0;
  const color = domain?.color || '#6366f1';
  const progress = progressToNextLevel(level, currentXp);
  const xpNeeded = xpForLevel(level);
  const tier = getLevelTier(level);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header with Breadcrumb */}
      <header className="border-b border-[var(--orb-border)] bg-[var(--background-secondary)]/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Breadcrumb Navigation */}
            {domain && (
              <SkillBreadcrumb
                domain={domain}
                ancestors={ancestors}
                currentSkillName={skill.name}
                currentSkillIcon={skill.icon}
              />
            )}

            <motion.button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--orb-border)] hover:bg-[var(--background-secondary)] transition-colors shrink-0"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Edit className="w-4 h-4 text-[var(--foreground-muted)]" />
              <span className="text-sm text-[var(--foreground-muted)]">Bearbeiten</span>
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Skill Orb + Connected Skills */}
            <div className="lg:col-span-1">
              {/* Main Skill Orb */}
              <motion.div
                className="flex flex-col items-center mb-8"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <div
                  className="w-40 h-40 rounded-full flex items-center justify-center relative bg-gradient-to-br from-[#1a1a2e] to-[#16162a] border border-[var(--orb-border)]"
                  style={{
                    boxShadow: `
                      0 0 30px ${color}50,
                      0 0 60px ${color}30,
                      0 0 90px ${color}15,
                      inset 0 0 40px ${color}15
                    `,
                  }}
                >
                  <span className="text-6xl">{skill.icon}</span>
                </div>
                <h1 className="text-2xl font-bold mt-4">{skill.name}</h1>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className="px-3 py-1 rounded-full text-sm font-semibold"
                    style={{
                      backgroundColor: `${tier.color}20`,
                      color: tier.color,
                    }}
                  >
                    {tier.name}
                  </span>
                </div>
              </motion.div>

              {/* Connected Skills */}
              <motion.div
                className="bg-[var(--background-secondary)] rounded-xl p-5 border border-[var(--orb-border)]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h3 className="text-lg font-semibold mb-4">Verbundene Skills</h3>
                {connectedSkills.length === 0 ? (
                  <p className="text-sm text-[var(--foreground-muted)]">Keine Verbindungen</p>
                ) : (
                  <div className="space-y-4">
                    {/* Group skills by domain path and connection type */}
                    {(() => {
                      // Connection type styling
                      const typeStyles = {
                        synergy: { color: '#22c55e', icon: '⚡', label: 'Synergie', order: 1 },
                        prerequisite: { color: '#ef4444', icon: '→', label: 'Voraussetzung', order: 2 },
                        related: { color: '#6366f1', icon: '○', label: 'Verwandt', order: 3 },
                      };

                      // Group by connection type, then by domain path
                      const grouped = connectedSkills.reduce((acc, cs) => {
                        const pathKey = `${cs.domain.id}:${cs.path.map(a => a.id).join(':')}`;
                        const groupKey = `${cs.type}:${pathKey}`;
                        if (!acc[groupKey]) {
                          acc[groupKey] = {
                            type: cs.type,
                            domain: cs.domain,
                            path: cs.path,
                            skills: [],
                          };
                        }
                        acc[groupKey].skills.push(cs);
                        return acc;
                      }, {} as Record<string, { type: string; domain: typeof connectedSkills[0]['domain']; path: typeof connectedSkills[0]['path']; skills: typeof connectedSkills }>);

                      // Sort groups: by connection type, then by domain
                      const sortedGroups = Object.values(grouped).sort((a, b) => {
                        const typeOrderA = typeStyles[a.type as keyof typeof typeStyles].order;
                        const typeOrderB = typeStyles[b.type as keyof typeof typeStyles].order;
                        if (typeOrderA !== typeOrderB) return typeOrderA - typeOrderB;
                        return a.domain.name.localeCompare(b.domain.name);
                      });

                      return sortedGroups.map((group, groupIndex) => {
                        const typeStyle = typeStyles[group.type as keyof typeof typeStyles];
                        const pathParts = [
                          `${group.domain.icon} ${group.domain.name}`,
                          ...group.path.map(a => a.name),
                        ];
                        const pathString = pathParts.join(' > ');

                        return (
                          <div key={`group-${groupIndex}`} className="space-y-1.5">
                            {/* Group Header */}
                            <div className="flex items-center gap-2 text-xs px-1">
                              <span
                                className="font-semibold flex items-center gap-1"
                                style={{ color: typeStyle.color }}
                              >
                                <span>{typeStyle.icon}</span>
                                <span>{typeStyle.label}</span>
                              </span>
                              <span className="text-[var(--foreground-muted)]">•</span>
                              <span className="text-[var(--foreground-muted)] truncate">
                                {pathString}
                              </span>
                            </div>

                            {/* Skills in group - tight spacing */}
                            <div className="space-y-1 pl-1 border-l-2" style={{ borderColor: `${typeStyle.color}40` }}>
                              {group.skills.map((cs) => (
                                <motion.button
                                  key={cs.id}
                                  className="w-full flex items-center gap-2.5 p-2 rounded-lg border border-[var(--orb-border)] bg-[var(--background)] hover:border-[var(--accent-primary)] transition-colors text-left"
                                  onClick={() => router.push(`/skill/${cs.id}`)}
                                  whileHover={{ scale: 1.01, x: 2 }}
                                  whileTap={{ scale: 0.99 }}
                                >
                                  {/* Skill Icon */}
                                  <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--background-secondary)] shrink-0"
                                    style={{
                                      boxShadow: `0 0 8px ${cs.domain.color}25`,
                                      borderColor: cs.domain.color,
                                      borderWidth: '1px',
                                    }}
                                  >
                                    <span className="text-sm">{cs.icon}</span>
                                  </div>
                                  <span className="font-medium text-sm truncate">{cs.name}</span>
                                </motion.button>
                              ))}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </motion.div>
            </div>

            {/* Right: Info Panel */}
            <div className="lg:col-span-2 space-y-6">
              {/* Level & XP */}
              <motion.div
                className="bg-[var(--background-secondary)] rounded-xl p-6 border border-[var(--orb-border)]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-3xl font-bold" style={{ color }}>
                      Level {level}
                    </div>
                    <div className="text-sm text-[var(--foreground-muted)]">
                      {currentXp.toLocaleString()} / {xpNeeded.toLocaleString()} XP
                    </div>
                  </div>
                  <motion.button
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent-primary)] text-white font-medium"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowXpModal(true)}
                  >
                    <Plus className="w-4 h-4" />
                    XP hinzufügen
                  </motion.button>
                </div>

                <div className="xp-bar h-3 rounded-full">
                  <motion.div
                    className="xp-bar-fill h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </div>
                <div className="text-right text-xs text-[var(--foreground-muted)] mt-1">
                  {progress.toFixed(1)}% → Level {level + 1}
                </div>
              </motion.div>

              {/* Description */}
              <motion.div
                className="bg-[var(--background-secondary)] rounded-xl p-6 border border-[var(--orb-border)]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <h3 className="text-lg font-semibold mb-3">Beschreibung</h3>
                <p className="text-[var(--foreground-muted)]">{skill.description || 'Keine Beschreibung'}</p>
              </motion.div>

              {/* Stats */}
              <motion.div
                className="grid grid-cols-2 gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="bg-[var(--background-secondary)] rounded-xl p-5 border border-[var(--orb-border)]">
                  <div className="flex items-center gap-2 text-[var(--foreground-muted)] mb-2">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">Letzte Aktivität</span>
                  </div>
                  <div className="font-semibold">
                    {userSkill?.last_used
                      ? new Date(userSkill.last_used).toLocaleDateString('de-DE', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      : 'Noch keine'}
                  </div>
                </div>
                <div className="bg-[var(--background-secondary)] rounded-xl p-5 border border-[var(--orb-border)]">
                  <div className="flex items-center gap-2 text-[var(--foreground-muted)] mb-2">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm">XP diese Woche</span>
                  </div>
                  <div className="font-semibold" style={{ color }}>
                    +{experiences.reduce((sum, e) => sum + e.xp_gained, 0)} XP
                  </div>
                </div>
              </motion.div>

              {/* Recent Experiences */}
              <motion.div
                className="bg-[var(--background-secondary)] rounded-xl p-6 border border-[var(--orb-border)]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Letzte Einträge</h3>
                </div>

                {experiences.length === 0 ? (
                  <p className="text-sm text-[var(--foreground-muted)]">Noch keine Einträge</p>
                ) : (
                  <div className="space-y-3">
                    {experiences.slice(0, 5).map((exp) => (
                      <div
                        key={exp.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-[var(--background)] border border-[var(--orb-border)]"
                      >
                        <div>
                          <div className="font-medium">{exp.description}</div>
                          <div className="text-xs text-[var(--foreground-muted)]">
                            {new Date(exp.date).toLocaleDateString('de-DE')}
                          </div>
                        </div>
                        <div className="text-sm font-bold" style={{ color }}>
                          +{exp.xp_gained} XP
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </main>

      {/* XP Modal */}
      {showXpModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            className="bg-[var(--background-secondary)] rounded-xl p-6 border border-[var(--orb-border)] w-full max-w-md mx-4"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <h3 className="text-xl font-bold mb-4">XP hinzufügen</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[var(--foreground-muted)] mb-2">
                  Beschreibung
                </label>
                <input
                  type="text"
                  value={xpDescription}
                  onChange={(e) => setXpDescription(e.target.value)}
                  placeholder="Was hast du gemacht?"
                  className="w-full px-4 py-2 rounded-lg bg-[var(--background)] border border-[var(--orb-border)] focus:border-[var(--accent-primary)] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-[var(--foreground-muted)] mb-2">
                  XP: {xpAmount}
                </label>
                <input
                  type="range"
                  min="10"
                  max="500"
                  step="10"
                  value={xpAmount}
                  onChange={(e) => setXpAmount(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-[var(--foreground-muted)]">
                  <span>10</span>
                  <span>500</span>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowXpModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-[var(--orb-border)] hover:bg-[var(--background)] transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleAddXp}
                  disabled={addingXp || !xpDescription.trim()}
                  className="flex-1 px-4 py-2 rounded-lg bg-[var(--accent-primary)] text-white font-medium disabled:opacity-50"
                >
                  {addingXp ? 'Speichern...' : 'Hinzufügen'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Skill Modal */}
      <SkillForm
        isOpen={showEditModal}
        mode="edit"
        initialData={{
          name: skill.name,
          icon: skill.icon,
          description: skill.description || '',
        }}
        domainColor={color}
        onSubmit={handleEditSkill}
        onClose={() => setShowEditModal(false)}
        onDelete={handleDeleteSkill}
      />
    </div>
  );
}
