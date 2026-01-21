'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Key,
  Check,
  Trash2,
  ExternalLink,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface KeyInfo {
  hasKey: boolean;
  keyPrefix?: string;
  provider?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function ApiKeySettings() {
  const [keyInfo, setKeyInfo] = useState<KeyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  // Fetch current key status
  useEffect(() => {
    fetchKeyInfo();
  }, []);

  const fetchKeyInfo = async () => {
    try {
      const res = await fetch('/api/settings/llm-key?provider=anthropic');
      const data = await res.json();
      if (data.success !== false) {
        setKeyInfo(data);
      }
    } catch (err) {
      console.error('Error fetching key info:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setError('Bitte gib einen API Key ein');
      return;
    }

    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const res = await fetch('/api/settings/llm-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim(), provider: 'anthropic' }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || 'Fehler beim Speichern');
        return;
      }

      setSuccess('API Key erfolgreich gespeichert!');
      setApiKey('');
      setKeyInfo(data);
    } catch (err) {
      setError('Netzwerkfehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('API Key wirklich löschen? Du musst ihn erneut eingeben um KI-Features zu nutzen.')) {
      return;
    }

    setError(null);
    setSuccess(null);
    setDeleting(true);

    try {
      const res = await fetch('/api/settings/llm-key?provider=anthropic', {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || 'Fehler beim Löschen');
        return;
      }

      setSuccess('API Key gelöscht');
      setKeyInfo({ hasKey: false });
    } catch (err) {
      setError('Netzwerkfehler beim Löschen');
    } finally {
      setDeleting(false);
    }
  };

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  if (loading) {
    return (
      <div className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl p-5">
        <div className="flex items-center gap-3 text-adaptive-dim">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Lade Einstellungen...</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl p-5 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20">
            <Key className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-adaptive">Anthropic API Key</h3>
            <p className="text-xs text-adaptive-dim">
              Für KI-Questmaster & AI Chat
            </p>
          </div>
        </div>

        {/* Status Badge */}
        {keyInfo?.hasKey ? (
          <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
            Aktiv
          </span>
        ) : (
          <span className="px-2 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium">
            Nicht konfiguriert
          </span>
        )}
      </div>

      {/* Current Key Display */}
      {keyInfo?.hasKey && keyInfo.keyPrefix && (
        <div className="p-3 rounded-lg bg-black/20 border border-[var(--orb-border)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-adaptive-dim mb-1">Gespeicherter Key:</p>
              <code className="text-sm text-adaptive font-mono">
                {keyInfo.keyPrefix}
              </code>
            </div>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors disabled:opacity-50"
              title="Key löschen"
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          </div>
          {keyInfo.updatedAt && (
            <p className="text-xs text-adaptive-dim mt-2">
              Zuletzt aktualisiert: {new Date(keyInfo.updatedAt).toLocaleDateString('de-DE')}
            </p>
          )}
        </div>
      )}

      {/* Input Section */}
      <div className="space-y-3">
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-api..."
            className="w-full px-4 py-3 pr-12 rounded-lg bg-black/20 border border-[var(--orb-border)] text-adaptive placeholder:text-adaptive-dim font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-adaptive-dim hover:text-adaptive"
          >
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !apiKey.trim()}
          className="w-full py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Speichern...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              {keyInfo?.hasKey ? 'Key aktualisieren' : 'Key speichern'}
            </>
          )}
        </button>
      </div>

      {/* Messages */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center gap-2 text-red-400 text-sm"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center gap-2 text-green-400 text-sm"
          >
            <Check className="w-4 h-4 flex-shrink-0" />
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help Section */}
      <div className="border-t border-[var(--orb-border)] pt-4">
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="w-full flex items-center justify-between text-sm text-adaptive-dim hover:text-adaptive transition-colors"
        >
          <span className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            Wo bekomme ich einen API Key?
          </span>
          {showHelp ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        <AnimatePresence>
          {showHelp && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 space-y-3 text-sm text-adaptive-dim">
                <ol className="space-y-2 list-decimal list-inside">
                  <li>
                    Gehe zu{' '}
                    <a
                      href="https://console.anthropic.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:underline inline-flex items-center gap-1"
                    >
                      console.anthropic.com
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>Erstelle einen Account oder logge dich ein</li>
                  <li>Navigiere zu "API Keys" im Menü</li>
                  <li>Klicke auf "Create Key"</li>
                  <li>Kopiere den Key (beginnt mit <code className="px-1 py-0.5 rounded bg-black/30 font-mono">sk-ant-</code>)</li>
                  <li>Füge ihn oben ein</li>
                </ol>

                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <p className="text-purple-300 text-xs">
                    <strong>Hinweis:</strong> Dein Key wird verschlüsselt gespeichert und nur für KI-Features verwendet.
                    Anthropic berechnet ca. -15/Monat bei normaler Nutzung.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
