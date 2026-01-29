'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSidebar } from '@/contexts/SidebarContext';

// Beispiel-Vorschläge - später durch echte Daten ersetzen
const SUGGESTIONS = [
  { text: "Zeit für ein neues Abenteuer?", type: "quest" },
  { text: "Du hast heute noch keine Habits erledigt!", type: "reminder" },
  { text: "Wie wäre es mit einer kleinen Herausforderung?", type: "quest" },
  { text: "Deine Skills warten auf dich!", type: "motivation" },
  { text: "Starte deinen Tag mit Energie!", type: "motivation" },
  { text: "Eine Quest pro Tag hält den Frust fern!", type: "quest" },
  { text: "Vergiss nicht deine Streak zu halten!", type: "reminder" },
];

export function SpeechBubble() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentSuggestion, setCurrentSuggestion] = useState(SUGGESTIONS[0]);
  const { openQuestMaster, isQuestMasterOpen } = useSidebar();

  const showRandomSuggestion = useCallback(() => {
    if (isQuestMasterOpen) return; // Nicht zeigen wenn Sidebar offen

    const randomIndex = Math.floor(Math.random() * SUGGESTIONS.length);
    setCurrentSuggestion(SUGGESTIONS[randomIndex]);
    setIsVisible(true);

    // Auto-hide nach 5 Sekunden
    setTimeout(() => {
      setIsVisible(false);
    }, 5000);
  }, [isQuestMasterOpen]);

  // Initial suggestion nach 3 Sekunden
  useEffect(() => {
    const initialTimer = setTimeout(() => {
      showRandomSuggestion();
    }, 3000);

    return () => clearTimeout(initialTimer);
  }, [showRandomSuggestion]);

  // Periodische Suggestions (alle 5 Minuten für Demo, in Prod: seltener)
  useEffect(() => {
    const interval = setInterval(() => {
      // Nur mit 20% Wahrscheinlichkeit zeigen (simuliert 1-5 pro Tag)
      if (Math.random() < 0.2) {
        showRandomSuggestion();
      }
    }, 5 * 60 * 1000); // 5 Minuten

    return () => clearInterval(interval);
  }, [showRandomSuggestion]);

  // Hide when sidebar opens
  useEffect(() => {
    if (isQuestMasterOpen) {
      setIsVisible(false);
    }
  }, [isQuestMasterOpen]);

  const handleClick = () => {
    setIsVisible(false);
    openQuestMaster();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 10 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          onClick={handleClick}
          className="absolute bottom-20 left-0 cursor-pointer hidden sm:block"
        >
          {/* Speech Bubble */}
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 shadow-lg max-w-[200px]">
            <p className="text-sm text-gray-800 dark:text-gray-200">
              {currentSuggestion.text}
            </p>

            {/* Bubble Tail */}
            <div className="absolute -bottom-2 left-6 w-4 h-4 bg-white dark:bg-gray-800 transform rotate-45" />
          </div>

          {/* Dismiss hint */}
          <span className="absolute -top-2 -right-2 text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 rounded-full px-2 py-0.5">
            Klick!
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
