'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Key, Eye, EyeOff, Copy, RefreshCw, Check, Loader2 } from 'lucide-react';

interface ApiKeyDisplayProps {
  userId?: string;
}

export default function ApiKeyDisplay({ userId }: ApiKeyDisplayProps) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isNewKey, setIsNewKey] = useState(false);

  useEffect(() => {
    loadApiKey();
  }, []);

  async function loadApiKey() {
    try {
      const response = await fetch('/api/integrations/health-import/status');
      const data = await response.json();

      if (data.success && data.status?.hasApiKey) {
        // API gibt nur Prefix zurück (Sicherheit) - zeige maskiert an
        setApiKey(data.status.apiKeyPrefix ? `${data.status.apiKeyPrefix}...` : null);
        setIsNewKey(false);
      } else {
        setApiKey(null);
      }
    } catch (error) {
      console.error('Error loading API key:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function generateNewApiKey() {
    const confirmed = window.confirm(
      'Möchtest du wirklich einen neuen API-Schlüssel generieren? Der alte Schlüssel wird ungültig und dein Shortcut muss aktualisiert werden.'
    );

    if (!confirmed) return;

    setIsGenerating(true);
    setMessage(null);

    try {
      const response = await fetch('/api/integrations/health-import/generate-key', {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success && data.api_key) {
        setApiKey(data.api_key); // Vollständiger Key nur bei Generierung
        setIsNewKey(true); // Markiere als neuer Key (sichtbar + kopierbar)
        setIsVisible(true); // Zeige Key direkt an
        setMessage('Neuer API-Schlüssel generiert! Speichere ihn jetzt - er wird nur einmal angezeigt.');
      } else {
        setMessage(data.error || 'Fehler beim Generieren');
      }
    } catch (error) {
      console.error('Error generating API key:', error);
      setMessage('Fehler beim Generieren');
    } finally {
      setIsGenerating(false);
    }
  }

  async function copyToClipboard() {
    if (!apiKey) return;

    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  }

  const maskApiKey = (key: string) => {
    if (key.length < 12) return key;
    return `${key.substring(0, 8)}${'*'.repeat(key.length - 12)}${key.substring(key.length - 4)}`;
  };

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl p-5"
      >
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl p-5"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
          <Key className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h3 className="font-semibold text-adaptive">API-Schlüssel</h3>
          <p className="text-sm text-adaptive-dim">
            Für den Apple Shortcuts Webhook
          </p>
        </div>
      </div>

      {!apiKey ? (
        /* No API Key Yet */
        <div className="space-y-3">
          <p className="text-sm text-adaptive-dim">
            Noch kein API-Schlüssel vorhanden. Generiere einen, um die Integration zu aktivieren.
          </p>
          <button
            onClick={generateNewApiKey}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-purple-500 text-white font-medium hover:bg-purple-600 disabled:opacity-50 transition-colors"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generiere...
              </>
            ) : (
              <>
                <Key className="w-4 h-4" />
                API-Schlüssel generieren
              </>
            )}
          </button>
        </div>
      ) : (
        /* API Key Exists */
        <div className="space-y-3">
          {/* API Key Display */}
          <div className="bg-white/5 rounded-lg p-3 border border-white/10">
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm font-mono text-adaptive break-all">
                {isVisible ? apiKey : maskApiKey(apiKey)}
              </code>
              {/* Nur Show/Hide wenn es ein neuer Key ist */}
              {isNewKey && (
                <button
                  onClick={() => setIsVisible(!isVisible)}
                  className="p-1.5 rounded hover:bg-white/10 transition-colors"
                >
                  {isVisible ? (
                    <EyeOff className="w-4 h-4 text-adaptive-muted" />
                  ) : (
                    <Eye className="w-4 h-4 text-adaptive-muted" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {/* Kopieren nur wenn neuer Key */}
            {isNewKey && (
              <button
                onClick={copyToClipboard}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 text-adaptive font-medium hover:bg-white/10 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-400" />
                    Kopiert!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Kopieren
                  </>
                )}
              </button>
            )}
            <button
              onClick={generateNewApiKey}
              disabled={isGenerating}
              className={isNewKey
                ? "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 text-adaptive font-medium hover:bg-white/10 disabled:opacity-50 transition-colors"
                : "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 text-adaptive font-medium hover:bg-white/10 disabled:opacity-50 transition-colors"
              }
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generiere...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Neu generieren
                </>
              )}
            </button>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`text-sm text-center ${
                message.includes('Fehler') ? 'text-red-400' : 'text-green-400'
              }`}
            >
              {message}
            </div>
          )}

          {/* Hinweis wenn existierender Key */}
          {!isNewKey && (
            <p className="text-xs text-adaptive-dim text-center">
              Ein API-Schlüssel existiert bereits. Generiere einen neuen, wenn du den alten verloren hast.
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}
