'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Brain } from 'lucide-react';
import Link from 'next/link';

export default function GeistError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Geist error boundary caught:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-red-500/30 p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
          <div className="relative">
            <Brain className="w-8 h-8 text-purple-400" />
            <AlertTriangle className="w-4 h-4 text-red-400 absolute -bottom-1 -right-1" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-adaptive mb-2">
          Geist-Fehler
        </h2>

        <p className="text-adaptive-muted text-sm mb-4">
          {error.message || 'Fehler beim Laden der Geist-Daten.'}
        </p>

        {error.digest && (
          <p className="text-xs text-adaptive-dim mb-4">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-purple-400 font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Erneut versuchen
          </button>

          <Link
            href="/"
            className="text-sm text-adaptive-muted hover:text-adaptive transition-colors"
          >
            Zurueck zum Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
