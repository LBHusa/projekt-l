'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSidebar } from '@/contexts/SidebarContext';
import { SkillCoachSidebar } from './SkillCoachSidebar';
import { QuestMasterSidebar } from './QuestMasterSidebar';
import { SidebarTrigger } from './SidebarTrigger';

export function SidebarContainer() {
  const {
    isSkillCoachOpen,
    isQuestMasterOpen,
    closeAll,
    closeSkillCoach,
    closeQuestMaster
  } = useSidebar();

  // ESC key to close sidebars
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeAll]);

  return (
    <>
      {/* Trigger Buttons - Fixed position */}
      <SidebarTrigger />

      {/* Backdrop when any sidebar is open */}
      <AnimatePresence>
        {(isSkillCoachOpen || isQuestMasterOpen) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={closeAll}
          />
        )}
      </AnimatePresence>

      {/* Quest Master Sidebar - LEFT */}
      <AnimatePresence>
        {isQuestMasterOpen && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 h-full w-full md:w-1/3 min-w-[320px] max-w-[480px] bg-gray-900/95 border-r border-gray-700 z-50 shadow-2xl"
          >
            <QuestMasterSidebar onClose={closeQuestMaster} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skill Coach Sidebar - RIGHT */}
      <AnimatePresence>
        {isSkillCoachOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full md:w-1/3 min-w-[320px] max-w-[480px] bg-gray-900/95 border-l border-gray-700 z-50 shadow-2xl"
          >
            <SkillCoachSidebar onClose={closeSkillCoach} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
