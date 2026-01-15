'use client';

import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Bot, Wand2 } from 'lucide-react';
import { useSidebar } from '@/contexts/SidebarContext';
import { SpeechBubble } from './SpeechBubble';

export function SidebarTrigger() {
  const pathname = usePathname();
  const { toggleSkillCoach, toggleQuestMaster, isSkillCoachOpen, isQuestMasterOpen } = useSidebar();

  // Hide on auth pages
  if (pathname?.startsWith('/auth')) {
    return null;
  }

  return (
    <>
      {/* Quest Master Button - Bottom Left */}
      <div className="fixed bottom-6 left-6 z-30">
        <SpeechBubble />
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleQuestMaster}
          className={`
            relative w-16 h-16 rounded-full shadow-lg
            flex items-center justify-center
            transition-all duration-300
            ${isQuestMasterOpen
              ? 'bg-purple-600 ring-2 ring-purple-400'
              : 'bg-gradient-to-br from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600'
            }
          `}
          aria-label="Quest Master öffnen"
        >
          {/* Quest Master Icon/Avatar placeholder */}
          <div className="relative">
            <Wand2 className="w-7 h-7 text-white" />
            {/* Magical sparkle effect */}
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full"
            />
          </div>
        </motion.button>
        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-gray-400 whitespace-nowrap">
          Quest Master
        </span>
      </div>

      {/* Skill Coach Button - Bottom Right */}
      <div className="fixed bottom-6 right-6 z-30">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleSkillCoach}
          className={`
            w-16 h-16 rounded-full shadow-lg
            flex items-center justify-center
            transition-all duration-300
            ${isSkillCoachOpen
              ? 'bg-emerald-600 ring-2 ring-emerald-400'
              : 'bg-gradient-to-br from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600'
            }
          `}
          aria-label="AI Skill Coach öffnen"
        >
          <Bot className="w-7 h-7 text-white" />
        </motion.button>
        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-gray-400 whitespace-nowrap">
          Skill Coach
        </span>
      </div>
    </>
  );
}
