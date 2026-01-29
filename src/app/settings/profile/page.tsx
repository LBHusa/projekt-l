'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Upload,
  Trash2,
  Camera,
  Check,
  Save,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { getUserProfile } from '@/lib/data/user-skills';
import PixelAvatar from '@/components/character/PixelAvatar';

// Predefined avatar seeds
const AVATAR_PRESETS = [
  { seed: 'wise-old-wizard', label: 'Weiser Zauberer' },
  { seed: 'brave-knight', label: 'Tapferer Ritter' },
  { seed: 'forest-ranger', label: 'Waldläufer' },
  { seed: 'mystic-mage', label: 'Mystischer Magier' },
  { seed: 'shadow-rogue', label: 'Schatten-Schurke' },
  { seed: 'holy-paladin', label: 'Heiliger Paladin' },
  { seed: 'wild-berserker', label: 'Wilder Berserker' },
  { seed: 'nature-druid', label: 'Natur-Druide' },
  { seed: 'tech-artificer', label: 'Tech-Konstrukteur' },
  { seed: 'chaos-warlock', label: 'Chaos-Hexer' },
  { seed: 'storm-viking', label: 'Sturm-Wikinger' },
  { seed: 'void-monk', label: 'Leere-Mönch' },
];

export default function ProfileSettingsPage() {
  const { userId } = useAuth();
  const [loading, setLoading] = useState(true);

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarSeed, setAvatarSeed] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile form state
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Messages
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      loadProfile();
    }
  }, [userId]);

  const loadProfile = async () => {
    try {
      // Load avatar data
      const profile = await getUserProfile(userId!);
      if (profile) {
        setAvatarUrl(profile.avatar_url);
        setAvatarSeed(profile.avatar_seed);
        setUsername(profile.username);
      }

      // Load profile data for form
      const response = await fetch('/api/user/profile');
      const data = await response.json();

      if (data.profile) {
        setDisplayName(data.profile.display_name || '');
        setBio(data.profile.bio || '');
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Fehler beim Laden des Profils');
    } finally {
      setLoading(false);
    }
  };

  // Avatar handlers
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('/api/profile/upload-avatar', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload fehlgeschlagen');
      }

      setAvatarUrl(data.avatar_url);
      setAvatarSeed(null);
      setSuccess('Avatar erfolgreich hochgeladen!');
    } catch (err: any) {
      setError(err.message || 'Ein Fehler ist aufgetreten');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = async () => {
    setError(null);
    setSuccess(null);
    setUploading(true);

    try {
      const response = await fetch('/api/profile/upload-avatar', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Entfernen fehlgeschlagen');
      }

      setAvatarUrl(null);
      setSuccess('Avatar erfolgreich entfernt!');
    } catch (err: any) {
      setError(err.message || 'Ein Fehler ist aufgetreten');
    } finally {
      setUploading(false);
    }
  };

  const handleSelectPixelAvatar = async (seed: string) => {
    setError(null);
    setSuccess(null);
    setUploading(true);

    try {
      const response = await fetch('/api/profile/upload-avatar', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ avatar_seed: seed }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Auswahl fehlgeschlagen');
      }

      setAvatarSeed(seed);
      setAvatarUrl(null);
      setSuccess('Pixel-Avatar ausgewählt!');
    } catch (err: any) {
      setError(err.message || 'Ein Fehler ist aufgetreten');
    } finally {
      setUploading(false);
    }
  };

  // Profile form handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!displayName.trim()) {
      setError('Anzeigename ist erforderlich');
      return;
    }

    if (displayName.length < 2) {
      setError('Anzeigename muss mindestens 2 Zeichen haben');
      return;
    }

    if (displayName.length > 50) {
      setError('Anzeigename darf maximal 50 Zeichen haben');
      return;
    }

    // Check for XSS characters
    if (/<|>/.test(displayName)) {
      setError('Anzeigename darf keine < oder > Zeichen enthalten');
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName.trim(),
          bio: bio.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.details) {
          const errorMessages = Object.values(data.details).flat().join(', ');
          setError(errorMessages || data.error);
        } else {
          setError(data.error || 'Fehler beim Speichern');
        }
        return;
      }

      setSuccess('Profil erfolgreich gespeichert!');
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Netzwerkfehler');
    } finally {
      setIsSaving(false);
    }
  };

  // Determine what to show in the preview
  const getPreviewSeed = () => {
    if (avatarUrl) return null;
    if (avatarSeed) return avatarSeed;
    return username || 'wise-old-wizard';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-adaptive-muted">Lade Profil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <header className="flex items-center gap-4 mb-6">
        <Link
          href="/settings"
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-adaptive-muted" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-adaptive">Profil bearbeiten</h1>
          <p className="text-sm text-adaptive-dim">
            Dein Avatar und Profilinformationen
          </p>
        </div>
      </header>

      {/* Error/Success messages */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm"
        >
          {error}
        </motion.div>
      )}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 text-sm"
        >
          {success}
        </motion.div>
      )}

      <div className="space-y-6">
        {/* Avatar Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl p-5"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <Camera className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-adaptive">Profilbild</h3>
              <p className="text-sm text-adaptive-dim">
                Lade ein eigenes Bild hoch oder wähle einen Pixel-Avatar
              </p>
            </div>
          </div>

          {/* Avatar Preview */}
          <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
            <div className="relative group">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-24 h-24 rounded-full object-cover border-2 border-[var(--accent-primary)] shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[var(--accent-primary)] shadow-lg bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                  <PixelAvatar
                    seed={getPreviewSeed() || 'wise-old-wizard'}
                    size={96}
                    className="w-full h-full"
                  />
                </div>
              )}

              {/* Overlay on hover */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center"
              >
                <Camera className="w-8 h-8 text-white" />
              </div>
            </div>

            <div className="flex-1 space-y-3">
              <p className="text-sm text-adaptive-muted text-center sm:text-left">
                {avatarUrl
                  ? 'Klicke auf dein Bild oder nutze die Buttons um es zu ändern.'
                  : 'Lade ein eigenes Profilbild hoch oder wähle einen Pixel-Avatar.'}
              </p>

              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/80 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  {uploading ? 'Hochladen...' : 'Bild hochladen'}
                </button>

                {avatarUrl && (
                  <button
                    onClick={handleRemoveAvatar}
                    disabled={uploading}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Entfernen
                  </button>
                )}
              </div>

              <p className="text-xs text-adaptive-dim text-center sm:text-left">
                Erlaubt: JPEG, PNG, WebP, GIF (max. 2MB)
              </p>
            </div>
          </div>

          {/* Pixel Avatar Selection */}
          <div className="border-t border-[var(--orb-border)] pt-5">
            <h4 className="font-medium text-adaptive mb-3">
              Oder wähle einen Pixel-Avatar:
            </h4>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
              {AVATAR_PRESETS.map((preset) => (
                <button
                  key={preset.seed}
                  onClick={() => handleSelectPixelAvatar(preset.seed)}
                  disabled={uploading}
                  className={
                    'relative group rounded-lg p-1 transition-all ' +
                    (avatarSeed === preset.seed && !avatarUrl
                      ? 'ring-2 ring-[var(--accent-primary)] bg-[var(--accent-primary)]/20'
                      : 'hover:bg-white/10')
                  }
                  title={preset.label}
                >
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                    <PixelAvatar
                      seed={preset.seed}
                      size={56}
                      className="w-full h-full"
                    />
                  </div>
                  {avatarSeed === preset.seed && !avatarUrl && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--accent-primary)] rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-adaptive-dim mt-2">
              Klicke auf einen Avatar, um ihn auszuwählen
            </p>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileSelect}
            className="hidden"
          />
        </motion.div>

        {/* Profile Information Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl p-5"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <User className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-adaptive">Profilinformationen</h3>
              <p className="text-sm text-adaptive-dim">
                Name und Beschreibung
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            {/* Display Name */}
            <div>
              <label
                htmlFor="display_name"
                className="block text-sm font-medium mb-2 text-adaptive"
              >
                Anzeigename *
              </label>
              <input
                id="display_name"
                name="display_name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Dein Anzeigename"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] text-adaptive"
                required
                minLength={2}
                maxLength={50}
              />
              <p className="text-xs text-adaptive-dim mt-1">2-50 Zeichen</p>
            </div>

            {/* Bio */}
            <div>
              <label
                htmlFor="bio"
                className="block text-sm font-medium mb-2 text-adaptive"
              >
                Bio
              </label>
              <textarea
                id="bio"
                name="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Erzähle etwas über dich..."
                rows={4}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] resize-none text-adaptive"
                maxLength={500}
              />
              <p className="text-xs text-adaptive-dim mt-1">
                {bio.length}/500 Zeichen
              </p>
            </div>

            {/* Save Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving || !displayName.trim()}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-white"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Speichern...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Profil speichern
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
