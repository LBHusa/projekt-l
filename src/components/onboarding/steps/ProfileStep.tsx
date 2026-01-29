'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronRight, ChevronLeft, User, RefreshCw } from 'lucide-react';
import { createAvatar } from '@dicebear/core';
import { pixelArt } from '@dicebear/collection';
import type { ProfileData } from '../OnboardingWizard';

interface ProfileStepProps {
  profile: ProfileData;
  onUpdate: (profile: ProfileData) => void;
  onNext: () => void;
  onBack: () => void;
}

// Preset avatar seeds for quick selection
const AVATAR_PRESETS = [
  'warrior-knight',
  'mage-wizard',
  'rogue-thief',
  'healer-priest',
  'ranger-archer',
  'paladin-holy',
  'monk-martial',
  'bard-singer',
  'druid-nature',
  'necromancer-dark',
  'assassin-shadow',
  'berserker-rage',
];

export default function ProfileStep({
  profile,
  onUpdate,
  onBack,
  onNext,
}: ProfileStepProps) {
  const [data, setData] = useState<ProfileData>(profile);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onUpdate(data);
  }, [data, onUpdate]);

  const updateField = <K extends keyof ProfileData>(key: K, value: ProfileData[K]) => {
    setData(prev => ({ ...prev, [key]: value }));
    setError(null);
  };

  const randomizeSeed = () => {
    updateField('avatarSeed', `user-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  };

  // Generate avatar SVG
  const avatarSvg = useMemo(() => {
    const avatar = createAvatar(pixelArt, {
      seed: data.avatarSeed,
      size: 128,
    });
    return avatar.toString();
  }, [data.avatarSeed]);

  const canProceed = data.displayName.trim().length >= 2;

  const handleNext = () => {
    if (!canProceed) {
      setError('Anzeigename muss mindestens 2 Zeichen haben');
      return;
    }
    onNext();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">
          Erstelle deinen Charakter
        </h2>
        <p className="text-adaptive-muted">
          Wie möchtest du in deinem Abenteuer genannt werden?
        </p>
      </div>

      {/* Avatar Section */}
      <div className="text-center">
        <div className="relative inline-block">
          {/* Main Avatar */}
          <div
            className="w-32 h-32 mx-auto rounded-2xl border-4 border-purple-500/50 overflow-hidden bg-white/5"
            dangerouslySetInnerHTML={{ __html: avatarSvg }}
          />

          {/* Randomize Button */}
          <button
            onClick={randomizeSeed}
            className="absolute -bottom-2 -right-2 p-2 bg-purple-500 rounded-full hover:bg-purple-600 transition-colors shadow-lg"
            title="Neues zufälliges Aussehen"
          >
            <RefreshCw className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Preset Avatars */}
        <div className="mt-6">
          <p className="text-sm text-adaptive-muted mb-3">Oder wähle einen Charakter:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {AVATAR_PRESETS.map(seed => {
              const presetAvatar = createAvatar(pixelArt, {
                seed,
                size: 48,
              });
              const isSelected = data.avatarSeed === seed;

              return (
                <button
                  key={seed}
                  onClick={() => updateField('avatarSeed', seed)}
                  className={`w-12 h-12 rounded-lg overflow-hidden transition-all ${
                    isSelected
                      ? 'ring-2 ring-purple-500 scale-110'
                      : 'hover:scale-105 opacity-70 hover:opacity-100'
                  }`}
                  dangerouslySetInnerHTML={{ __html: presetAvatar.toString() }}
                  title={seed.replace('-', ' ')}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Display Name */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          <User className="w-4 h-4 inline mr-2" />
          Anzeigename *
        </label>
        <input
          type="text"
          value={data.displayName}
          onChange={(e) => updateField('displayName', e.target.value)}
          placeholder="Dein Heldenname..."
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-adaptive-dim focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          required
          minLength={2}
          maxLength={50}
        />
        <p className="text-xs text-adaptive-dim mt-1">
          2-50 Zeichen
        </p>
      </div>

      {/* Bio */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Bio (optional)
        </label>
        <textarea
          value={data.bio}
          onChange={(e) => updateField('bio', e.target.value)}
          placeholder="Erzähle etwas über dich und deine Ziele..."
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-adaptive-dim focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
          rows={3}
          maxLength={500}
        />
        <p className="text-xs text-adaptive-dim mt-1">
          {data.bio.length}/500 Zeichen
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-adaptive-muted hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Zurück
        </button>

        <button
          onClick={handleNext}
          disabled={!canProceed}
          className="flex items-center gap-2 px-6 py-3 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium transition-colors"
        >
          Weiter
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
