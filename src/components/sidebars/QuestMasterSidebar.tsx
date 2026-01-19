'use client';

import { useState, useEffect } from 'react';
import { X, Wand2, Sparkles, Scroll, Trophy, Clock, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

interface Quest {
  id: string;
  title: string;
  description: string;
  xp_reward: number;
  quest_type: 'daily' | 'weekly' | 'story';
  difficulty: 'easy' | 'medium' | 'hard' | 'epic';
  status: 'active' | 'completed';
}

interface QuestMasterSidebarProps {
  onClose: () => void;
}

export function QuestMasterSidebar({ onClose }: QuestMasterSidebarProps) {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'generate'>('active');

  // Fetch active quests
  useEffect(() => {
    fetchQuests();
  }, []);

  const fetchQuests = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/quests?status=active');
      if (response.ok) {
        const data = await response.json();
        setQuests(data.quests || []);
      }
    } catch (error) {
      console.error('Failed to fetch quests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateQuest = async (type: 'daily' | 'weekly') => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/quests/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questType: type, count: 1 }),
      });

      if (response.ok) {
        await fetchQuests();
        setActiveTab('active');
      }
    } catch (error) {
      console.error('Failed to generate quest:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400 bg-green-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20';
      case 'hard': return 'text-orange-400 bg-orange-500/20';
      case 'epic': return 'text-purple-400 bg-purple-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with Quest Master Character */}
      <div className="relative p-4 border-b border-gray-700 bg-gradient-to-r from-purple-900/50 to-indigo-900/50">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Quest Master Avatar/Sprite Placeholder */}
            <div className="relative">
              <div className="w-16 h-20 bg-gradient-to-b from-purple-600 to-indigo-700 rounded-lg flex items-center justify-center overflow-hidden">
                {/* Placeholder - später durch echtes Sprite ersetzen */}
                <div className="text-center">
                  <Wand2 className="w-8 h-8 text-yellow-400 mx-auto" />
                  <div className="text-[8px] text-purple-200 mt-1">Quest</div>
                  <div className="text-[8px] text-purple-200">Master</div>
                </div>
                {/* Magical glow effect */}
                <motion.div
                  animate={{
                    opacity: [0.3, 0.6, 0.3],
                    scale: [1, 1.1, 1],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 bg-purple-400/20 rounded-lg"
                />
              </div>
              {/* Sparkle effect */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                className="absolute -top-1 -right-1"
              >
                <Sparkles className="w-4 h-4 text-yellow-400" />
              </motion.div>
            </div>

            <div>
              <h2 className="font-bold text-white text-lg">Quest Master</h2>
              <p className="text-xs text-purple-300">Dein Weg zum Helden</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Schließen"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Speech bubble from Quest Master */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-3 bg-gray-800/80 rounded-xl p-3 relative"
        >
          <div className="absolute -top-2 left-8 w-4 h-4 bg-gray-800/80 transform rotate-45" />
          <p className="text-sm text-gray-300 italic">
            &quot;Willkommen, junger Abenteurer! Welche Herausforderung darf es heute sein?&quot;
          </p>
        </motion.div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'active'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <Scroll className="w-4 h-4 inline mr-2" />
          Aktive Quests ({quests.length})
        </button>
        <button
          onClick={() => setActiveTab('generate')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'generate'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <Sparkles className="w-4 h-4 inline mr-2" />
          Neue Quest
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'active' ? (
          <>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Sparkles className="w-8 h-8 text-purple-400" />
                </motion.div>
              </div>
            ) : quests.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <Scroll className="w-12 h-12 mx-auto text-gray-600 mb-3" />
                <p className="text-gray-400 mb-4">Keine aktiven Quests</p>
                <button
                  onClick={() => setActiveTab('generate')}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors"
                >
                  Neue Quest generieren
                </button>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {quests.map((quest, index) => (
                  <motion.div
                    key={quest.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 hover:border-purple-500/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-adaptive">{quest.title}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(quest.difficulty)}`}>
                        {quest.difficulty}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">{quest.description}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 text-yellow-400">
                        <Trophy className="w-3 h-3" />
                        +{quest.xp_reward} XP
                      </span>
                      <span className="flex items-center gap-1 text-gray-500">
                        <Clock className="w-3 h-3" />
                        {quest.quest_type}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-400 text-center mb-6">
              Lass den Quest Master eine passende Herausforderung für dich finden!
            </p>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => generateQuest('daily')}
              disabled={isGenerating}
              className="w-full p-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl text-white hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 transition-all"
            >
              <div className="flex items-center justify-center gap-3">
                <Zap className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Tägliche Quest</div>
                  <div className="text-xs opacity-80">Schnell & Machbar</div>
                </div>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => generateQuest('weekly')}
              disabled={isGenerating}
              className="w-full p-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl text-white hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 transition-all"
            >
              <div className="flex items-center justify-center gap-3">
                <Trophy className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Wöchentliche Quest</div>
                  <div className="text-xs opacity-80">Größere Herausforderung</div>
                </div>
              </div>
            </motion.button>

            {isGenerating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-4"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="inline-block"
                >
                  <Sparkles className="w-6 h-6 text-purple-400" />
                </motion.div>
                <p className="text-sm text-gray-400 mt-2">Der Quest Master denkt nach...</p>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
