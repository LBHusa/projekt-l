'use client';

import { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle, X, Loader2, ArrowRight } from 'lucide-react';

interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  category?: string;
  isIncome: boolean;
}

interface CSVImportProps {
  accountId: string;
  onImport: (transactions: ParsedTransaction[]) => Promise<void>;
  onClose: () => void;
}

// Common category keywords mapping
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  housing: ['miete', 'strom', 'gas', 'wasser', 'nebenkosten', 'hausverwaltung'],
  food: ['rewe', 'edeka', 'aldi', 'lidl', 'penny', 'kaufland', 'netto', 'supermarkt', 'restaurant', 'lieferando', 'lieferheld'],
  transport: ['tankstelle', 'shell', 'aral', 'bahn', 'db ', 'mvg', 'uber', 'bolt', 'taxi', 'parken'],
  entertainment: ['netflix', 'spotify', 'amazon prime', 'disney', 'kino', 'theater', 'konzert'],
  shopping: ['amazon', 'zalando', 'ebay', 'mediamarkt', 'saturn', 'ikea', 'h&m'],
  subscriptions: ['abo', 'mitgliedschaft', 'subscription', 'premium', 'plus'],
  salary: ['gehalt', 'lohn', 'arbeitgeber', 'salary'],
  investments: ['trade republic', 'scalable', 'comdirect', 'dkb', 'depot', 'dividende', 'aktie'],
};

function categorizeTransaction(description: string): string | undefined {
  const lowerDesc = description.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(keyword => lowerDesc.includes(keyword))) {
      return category;
    }
  }

  return undefined;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if ((char === ',' || char === ';') && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result;
}

function parseAmount(amountStr: string): number {
  // Handle German number format (1.234,56) and standard format (1234.56)
  let cleaned = amountStr.replace(/[^0-9,.\-]/g, '');

  // If it has both , and ., determine which is decimal separator
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // German format: 1.234,56
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: 1,234.56
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    // Only comma: could be decimal (1,50) or thousand separator (1,000)
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      cleaned = cleaned.replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  }

  return parseFloat(cleaned) || 0;
}

function parseDate(dateStr: string): string {
  // Try different date formats
  const formats = [
    /(\d{2})\.(\d{2})\.(\d{4})/,  // DD.MM.YYYY
    /(\d{4})-(\d{2})-(\d{2})/,    // YYYY-MM-DD
    /(\d{2})\/(\d{2})\/(\d{4})/,  // DD/MM/YYYY or MM/DD/YYYY
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      if (format === formats[0]) {
        return `${match[3]}-${match[2]}-${match[1]}`;
      } else if (format === formats[1]) {
        return `${match[1]}-${match[2]}-${match[3]}`;
      } else if (format === formats[2]) {
        return `${match[3]}-${match[2]}-${match[1]}`;
      }
    }
  }

  // Fallback: try native Date parsing
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }

  return new Date().toISOString().split('T')[0];
}

export function CSVImport({ accountId, onImport, onClose }: CSVImportProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState(0);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      setError('Bitte wahle eine CSV-Datei aus');
      return;
    }

    setFile(selectedFile);
    setError(null);

    // Parse the CSV
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());

        if (lines.length < 2) {
          setError('Die CSV-Datei enthalt keine Daten');
          return;
        }

        // Try to detect header row and columns
        const header = parseCSVLine(lines[0]).map(h => h.toLowerCase());

        // Find column indices
        const dateIdx = header.findIndex(h =>
          h.includes('datum') || h.includes('date') || h.includes('buchungstag') || h.includes('valuta')
        );
        const descIdx = header.findIndex(h =>
          h.includes('beschreibung') || h.includes('verwendungszweck') || h.includes('description') ||
          h.includes('buchungstext') || h.includes('empfanger') || h.includes('auftraggeber')
        );
        const amountIdx = header.findIndex(h =>
          h.includes('betrag') || h.includes('amount') || h.includes('umsatz') || h.includes('soll') || h.includes('haben')
        );

        if (dateIdx === -1 || amountIdx === -1) {
          setError('Konnte Spalten nicht erkennen. Benotige: Datum, Betrag');
          return;
        }

        // Parse transactions
        const transactions: ParsedTransaction[] = [];

        for (let i = 1; i < lines.length; i++) {
          const cols = parseCSVLine(lines[i]);
          if (cols.length < Math.max(dateIdx, amountIdx) + 1) continue;

          const amount = parseAmount(cols[amountIdx]);
          if (amount === 0) continue;

          const description = descIdx >= 0 ? cols[descIdx] : '';
          const category = categorizeTransaction(description);

          transactions.push({
            date: parseDate(cols[dateIdx]),
            description: description || 'Keine Beschreibung',
            amount: Math.abs(amount),
            category,
            isIncome: amount > 0,
          });
        }

        if (transactions.length === 0) {
          setError('Keine gultigen Transaktionen gefunden');
          return;
        }

        setParsedTransactions(transactions);
        setStep('preview');
      } catch (err) {
        setError('Fehler beim Parsen der CSV-Datei');
        console.error(err);
      }
    };

    reader.readAsText(selectedFile);
  }, []);

  const handleImport = async () => {
    setStep('importing');
    setImportProgress(0);

    try {
      // Simulate progress for UX
      const progressInterval = setInterval(() => {
        setImportProgress(p => Math.min(p + 10, 90));
      }, 200);

      await onImport(parsedTransactions);

      clearInterval(progressInterval);
      setImportProgress(100);
      setStep('done');
    } catch (err) {
      setError('Fehler beim Import');
      setStep('preview');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-400" />
            <h2 className="font-semibold">CSV Import</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {error && (
            <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span className="text-sm text-red-400">{error}</span>
            </div>
          )}

          {step === 'upload' && (
            <div className="text-center py-8">
              <label className="block cursor-pointer">
                <div className="border-2 border-dashed border-white/20 hover:border-blue-500/50 rounded-xl p-8 transition-colors">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-white/30" />
                  <p className="text-white/70 mb-2">CSV-Datei hier ablegen oder klicken</p>
                  <p className="text-xs text-white/40">Unterstutzt: Deutsche Bankformate (DKB, Sparkasse, etc.)</p>
                </div>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>

              <div className="mt-6 text-left bg-white/5 rounded-lg p-4">
                <h3 className="text-sm font-medium mb-2">Tipps fur den Import:</h3>
                <ul className="text-xs text-white/50 space-y-1">
                  <li>Exportiere Transaktionen als CSV aus deiner Banking-App</li>
                  <li>Die Datei sollte Spalten fur Datum, Beschreibung und Betrag enthalten</li>
                  <li>Kategorien werden automatisch erkannt</li>
                  <li>Duplikate werden automatisch ubersprungen</li>
                </ul>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-medium">{file?.name}</p>
                  <p className="text-sm text-white/50">{parsedTransactions.length} Transaktionen gefunden</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-green-400">
                    + {formatCurrency(parsedTransactions.filter(t => t.isIncome).reduce((s, t) => s + t.amount, 0))}
                  </p>
                  <p className="text-sm text-red-400">
                    - {formatCurrency(parsedTransactions.filter(t => !t.isIncome).reduce((s, t) => s + t.amount, 0))}
                  </p>
                </div>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {parsedTransactions.slice(0, 20).map((tx, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-white/5 rounded-lg p-2">
                    <div className={`w-2 h-2 rounded-full ${tx.isIncome ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{tx.description}</p>
                      <div className="flex items-center gap-2 text-xs text-white/40">
                        <span>{tx.date}</span>
                        {tx.category && (
                          <>
                            <ArrowRight className="w-3 h-3" />
                            <span className="text-blue-400">{tx.category}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className={`text-sm font-medium ${tx.isIncome ? 'text-green-400' : 'text-red-400'}`}>
                      {tx.isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>
                  </div>
                ))}
                {parsedTransactions.length > 20 && (
                  <p className="text-center text-sm text-white/40 py-2">
                    ... und {parsedTransactions.length - 20} weitere
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 'importing' && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 mx-auto mb-4 text-blue-400 animate-spin" />
              <p className="text-white/70 mb-4">Importiere Transaktionen...</p>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
              <p className="text-sm text-white/40 mt-2">{importProgress}%</p>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-400" />
              <p className="text-lg font-medium text-green-400 mb-2">Import erfolgreich!</p>
              <p className="text-white/50">
                {parsedTransactions.length} Transaktionen wurden importiert
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-white/10">
          {step === 'preview' && (
            <>
              <button
                onClick={() => { setStep('upload'); setFile(null); setParsedTransactions([]); }}
                className="px-4 py-2 text-sm text-white/60 hover:text-white transition-colors"
              >
                Andere Datei
              </button>
              <button
                onClick={handleImport}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm font-medium transition-colors"
              >
                {parsedTransactions.length} Transaktionen importieren
              </button>
            </>
          )}
          {step === 'done' && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-sm font-medium transition-colors"
            >
              Fertig
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
