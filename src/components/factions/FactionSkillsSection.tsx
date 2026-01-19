'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Sparkles, ChevronRight } from 'lucide-react';
import type { FactionId, Skill, SkillDomain } from '@/lib/database.types';
import { createBrowserClient } from '@/lib/supabase';

interface FactionSkillsSectionProps {
  factionId: FactionId;
  factionColor: string;
}

interface DomainWithSkills extends SkillDomain {
  skills: Skill[];
}

export default function FactionSkillsSection({ factionId, factionColor }: FactionSkillsSectionProps) {
  const [domains, setDomains] = useState<DomainWithSkills[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSkills = async () => {
      const supabase = createBrowserClient();

      // Get domains that belong to this faction
      const { data: domainsData, error: domainsError } = await supabase
        .from('skill_domains')
        .select('*')
        .eq('faction_key', factionId);

      if (domainsError) {
        console.error('Error fetching domains:', domainsError);
        setLoading(false);
        return;
      }

      if (!domainsData || domainsData.length === 0) {
        setLoading(false);
        return;
      }

      // Get skills for these domains
      const domainIds = domainsData.map(d => d.id);
      const { data: skillsData, error: skillsError } = await supabase
        .from('skills')
        .select('*')
        .in('domain_id', domainIds)
        .order('name');

      if (skillsError) {
        console.error('Error fetching skills:', skillsError);
        setLoading(false);
        return;
      }

      // Group skills by domain
      const domainsWithSkills = domainsData.map(domain => ({
        ...domain,
        skills: (skillsData || []).filter(s => s.domain_id === domain.id),
      }));

      setDomains(domainsWithSkills);
      setLoading(false);
    };

    loadSkills();
  }, [factionId]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-white/10 rounded w-40" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-20 bg-white/5 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (domains.length === 0) {
    return (
      <div className="text-center py-8 text-adaptive-dim">
        <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-50" />
        <p>Noch keine Skills in diesem Lebensbereich</p>
      </div>
    );
  }

  const totalSkills = domains.reduce((sum, d) => sum + d.skills.length, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5" style={{ color: factionColor }} />
          Zugehörige Skills
          <span className="text-sm font-normal text-adaptive-dim">({totalSkills})</span>
        </h2>
      </div>

      {/* Domains & Skills */}
      <div className="space-y-6">
        {domains.map((domain, domainIndex) => (
          <motion.div
            key={domain.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + domainIndex * 0.1 }}
          >
            <Link
              href={`/domain/${domain.id}`}
              className="flex items-center gap-2 mb-3 group"
            >
              <span className="text-xl">{domain.icon}</span>
              <span className="font-medium group-hover:text-adaptive transition-colors">
                {domain.name}
              </span>
              <span className="text-sm text-adaptive-dim">({domain.skills.length})</span>
              <ChevronRight className="w-4 h-4 text-adaptive-dim group-hover:text-adaptive-muted transition-colors" />
            </Link>

            {domain.skills.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {domain.skills.slice(0, 8).map((skill, skillIndex) => (
                  <Link
                    key={skill.id}
                    href={`/skill/${skill.id}`}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-3 transition-all group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span>{skill.icon || '⭐'}</span>
                      <span className="text-sm font-medium truncate group-hover:text-white transition-colors">
                        {skill.name}
                      </span>
                    </div>
                    <div className="text-xs text-adaptive-dim">
                      Skill
                    </div>
                  </Link>
                ))}
                {domain.skills.length > 8 && (
                  <Link
                    href={`/domain/${domain.id}`}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-3 flex items-center justify-center text-adaptive-muted hover:text-adaptive transition-colors"
                  >
                    +{domain.skills.length - 8} weitere
                  </Link>
                )}
              </div>
            ) : (
              <p className="text-sm text-adaptive-dim italic">Noch keine Skills</p>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
