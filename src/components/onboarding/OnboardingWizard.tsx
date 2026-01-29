'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import OnboardingProgress from './OnboardingProgress';
import WelcomeStep from './steps/WelcomeStep';
import TellMeAboutYouStep from './steps/TellMeAboutYouStep';
import AIAnalysisStep from './steps/AIAnalysisStep';
import SkillsReviewStep from './steps/SkillsReviewStep';
import NegativeHabitsStep from './steps/NegativeHabitsStep';
import HabitsReviewStep from './steps/HabitsReviewStep';
import ProfileStep from './steps/ProfileStep';
import NotificationsStep from './steps/NotificationsStep';
import CharacterPortraitStep from './steps/CharacterPortraitStep';
import type { FactionId } from '@/lib/database.types';
import type {
  OnboardingData,
  FactionRating,
  DeepDiveData,
  TellMeAboutYouData,
  AIAnalysisResult,
  AIGeneratedSkill,
  AIGeneratedHabit,
  ProfileData,
  NotificationSettings,
  SelectedNegativeHabit,
  EMPTY_TELL_ME_DATA,
  EMPTY_AI_ANALYSIS,
} from '@/lib/onboarding/types';

// Re-export types for backward compatibility
export type { FactionRating, DeepDiveData, ProfileData, NotificationSettings };

// Legacy type exports (skill/habit entries)
export interface SkillEntry {
  name: string;
  factionId: FactionId;
  experience: 'beginner' | 'intermediate' | 'expert';
}

export interface HabitEntry {
  name: string;
  factionId: FactionId;
  frequencyPerWeek: number;
  icon: string;
}

interface OnboardingWizardProps {
  userId: string;
  userEmail?: string;
}

// 9-Step Flow
const STEPS = [
  { id: 'welcome', name: 'Lebensbereiche', required: true },
  { id: 'tellme', name: 'Erzähl mir', required: true },
  { id: 'aianalysis', name: 'KI-Analyse', required: true },
  { id: 'skills', name: 'Skills', required: true },
  { id: 'negativehabits', name: 'Reduzieren', required: false },
  { id: 'habits', name: 'Habits', required: true },
  { id: 'profile', name: 'Profil', required: true },
  { id: 'notifications', name: 'Benachrichtigungen', required: false },
  { id: 'portrait', name: 'Fertig', required: true },
];

// Default empty data structures
const defaultTellMeData: TellMeAboutYouData = {
  karriereEducation: { type: '', field: '', graduationYear: undefined },
  karriere: '',
  hobby: '',
  koerper: '',
  geist: '',
  finanzen: '',
  soziales: '',
  wissen: '',
};

const defaultAIAnalysis: AIAnalysisResult = {
  characterClass: '',
  characterDescription: '',
  factionLevels: {
    karriere: 10,
    hobby: 10,
    koerper: 10,
    geist: 10,
    finanzen: 10,
    soziales: 10,
    wissen: 10,
  },
  skills: [],
  habits: [],
};

export default function OnboardingWizard({ userId, userEmail }: OnboardingWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    factionRatings: [],
    tellMeAboutYou: defaultTellMeData,
    aiAnalysis: null,
    skills: [],
    negativeHabits: [],
    habits: [],
    profile: {
      displayName: userEmail?.split('@')[0] || '',
      avatarSeed: `user-${userId}-${Date.now()}`,
      bio: '',
    },
    notifications: {
      enableReminders: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
      enableTelegram: false,
    },
    deepDive: [], // Legacy field
  });

  const updateData = useCallback(<K extends keyof OnboardingData>(
    key: K,
    value: OnboardingData[K]
  ) => {
    setData(prev => ({ ...prev, [key]: value }));
  }, []);

  const goNext = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep]);

  const goBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback((stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < STEPS.length) {
      setCurrentStep(stepIndex);
    }
  }, []);

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      // Convert AI skills/habits to the format expected by the complete API
      const acceptedSkills = data.skills
        .filter(s => s.accepted)
        .map(s => ({
          name: s.name,
          factionId: s.factionId,
          experience: s.experience,
        }));

      const acceptedHabits = data.habits
        .filter(h => h.accepted)
        .map(h => ({
          name: h.name,
          factionId: h.factionId,
          frequencyPerWeek: h.suggestedFrequency,
          icon: h.icon,
        }));

      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          data: {
            factionRatings: data.factionRatings,
            tellMeAboutYou: data.tellMeAboutYou,
            aiAnalysis: data.aiAnalysis,
            skills: acceptedSkills,
            negativeHabits: data.negativeHabits,
            habits: acceptedHabits,
            profile: data.profile,
            notifications: data.notifications,
            deepDive: data.deepDive,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete onboarding');
      }

      router.push('/');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      alert('Fehler beim Speichern. Bitte versuche es erneut.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle AI analysis completion
  const handleAIAnalysisComplete = useCallback((result: AIAnalysisResult) => {
    setData(prev => ({
      ...prev,
      aiAnalysis: result,
      skills: result.skills,
      habits: result.habits,
    }));
    goNext();
  }, [goNext]);

  // Handle skill updates (from review step)
  const handleSkillsUpdate = useCallback((skills: AIGeneratedSkill[]) => {
    setData(prev => ({ ...prev, skills }));
  }, []);

  // Handle habit updates (from review step)
  const handleHabitsUpdate = useCallback((habits: AIGeneratedHabit[]) => {
    setData(prev => ({ ...prev, habits }));
  }, []);

  // Handle character description updates
  const handleDescriptionUpdate = useCallback((description: string) => {
    setData(prev => ({
      ...prev,
      aiAnalysis: prev.aiAnalysis
        ? { ...prev.aiAnalysis, characterDescription: description }
        : null,
    }));
  }, []);

  const renderStep = () => {
    const stepId = STEPS[currentStep].id;

    switch (stepId) {
      case 'welcome':
        return (
          <WelcomeStep
            factionRatings={data.factionRatings}
            onUpdate={(ratings) => updateData('factionRatings', ratings)}
            onNext={goNext}
          />
        );
      case 'tellme':
        return (
          <TellMeAboutYouStep
            factionRatings={data.factionRatings}
            data={data.tellMeAboutYou}
            onUpdate={(tellMeData) => updateData('tellMeAboutYou', tellMeData)}
            onNext={goNext}
            onBack={goBack}
          />
        );
      case 'aianalysis':
        return (
          <AIAnalysisStep
            factionRatings={data.factionRatings}
            tellMeAboutYou={data.tellMeAboutYou}
            onComplete={handleAIAnalysisComplete}
            onBack={goBack}
          />
        );
      case 'skills':
        return (
          <SkillsReviewStep
            skills={data.skills}
            factionRatings={data.factionRatings}
            tellMeAboutYou={data.tellMeAboutYou}
            onUpdate={handleSkillsUpdate}
            onNext={goNext}
            onBack={goBack}
          />
        );
      case 'negativehabits':
        return (
          <NegativeHabitsStep
            selectedHabits={data.negativeHabits}
            onUpdate={(negativeHabits) => updateData('negativeHabits', negativeHabits)}
            onNext={goNext}
            onBack={goBack}
          />
        );
      case 'habits':
        return (
          <HabitsReviewStep
            habits={data.habits}
            factionRatings={data.factionRatings}
            tellMeAboutYou={data.tellMeAboutYou}
            onUpdate={handleHabitsUpdate}
            onNext={goNext}
            onBack={goBack}
          />
        );
      case 'profile':
        return (
          <ProfileStep
            profile={data.profile}
            onUpdate={(profile) => updateData('profile', profile)}
            onNext={goNext}
            onBack={goBack}
          />
        );
      case 'notifications':
        return (
          <NotificationsStep
            settings={data.notifications}
            onUpdate={(settings) => updateData('notifications', settings)}
            onNext={goNext}
            onBack={goBack}
            onSkip={goNext}
          />
        );
      case 'portrait':
        return (
          <CharacterPortraitStep
            aiAnalysis={data.aiAnalysis}
            skills={data.skills}
            habits={data.habits}
            profile={data.profile}
            factionRatings={data.factionRatings}
            onComplete={handleComplete}
            onBack={goBack}
            onGoToStep={goToStep}
            onUpdateDescription={handleDescriptionUpdate}
            isSubmitting={isSubmitting}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Progress bar at top */}
      <OnboardingProgress
        steps={STEPS}
        currentStep={currentStep}
        onStepClick={goToStep}
      />

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
