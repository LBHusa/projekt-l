'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft,
  Upload,
  FileText,
  Users,
  Check,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  parseGoogleCSV,
  parseVCard,
  parseGenericCSV,
  detectImportFormat,
  detectCSVHeaders,
  importContactToFormData,
  type ImportContact,
  type ImportResult,
  type ColumnMapping,
} from '@/lib/import/parsers';
import { bulkImportContacts } from '@/lib/data/contacts';
import { RELATIONSHIP_TYPE_META, type RelationshipType } from '@/lib/types/contacts';

type ImportFormat = 'google' | 'vcard' | 'csv';
type ImportStep = 'upload' | 'preview' | 'mapping' | 'importing' | 'done';

export default function ContactImportPage() {
  const [step, setStep] = useState<ImportStep>('upload');
  const [format, setFormat] = useState<ImportFormat>('google');
  const [fileName, setFileName] = useState<string>('');
  const [fileContent, setFileContent] = useState<string>('');

  // Preview state
  const [contacts, setContacts] = useState<ImportContact[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);

  // Generic CSV mapping state
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    firstName: '',
  });

  // Import state
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    errors: { name: string; error: string }[];
  } | null>(null);

  // Handle file selection
  const handleFileSelect = useCallback(
    async (file: File) => {
      setFileName(file.name);

      const content = await file.text();
      setFileContent(content);

      // Auto-detect format
      const detected = detectImportFormat(content, file.name);
      if (detected !== 'unknown') {
        setFormat(detected);
      }

      // If generic CSV, detect headers for mapping
      if (detected === 'csv' || format === 'csv') {
        const headers = detectCSVHeaders(content);
        setCsvHeaders(headers);

        // Try to auto-map common column names
        const autoMapping: ColumnMapping = { firstName: '' };
        const lowerHeaders = headers.map((h) => h.toLowerCase());

        const firstNameIdx = lowerHeaders.findIndex(
          (h) => h.includes('vorname') || h.includes('first') || h === 'name'
        );
        if (firstNameIdx >= 0) autoMapping.firstName = headers[firstNameIdx];

        const lastNameIdx = lowerHeaders.findIndex(
          (h) => h.includes('nachname') || h.includes('last') || h.includes('family')
        );
        if (lastNameIdx >= 0) autoMapping.lastName = headers[lastNameIdx];

        const emailIdx = lowerHeaders.findIndex((h) => h.includes('email') || h.includes('e-mail'));
        if (emailIdx >= 0) autoMapping.email = headers[emailIdx];

        const phoneIdx = lowerHeaders.findIndex(
          (h) => h.includes('phone') || h.includes('telefon') || h.includes('tel')
        );
        if (phoneIdx >= 0) autoMapping.phone = headers[phoneIdx];

        const birthdayIdx = lowerHeaders.findIndex(
          (h) => h.includes('birthday') || h.includes('geburtstag') || h.includes('birth')
        );
        if (birthdayIdx >= 0) autoMapping.birthday = headers[birthdayIdx];

        setColumnMapping(autoMapping);

        if (detected === 'csv') {
          setStep('mapping');
          return;
        }
      }

      // Parse and go to preview
      parseFile(content, detected !== 'unknown' ? detected : format);
    },
    [format]
  );

  // Parse file based on format
  const parseFile = (content: string, fmt: ImportFormat) => {
    let result: ImportResult;

    switch (fmt) {
      case 'google':
        result = parseGoogleCSV(content);
        break;
      case 'vcard':
        result = parseVCard(content);
        break;
      case 'csv':
        if (!columnMapping.firstName) {
          setParseErrors(['Bitte wähle mindestens die Vorname-Spalte aus']);
          return;
        }
        result = parseGenericCSV(content, columnMapping);
        break;
      default:
        result = { contacts: [], errors: ['Unbekanntes Format'], warnings: [] };
    }

    setContacts(result.contacts);
    setParseErrors(result.errors);
    setParseWarnings(result.warnings);
    setStep('preview');
  };

  // Toggle contact selection
  const toggleContact = (index: number) => {
    setContacts((prev) =>
      prev.map((c, i) => (i === index ? { ...c, selected: !c.selected } : c))
    );
  };

  // Toggle all contacts
  const toggleAll = () => {
    const allSelected = contacts.every((c) => c.selected);
    setContacts((prev) => prev.map((c) => ({ ...c, selected: !allSelected })));
  };

  // Update contact relationship type
  const updateContactType = (index: number, type: RelationshipType) => {
    setContacts((prev) =>
      prev.map((c, i) =>
        i === index
          ? {
              ...c,
              suggestedType: type,
              suggestedCategory: RELATIONSHIP_TYPE_META[type].category,
            }
          : c
      )
    );
  };

  // Handle import
  const handleImport = async () => {
    const selectedContacts = contacts.filter((c) => c.selected);
    if (selectedContacts.length === 0) return;

    setStep('importing');
    setImportProgress(0);

    // Convert to form data
    const formDataContacts = selectedContacts.map(importContactToFormData);

    // Import with progress simulation
    const progressInterval = setInterval(() => {
      setImportProgress((prev) => Math.min(prev + 10, 90));
    }, 200);

    try {
      const result = await bulkImportContacts(formDataContacts, { skipDuplicates: true });
      clearInterval(progressInterval);
      setImportProgress(100);
      setImportResult(result);
      setStep('done');
    } catch (error) {
      clearInterval(progressInterval);
      setImportResult({
        imported: 0,
        skipped: 0,
        errors: [{ name: 'Import', error: 'Unbekannter Fehler beim Import' }],
      });
      setStep('done');
    }
  };

  // File drop handler
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const selectedCount = contacts.filter((c) => c.selected).length;

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <header className="flex items-center gap-4 mb-6">
        <Link
          href="/contacts"
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-adaptive-muted" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-adaptive">Kontakte importieren</h1>
          <p className="text-sm text-adaptive-dim">
            CSV, vCard oder Google Contacts importieren
          </p>
        </div>
      </header>

      {/* Step: Upload */}
      {step === 'upload' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Format Selection */}
          <div className="flex gap-2">
            {[
              { key: 'google', label: 'Google CSV', icon: '📧' },
              { key: 'vcard', label: 'Apple vCard', icon: '🍎' },
              { key: 'csv', label: 'CSV', icon: '📄' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFormat(f.key as ImportFormat)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  format === f.key
                    ? 'bg-purple-500 text-white'
                    : 'bg-white/5 text-adaptive-muted hover:bg-white/10'
                }`}
              >
                <span>{f.icon}</span>
                {f.label}
              </button>
            ))}
          </div>

          {/* Drop Zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-white/20 rounded-xl p-12 text-center hover:border-purple-500/50 transition-colors cursor-pointer"
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept=".csv,.vcf,.txt"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />
            <Upload className="w-12 h-12 text-adaptive-dim mx-auto mb-4" />
            <p className="text-adaptive-muted mb-2">
              Datei hierher ziehen oder klicken zum Auswählen
            </p>
            <p className="text-sm text-adaptive-dim">
              {format === 'google' && 'Google Contacts CSV Export'}
              {format === 'vcard' && 'Apple vCard (.vcf)'}
              {format === 'csv' && 'CSV mit beliebigen Spalten'}
            </p>
          </div>

          {/* Format Help */}
          <div className="bg-white/5 rounded-xl p-4">
            <h3 className="font-medium text-adaptive mb-2">So exportierst du deine Kontakte:</h3>
            <div className="text-sm text-adaptive-muted space-y-2">
              {format === 'google' && (
                <>
                  <p>1. Gehe zu contacts.google.com</p>
                  <p>2. Klicke links auf "Exportieren"</p>
                  <p>3. Wähle "Google CSV" und lade die Datei herunter</p>
                </>
              )}
              {format === 'vcard' && (
                <>
                  <p>1. Öffne die Kontakte-App auf deinem Mac/iPhone</p>
                  <p>2. Wähle alle Kontakte aus (Cmd+A)</p>
                  <p>3. Datei → Exportieren → vCard exportieren</p>
                </>
              )}
              {format === 'csv' && (
                <>
                  <p>1. Erstelle eine CSV-Datei mit Spalten wie Vorname, Nachname, Email, etc.</p>
                  <p>2. Die erste Zeile muss die Spaltennamen enthalten</p>
                  <p>3. Nach dem Upload kannst du die Spalten zuordnen</p>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Step: Column Mapping (for generic CSV) */}
      {step === 'mapping' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-white/5 rounded-xl p-5">
            <h3 className="font-medium text-adaptive mb-4">Spalten zuordnen</h3>
            <p className="text-sm text-adaptive-muted mb-4">
              Ordne die Spalten deiner CSV-Datei den Kontaktfeldern zu.
            </p>

            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'firstName', label: 'Vorname *', required: true },
                { key: 'lastName', label: 'Nachname' },
                { key: 'email', label: 'E-Mail' },
                { key: 'phone', label: 'Telefon' },
                { key: 'birthday', label: 'Geburtstag' },
                { key: 'address', label: 'Adresse' },
              ].map((field) => (
                <div key={field.key}>
                  <label className="text-sm text-adaptive-muted block mb-1">{field.label}</label>
                  <select
                    value={columnMapping[field.key as keyof ColumnMapping] || ''}
                    onChange={(e) =>
                      setColumnMapping((prev) => ({
                        ...prev,
                        [field.key]: e.target.value || undefined,
                      }))
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-adaptive text-sm focus:outline-none focus:border-purple-500"
                  >
                    <option value="">-- Nicht zuordnen --</option>
                    {csvHeaders.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep('upload')}
                className="px-4 py-2 rounded-lg bg-white/5 text-adaptive-muted hover:bg-white/10 transition-colors"
              >
                Zurück
              </button>
              <button
                onClick={() => parseFile(fileContent, 'csv')}
                disabled={!columnMapping.firstName}
                className="px-4 py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50 transition-colors"
              >
                Vorschau anzeigen
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Step: Preview */}
      {step === 'preview' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* File info */}
          <div className="flex items-center justify-between bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-purple-400" />
              <span className="text-adaptive">{fileName}</span>
              <span className="text-adaptive-dim text-sm">
                ({contacts.length} Kontakte gefunden)
              </span>
            </div>
            <button
              onClick={() => {
                setStep('upload');
                setContacts([]);
                setFileContent('');
              }}
              className="text-sm text-adaptive-muted hover:text-adaptive"
            >
              Andere Datei
            </button>
          </div>

          {/* Errors & Warnings */}
          {parseErrors.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-red-400 mb-2">
                <AlertCircle className="w-4 h-4" />
                <span className="font-medium">Fehler</span>
              </div>
              <ul className="text-sm text-red-400/80 list-disc list-inside">
                {parseErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {parseWarnings.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-amber-400 mb-2">
                <AlertCircle className="w-4 h-4" />
                <span className="font-medium">Hinweise</span>
              </div>
              <ul className="text-sm text-amber-400/80 list-disc list-inside max-h-24 overflow-y-auto">
                {parseWarnings.slice(0, 10).map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
                {parseWarnings.length > 10 && (
                  <li>... und {parseWarnings.length - 10} weitere</li>
                )}
              </ul>
            </div>
          )}

          {/* Contact list */}
          {contacts.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <button
                  onClick={toggleAll}
                  className="flex items-center gap-2 text-sm text-adaptive-muted hover:text-adaptive"
                >
                  <div
                    className={`w-4 h-4 rounded border ${
                      contacts.every((c) => c.selected)
                        ? 'bg-purple-500 border-purple-500'
                        : 'border-white/30'
                    } flex items-center justify-center`}
                  >
                    {contacts.every((c) => c.selected) && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                  Alle auswählen
                </button>
                <span className="text-sm text-adaptive-dim">
                  {selectedCount} von {contacts.length} ausgewählt
                </span>
              </div>

              <div className="bg-white/5 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-white/5 sticky top-0">
                    <tr className="text-left text-sm text-adaptive-muted">
                      <th className="p-3 w-10"></th>
                      <th className="p-3">Name</th>
                      <th className="p-3">E-Mail / Telefon</th>
                      <th className="p-3">Geburtstag</th>
                      <th className="p-3">Typ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map((contact, index) => (
                      <tr
                        key={index}
                        className={`border-t border-white/5 ${
                          !contact.selected ? 'opacity-50' : ''
                        }`}
                      >
                        <td className="p-3">
                          <button
                            onClick={() => toggleContact(index)}
                            className={`w-5 h-5 rounded border ${
                              contact.selected
                                ? 'bg-purple-500 border-purple-500'
                                : 'border-white/30'
                            } flex items-center justify-center`}
                          >
                            {contact.selected && <Check className="w-3 h-3 text-white" />}
                          </button>
                        </td>
                        <td className="p-3">
                          <div className="text-adaptive">
                            {contact.firstName} {contact.lastName}
                          </div>
                          {contact.nickname && (
                            <div className="text-sm text-adaptive-dim">"{contact.nickname}"</div>
                          )}
                        </td>
                        <td className="p-3 text-sm text-adaptive-muted">
                          {contact.email || contact.phone || '-'}
                        </td>
                        <td className="p-3 text-sm text-adaptive-muted">
                          {contact.birthday || '-'}
                        </td>
                        <td className="p-3">
                          <select
                            value={contact.suggestedType}
                            onChange={(e) =>
                              updateContactType(index, e.target.value as RelationshipType)
                            }
                            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-adaptive focus:outline-none focus:border-purple-500"
                          >
                            {Object.entries(RELATIONSHIP_TYPE_META).map(([key, meta]) => (
                              <option key={key} value={key}>
                                {meta.icon} {meta.labelDe}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 rounded-lg bg-white/5 text-adaptive-muted hover:bg-white/10 transition-colors"
                >
                  Zurück
                </button>
                <button
                  onClick={handleImport}
                  disabled={selectedCount === 0}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg bg-purple-500 text-white font-medium hover:bg-purple-600 disabled:opacity-50 transition-colors"
                >
                  <Users className="w-4 h-4" />
                  {selectedCount} Kontakte importieren
                </button>
              </div>
            </>
          )}
        </motion.div>
      )}

      {/* Step: Importing */}
      {step === 'importing' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20"
        >
          <Loader2 className="w-12 h-12 text-purple-500 animate-spin mb-4" />
          <p className="text-adaptive mb-4">Importiere Kontakte...</p>
          <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${importProgress}%` }}
            />
          </div>
          <p className="text-sm text-adaptive-dim mt-2">{importProgress}%</p>
        </motion.div>
      )}

      {/* Step: Done */}
      {step === 'done' && importResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-white/5 rounded-xl p-8 text-center">
            {importResult.imported > 0 ? (
              <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
            ) : (
              <AlertCircle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
            )}

            <h2 className="text-2xl font-bold text-adaptive mb-2">Import abgeschlossen</h2>

            <div className="flex items-center justify-center gap-8 my-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400">{importResult.imported}</div>
                <div className="text-sm text-adaptive-muted">Importiert</div>
              </div>
              {importResult.skipped > 0 && (
                <div className="text-center">
                  <div className="text-3xl font-bold text-amber-400">{importResult.skipped}</div>
                  <div className="text-sm text-adaptive-muted">Übersprungen (Duplikate)</div>
                </div>
              )}
              {importResult.errors.length > 0 && (
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-400">
                    {importResult.errors.length}
                  </div>
                  <div className="text-sm text-adaptive-muted">Fehler</div>
                </div>
              )}
            </div>

            {importResult.errors.length > 0 && (
              <div className="text-left bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                <p className="text-sm text-red-400 font-medium mb-2">Fehler beim Import:</p>
                <ul className="text-sm text-red-400/80 list-disc list-inside max-h-32 overflow-y-auto">
                  {importResult.errors.map((err, i) => (
                    <li key={i}>
                      {err.name}: {err.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-center gap-4">
              <Link
                href="/contacts"
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-purple-500 text-white font-medium hover:bg-purple-600 transition-colors"
              >
                <Users className="w-4 h-4" />
                Zu meinen Kontakten
              </Link>
              <button
                onClick={() => {
                  setStep('upload');
                  setContacts([]);
                  setFileContent('');
                  setImportResult(null);
                }}
                className="px-4 py-3 rounded-lg bg-white/5 text-adaptive-muted hover:bg-white/10 transition-colors"
              >
                Weitere importieren
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
