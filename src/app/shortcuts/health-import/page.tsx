'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft,
  Apple,
  Key,
  Play,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Smartphone,
  Activity,
  Moon,
  Footprints,
  Dumbbell,
  Clock,
  Loader2,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react';

interface StepStatus {
  [key: number]: boolean;
}

export default function HealthImportShortcutPage() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoadingKey, setIsLoadingKey] = useState(true);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [expandedStep, setExpandedStep] = useState<number | null>(1);
  const [completedSteps, setCompletedSteps] = useState<StepStatus>({});
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string | null>(null);

  useEffect(() => {
    loadApiKey();
  }, []);

  async function loadApiKey() {
    try {
      const response = await fetch('/api/integrations/health-import/status');
      const data = await response.json();
      if (data.success && data.status?.hasApiKey) {
        // Nur Prefix laden - vollständiger Key nur bei Neugenerierung
        setApiKey(data.status.apiKeyPrefix ? `${data.status.apiKeyPrefix}...` : 'key-exists');
      }
    } catch (error) {
      console.error('Error loading API key:', error);
    } finally {
      setIsLoadingKey(false);
    }
  }

  async function generateApiKey() {
    const confirmed = apiKey
      ? window.confirm('Möchtest du wirklich einen neuen API-Schlüssel generieren? Der alte wird ungültig.')
      : true;
    if (!confirmed) return;

    setIsGeneratingKey(true);
    try {
      const response = await fetch('/api/integrations/health-import/generate-key', { method: 'POST' });
      const data = await response.json();
      if (data.success && data.api_key) {
        setApiKey(data.api_key);
        markStepComplete(1);
      }
    } catch (error) {
      console.error('Error generating API key:', error);
    } finally {
      setIsGeneratingKey(false);
    }
  }

  async function copyApiKey() {
    if (!apiKey) return;
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } catch (error) {
      console.error('Error copying:', error);
    }
  }

  function markStepComplete(step: number) {
    setCompletedSteps(prev => ({ ...prev, [step]: true }));
    // Öffne nächsten Schritt
    if (step < 6) {
      setExpandedStep(step + 1);
    }
  }

  function toggleStep(step: number) {
    setExpandedStep(expandedStep === step ? null : step);
  }

  async function testWebhook() {
    setTestStatus('loading');
    setTestMessage(null);

    try {
      const response = await fetch('/api/integrations/health-import/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          sleep: [{
            startDate: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
            endDate: new Date().toISOString(),
            duration: 480,
            quality: 'deep',
            externalId: 'test-' + Date.now(),
          }],
          steps: [{
            date: new Date().toISOString().split('T')[0],
            steps: 5000,
            distance: 3.5,
            externalId: 'test-steps-' + Date.now(),
          }],
        }),
      });

      const data = await response.json();
      if (data.success) {
        setTestStatus('success');
        setTestMessage('Testdaten erfolgreich importiert!');
        markStepComplete(6);
      } else {
        setTestStatus('error');
        setTestMessage(data.error || 'Fehler beim Test');
      }
    } catch (error) {
      setTestStatus('error');
      setTestMessage('Netzwerkfehler beim Test');
    }
  }

  const steps = [
    {
      number: 1,
      title: 'API-Schlüssel generieren',
      icon: Key,
      color: 'purple',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-adaptive-dim">
            Du benötigst einen API-Schlüssel, um den Shortcut mit deinem Account zu verbinden.
            Dieser Schlüssel ist nur für dich und sollte geheim bleiben.
          </p>

          {isLoadingKey ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
            </div>
          ) : apiKey && apiKey !== 'key-exists' && !apiKey.endsWith('...') ? (
            <div className="space-y-3">
              <div className="bg-black/30 rounded-lg p-3 border border-purple-500/30">
                <code className="text-sm font-mono text-purple-300 break-all">{apiKey}</code>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={copyApiKey}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-purple-500 text-white font-medium hover:bg-purple-600 transition-colors"
                >
                  {copiedKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedKey ? 'Kopiert!' : 'Schlüssel kopieren'}
                </button>
                <button
                  onClick={generateApiKey}
                  disabled={isGeneratingKey}
                  className="px-4 py-2.5 rounded-lg bg-white/10 text-adaptive font-medium hover:bg-white/15 transition-colors"
                >
                  <RefreshCw className={"w-4 h-4 " + (isGeneratingKey ? 'animate-spin' : '')} />
                </button>
              </div>
              <p className="text-xs text-yellow-400/80 text-center">
                ⚠️ Speichere diesen Schlüssel jetzt! Er wird nur einmal vollständig angezeigt.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {apiKey && (
                <p className="text-sm text-green-400">
                  ✓ Ein API-Schlüssel existiert bereits.
                </p>
              )}
              <button
                onClick={generateApiKey}
                disabled={isGeneratingKey}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-purple-500 text-white font-medium hover:bg-purple-600 disabled:opacity-50 transition-colors"
              >
                {isGeneratingKey ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generiere...</>
                ) : (
                  <><Key className="w-4 h-4" /> {apiKey ? 'Neuen Schlüssel generieren' : 'API-Schlüssel generieren'}</>
                )}
              </button>
            </div>
          )}
        </div>
      ),
    },
    {
      number: 2,
      title: 'Shortcuts App öffnen',
      icon: Smartphone,
      color: 'blue',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-adaptive-dim">
            Öffne die <strong>Shortcuts App</strong> auf deinem iPhone. Diese ist standardmäßig
            auf allen iPhones mit iOS 13+ vorinstalliert.
          </p>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 via-orange-500 to-pink-500 flex items-center justify-center">
                <Apple className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-medium text-adaptive">Shortcuts</p>
                <p className="text-xs text-adaptive-dim">Apple Kurzbefehle</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => markStepComplete(2)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
          >
            <Check className="w-4 h-4" /> App geöffnet
          </button>
        </div>
      ),
    },
    {
      number: 3,
      title: 'Neuen Shortcut erstellen',
      icon: Play,
      color: 'green',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-adaptive-dim">
            Erstelle einen neuen Shortcut mit folgenden Aktionen:
          </p>

          <div className="space-y-3">
            {/* Aktion 1: Schlaf */}
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Moon className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-medium text-adaptive">1. Schlafanalyse abfragen</span>
              </div>
              <p className="text-xs text-adaptive-dim ml-6">
                Aktion: "Gesundheitsdaten abfragen" → Typ: Schlafanalyse → Zeitraum: Letzte 24h
              </p>
            </div>

            {/* Aktion 2: Schritte */}
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Footprints className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium text-adaptive">2. Schritte abfragen</span>
              </div>
              <p className="text-xs text-adaptive-dim ml-6">
                Aktion: "Gesundheitsdaten abfragen" → Typ: Schritte → Zeitraum: Heute
              </p>
            </div>

            {/* Aktion 3: Workouts */}
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Dumbbell className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-medium text-adaptive">3. Trainings abfragen</span>
              </div>
              <p className="text-xs text-adaptive-dim ml-6">
                Aktion: "Gesundheitsdaten abfragen" → Typ: Trainings → Zeitraum: Letzte 24h
              </p>
            </div>
          </div>

          <button
            onClick={() => markStepComplete(3)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-green-500 text-white font-medium hover:bg-green-600 transition-colors"
          >
            <Check className="w-4 h-4" /> Aktionen hinzugefügt
          </button>
        </div>
      ),
    },
    {
      number: 4,
      title: 'JSON-Daten formatieren',
      icon: Activity,
      color: 'orange',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-adaptive-dim">
            Füge eine "Wörterbuch" Aktion hinzu und formatiere die Daten:
          </p>

          <div className="bg-black/30 rounded-lg p-3 border border-orange-500/30 overflow-x-auto">
            <pre className="text-xs font-mono text-orange-300">{`{
  "sleep": [Schlaf-Daten Variable],
  "steps": [Schritte-Daten Variable],
  "workouts": [Trainings Variable]
}`}</pre>
          </div>

          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
            <p className="text-xs text-orange-200">
              <strong>Tipp:</strong> Nutze "Text" Aktionen um die Daten in das richtige JSON-Format
              zu bringen. Apple Health gibt Arrays zurück.
            </p>
          </div>

          <button
            onClick={() => markStepComplete(4)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors"
          >
            <Check className="w-4 h-4" /> JSON formatiert
          </button>
        </div>
      ),
    },
    {
      number: 5,
      title: 'Webhook einrichten',
      icon: ExternalLink,
      color: 'cyan',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-adaptive-dim">
            Füge eine "URL abrufen" Aktion hinzu mit diesen Einstellungen:
          </p>

          <div className="space-y-3">
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <p className="text-xs text-adaptive-dim mb-1">URL:</p>
              <code className="text-sm font-mono text-cyan-300 break-all">
                https://projekt-l.husatech-cloud.de/api/integrations/health-import/webhook
              </code>
            </div>

            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <p className="text-xs text-adaptive-dim mb-1">Methode:</p>
              <code className="text-sm font-mono text-adaptive">POST</code>
            </div>

            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <p className="text-xs text-adaptive-dim mb-1">Header hinzufügen:</p>
              <div className="space-y-1">
                <code className="text-xs font-mono text-adaptive block">
                  Authorization: Bearer [DEIN-API-KEY]
                </code>
                <code className="text-xs font-mono text-adaptive block">
                  Content-Type: application/json
                </code>
              </div>
            </div>

            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <p className="text-xs text-adaptive-dim mb-1">Body:</p>
              <code className="text-sm font-mono text-adaptive">[Wörterbuch von Schritt 4]</code>
            </div>
          </div>

          <button
            onClick={() => markStepComplete(5)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-500 text-white font-medium hover:bg-cyan-600 transition-colors"
          >
            <Check className="w-4 h-4" /> Webhook konfiguriert
          </button>
        </div>
      ),
    },
    {
      number: 6,
      title: 'Testen',
      icon: CheckCircle2,
      color: 'emerald',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-adaptive-dim">
            Teste ob alles funktioniert. Du kannst den Shortcut auf dem iPhone ausführen oder
            hier einen Testaufruf machen:
          </p>

          {apiKey && !apiKey.endsWith('...') && apiKey !== 'key-exists' ? (
            <button
              onClick={testWebhook}
              disabled={testStatus === 'loading'}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors"
            >
              {testStatus === 'loading' ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Teste...</>
              ) : (
                <><Play className="w-4 h-4" /> Test-Daten senden</>
              )}
            </button>
          ) : (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <p className="text-sm text-yellow-200">
                ⚠️ Generiere zuerst einen API-Schlüssel in Schritt 1, um hier testen zu können.
              </p>
            </div>
          )}

          {testMessage && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${
              testStatus === 'success' 
                ? 'bg-green-500/10 border border-green-500/30' 
                : 'bg-red-500/10 border border-red-500/30'
            }`}>
              {testStatus === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              )}
              <p className={`text-sm ${testStatus === 'success' ? 'text-green-300' : 'text-red-300'}`}>
                {testMessage}
              </p>
            </div>
          )}

          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
            <p className="text-xs text-emerald-200">
              <strong>Optional:</strong> Richte eine Automation ein, die den Shortcut täglich
              automatisch ausführt (z.B. jeden Morgen um 8 Uhr).
            </p>
          </div>
        </div>
      ),
    },
  ];

  const allStepsComplete = Object.keys(completedSteps).length >= 5;

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <header className="flex items-center gap-4 mb-6">
        <Link
          href="/settings/integrations"
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-adaptive-muted" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-adaptive">Apple Health Shortcut</h1>
          <p className="text-sm text-adaptive-dim">
            Schritt-für-Schritt Anleitung
          </p>
        </div>
      </header>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-adaptive-dim">Fortschritt</span>
          <span className="text-sm font-medium text-adaptive">
            {Object.keys(completedSteps).length} / 6 Schritte
          </span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-emerald-500"
            initial={{ width: 0 }}
            animate={{ width: `${(Object.keys(completedSteps).length / 6) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Success Banner */}
      <AnimatePresence>
        {allStepsComplete && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 bg-gradient-to-r from-emerald-500/20 to-green-500/20 border border-emerald-500/30 rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="font-medium text-emerald-300">Einrichtung abgeschlossen!</p>
                <p className="text-sm text-emerald-200/70">
                  Dein Health-Shortcut ist bereit. Führe ihn auf deinem iPhone aus.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Steps Accordion */}
      <div className="space-y-3">
        {steps.map((step) => {
          const isExpanded = expandedStep === step.number;
          const isComplete = completedSteps[step.number];

          return (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: step.number * 0.05 }}
              className={`bg-[var(--background-secondary)] border rounded-xl overflow-hidden transition-colors ${
                isComplete
                  ? 'border-green-500/30'
                  : isExpanded
                  ? `border-${step.color}-500/50`
                  : 'border-[var(--orb-border)]'
              }`}
            >
              {/* Step Header */}
              <button
                onClick={() => toggleStep(step.number)}
                className="w-full flex items-center gap-4 p-4"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    isComplete
                      ? 'bg-green-500/20'
                      : `bg-${step.color}-500/20`
                  }`}
                >
                  {isComplete ? (
                    <Check className="w-5 h-5 text-green-400" />
                  ) : (
                    <step.icon className={`w-5 h-5 text-${step.color}-400`} />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <h3 className={`font-medium ${isComplete ? 'text-green-300' : 'text-adaptive'}`}>
                    {step.number}. {step.title}
                  </h3>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-adaptive-muted" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-adaptive-muted" />
                )}
              </button>

              {/* Step Content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-0">
                      {step.content}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Help Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 text-center"
      >
        <p className="text-sm text-adaptive-dim">
          Probleme? Schau in den{' '}
          <Link href="/settings/integrations" className="text-purple-400 hover:underline">
            Integrationen
          </Link>
          {' '}nach oder kontaktiere den Support.
        </p>
      </motion.div>
    </div>
  );
}
