'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface SidebarContextType {
  // Skill Coach (Rechts)
  isSkillCoachOpen: boolean;
  openSkillCoach: () => void;
  closeSkillCoach: () => void;
  toggleSkillCoach: () => void;

  // Quest Master (Links)
  isQuestMasterOpen: boolean;
  openQuestMaster: () => void;
  closeQuestMaster: () => void;
  toggleQuestMaster: () => void;

  // Beide schließen
  closeAll: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

interface SidebarProviderProps {
  children: ReactNode;
}

export function SidebarProvider({ children }: SidebarProviderProps) {
  const [isSkillCoachOpen, setIsSkillCoachOpen] = useState(false);
  const [isQuestMasterOpen, setIsQuestMasterOpen] = useState(false);

  // Skill Coach Controls
  const openSkillCoach = useCallback(() => {
    setIsSkillCoachOpen(true);
  }, []);

  const closeSkillCoach = useCallback(() => {
    setIsSkillCoachOpen(false);
  }, []);

  const toggleSkillCoach = useCallback(() => {
    setIsSkillCoachOpen(prev => !prev);
  }, []);

  // Quest Master Controls
  const openQuestMaster = useCallback(() => {
    setIsQuestMasterOpen(true);
  }, []);

  const closeQuestMaster = useCallback(() => {
    setIsQuestMasterOpen(false);
  }, []);

  const toggleQuestMaster = useCallback(() => {
    setIsQuestMasterOpen(prev => !prev);
  }, []);

  // Close All
  const closeAll = useCallback(() => {
    setIsSkillCoachOpen(false);
    setIsQuestMasterOpen(false);
  }, []);

  return (
    <SidebarContext.Provider
      value={{
        isSkillCoachOpen,
        openSkillCoach,
        closeSkillCoach,
        toggleSkillCoach,
        isQuestMasterOpen,
        openQuestMaster,
        closeQuestMaster,
        toggleQuestMaster,
        closeAll,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
