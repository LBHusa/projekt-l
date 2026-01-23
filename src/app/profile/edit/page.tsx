'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User, Save } from 'lucide-react';

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
}

export default function EditProfilePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    display_name: '',
    bio: '',
  });

  // Load profile data
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch('/api/user/profile');
        const data = await response.json();

        if (data.profile) {
          setFormData({
            display_name: data.profile.display_name || '',
            bio: data.profile.bio || '',
          });
        }
      } catch (err) {
        console.error('Error loading profile:', err);
        setError('Fehler beim Laden des Profils');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!formData.display_name.trim()) {
      setError('Anzeigename ist erforderlich');
      return;
    }

    if (formData.display_name.length < 2) {
      setError('Anzeigename muss mindestens 2 Zeichen haben');
      return;
    }

    // Check for XSS characters in display_name
    if (/<|>/.test(formData.display_name)) {
      setError('Display name cannot contain < or > characters');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: formData.display_name.trim(),
          bio: formData.bio.trim() || undefined,
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

      setSuccess(true);

      // Redirect after short delay
      setTimeout(() => {
        router.push('/profile');
      }, 1500);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Netzwerkfehler');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-adaptive-muted">Lade Profil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Header */}
      <header className="border-b border-[var(--orb-border)] bg-[var(--background-secondary)]/50 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/profile"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-adaptive-muted" />
            </Link>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <User className="w-6 h-6 text-blue-400" />
                Profil bearbeiten
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Success Message */}
          {success && (
            <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400">
              Profil erfolgreich gespeichert!
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="error-message p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400" role="alert">
              {error}
            </div>
          )}

          {/* Display Name */}
          <div>
            <label htmlFor="display_name" className="block text-sm font-medium mb-2">
              Anzeigename *
            </label>
            <input
              id="display_name"
              name="display_name"
              type="text"
              value={formData.display_name}
              onChange={e => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
              placeholder="Dein Anzeigename"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
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
            <label htmlFor="bio" className="block text-sm font-medium mb-2">
              Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={e => setFormData(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Erzähle etwas über dich..."
              rows={5}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] resize-none"
              maxLength={500}
            />
            <p className="text-xs text-adaptive-dim mt-1">
              {formData.bio.length}/500 Zeichen
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Link
              href="/profile"
              className="flex-1 py-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-center"
            >
              Abbrechen
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || !formData.display_name.trim()}
              className="flex-1 py-3 rounded-lg bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                'Speichern...'
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Speichern
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
